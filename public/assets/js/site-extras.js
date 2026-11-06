(() => {
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
  const formatDate = value => value ? new Date(value).toLocaleString() : "Not announced";
  const dateOnly = value => value ? new Date(value).toLocaleDateString(undefined, {
    day: "numeric", month: "short", year: "numeric"
  }) : "";

  const style = document.createElement("style");
  style.textContent = `
    .back-to-top{position:fixed;left:20px;bottom:20px;z-index:999;display:inline-flex;align-items:center;gap:8px;padding:11px 15px;border:1px solid #ffffff30;border-radius:28px;background:#123b32;color:#fff;font:inherit;font-size:.88rem;font-weight:700;line-height:1.2;box-shadow:0 6px 24px #102f2830;cursor:pointer;transition:background .18s ease,transform .18s ease}
    .back-to-top[hidden]{display:none}
    .back-to-top:hover{background:#1c5948;transform:translateY(-2px)}
    .back-to-top:focus-visible{outline:3px solid #d9bd7e;outline-offset:3px}
    .back-to-top span{font-size:1.15rem}
    @media(max-width:480px){.back-to-top{left:10px;bottom:10px}}
    #publicPages.news-grid{grid-template-columns:repeat(2,minmax(0,1fr));align-items:stretch}
    .news-feature{grid-column:1/-1;position:relative;overflow:hidden;padding:clamp(22px,4vw,38px);border:0;background:linear-gradient(120deg,#10392f,#1d6048);color:#fff}
    .news-feature:after{content:"";position:absolute;width:250px;height:250px;border:1px solid #ffffff24;border-radius:50%;right:-65px;top:-115px;box-shadow:0 0 0 28px #ffffff0b,0 0 0 58px #ffffff08;pointer-events:none}
    .news-feature>*{position:relative;z-index:1}
    .news-kicker{display:flex;align-items:center;gap:8px;margin:0 0 12px;color:#edcf89;font-size:.72rem;font-weight:800;letter-spacing:.13em;text-transform:uppercase}
    .news-kicker:before{content:"";width:8px;height:8px;border-radius:50%;background:#edcf89}
    .news-feature h3{max-width:680px;margin:0;font-size:clamp(1.45rem,3vw,2.1rem);line-height:1.2;color:#fff}
    .news-feature>p:not(.news-kicker){max-width:680px;color:#d4e4da;line-height:1.7}
    .news-status{display:inline-flex;margin:14px 0 2px;padding:5px 10px;border-radius:30px;background:#ffffff1a;color:#fff;font-size:.78rem;font-weight:750}
    .news-dates{display:flex;flex-wrap:wrap;gap:10px;margin:17px 0}
    .news-date{min-width:170px;padding:10px 13px;border:1px solid #ffffff2a;border-radius:8px;background:#ffffff0b}
    .news-date span,.news-date strong{display:block}
    .news-date span{color:#c3d8ca;font-size:.73rem}
    .news-date strong{margin-top:3px;color:#fff;font-size:.92rem}
    .news-links{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
    .news-links .button{display:inline-flex;align-items:center;justify-content:center;min-height:42px}
    .news-feature .news-secondary{border:1px solid #ffffff70;background:transparent;color:#fff}
    .news-card{display:flex;flex-direction:column;min-height:220px;margin:0;padding:22px;border-radius:12px;transition:transform .18s ease,box-shadow .18s ease}
    .news-card:hover{transform:translateY(-3px);box-shadow:0 12px 28px #173b321c}
    .news-card h3{margin:8px 0;color:#173b32;font-size:1.14rem;line-height:1.35}
    .news-card p{color:#64736b;line-height:1.7}
    .news-card .news-read{align-self:flex-start;margin-top:auto}
    .news-date-label{color:#78877e;font-size:.78rem}
    .news-empty{grid-column:1/-1;display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:start;padding:22px;border:1px dashed #cbd9d0;border-radius:12px;background:linear-gradient(135deg,#f8faf6,#edf4ed)}
    .news-empty-mark{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:#dcebdd;color:#205d43;font-size:1.3rem}
    .news-empty h3{margin:0 0 4px;color:#173b32}
    .news-empty p{margin:0;color:#64736b}
    .news-empty-links{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
    @media(max-width:650px){#publicPages.news-grid{grid-template-columns:1fr}.news-feature{grid-column:auto}.news-empty{grid-template-columns:1fr}.news-date{flex:1 1 100%}}
  `;
  document.head.append(style);

  const backToTop = document.getElementById("backToTop");
  if (backToTop) {
    const updateBackToTop = () => {
      backToTop.hidden = window.scrollY < 400;
    };
    window.addEventListener("scroll", updateBackToTop, { passive: true });
    updateBackToTop();
    backToTop.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
      });
    });
  }

  async function getPublicData(path) {
    const response = await fetch(path);
    if (!response.ok) throw Error(`Unable to load public updates (${response.status}).`);
    const payload = await response.json();
    return payload.data || [];
  }

  function currentCycle(cycles) {
    const now = Date.now();
    const openingSoon = cycles
      .filter(cycle => ["CONFIGURED", "PUBLISHED"].includes(cycle.status) &&
        cycle.opensAt && new Date(cycle.opensAt).getTime() > now)
      .sort((a, b) => new Date(a.opensAt) - new Date(b.opensAt));
    const open = cycles
      .filter(cycle => cycle.status === "OPEN" &&
        (!cycle.closesAt || new Date(cycle.closesAt).getTime() > now))
      .sort((a, b) => new Date(a.closesAt || "9999-12-31") - new Date(b.closesAt || "9999-12-31"));
    const closed = cycles
      .filter(cycle => cycle.status === "CLOSED" ||
        (cycle.status === "OPEN" && cycle.closesAt && new Date(cycle.closesAt).getTime() <= now))
      .sort((a, b) => new Date(b.closesAt || 0) - new Date(a.closesAt || 0));
    return open[0] || openingSoon[0] || closed[0] ||
      cycles.slice().sort((a, b) => b.year - a.year)[0] || null;
  }

  function renderCycle(cycle) {
    if (!cycle) {
      return `<article class="panel news-feature"><p class="news-kicker">Award cycle update</p><h3>We’re getting ready for the next awards cycle.</h3><p>Official dates and the current award guide will be shared here as soon as they are published. In the meantime, get your teacher profile and supporting documents ready.</p><div class="news-links"><a class="button" href="#teacher-preparation">View the preparation checklist</a><a class="button news-secondary" href="#workspace" data-open-auth="register">Create a teacher account</a></div></article>`;
    }
    const now = Date.now();
    const opens = cycle.opensAt ? new Date(cycle.opensAt).getTime() : null;
    const closes = cycle.closesAt ? new Date(cycle.closesAt).getTime() : null;
    const state = cycle.status === "OPEN" && (!closes || closes > now)
      ? "Open"
      : cycle.status === "CLOSED" || (cycle.status === "OPEN" && closes <= now)
        ? "Closed"
        : opens && opens - now <= 30 * 86400000
          ? "Opening soon"
          : opens
            ? "Upcoming"
            : "Not open";
    const dates = `<div class="news-dates">${opens ? `<div class="news-date"><span>Cycle opens</span><strong>${esc(dateOnly(cycle.opensAt))}</strong></div>` : ""}${closes ? `<div class="news-date"><span>Submission deadline</span><strong>${esc(dateOnly(cycle.closesAt))}</strong></div>` : ""}</div>`;
    const guide = /^https?:\/\//i.test(cycle.guideUrl || "")
      ? `<a class="button news-secondary" href="${esc(cycle.guideUrl)}" target="_blank" rel="noopener noreferrer">Read the official guide</a>`
      : `<a class="button news-secondary" href="#teacher-preparation">See what to prepare</a>`;
    const message = state === "Open"
      ? "Applications are being accepted. Check the category requirements, prepare your evidence and submit before the deadline."
      : state === "Opening soon"
        ? "The cycle is approaching. Review the current requirements and get your application materials ready."
        : state === "Closed"
          ? "This submission window has closed. Prepare for the next cycle and watch this space for official updates."
          : "The next cycle is on the horizon. Check the official guide and start preparing your supporting documents.";
    const apply = state === "Open"
      ? `<a class="button" href="#workspace" data-open-auth="register">Start your application</a>`
      : `<a class="button" href="#teacher-preparation">Get application-ready</a>`;
    return `<article class="panel news-feature"><p class="news-kicker">Featured cycle update</p><h3>${esc(cycle.name)} · ${state === "Open" ? "Applications are open" : state === "Closed" ? "Cycle update" : "Coming up"}</h3><span class="news-status">${esc(state)}</span><p>${message}</p>${dates}<div class="news-links">${apply}${guide}</div></article>`;
  }

  async function renderAnnouncements() {
    const container = document.getElementById("publicPages");
    if (!container) return;
    container.setAttribute("aria-live", "polite");
    try {
      const [pages, cycles] = await Promise.all([
        getPublicData("/api/public/pages"),
        getPublicData("/api/public/cycles")
      ]);
      container.classList.add("news-grid");
      container.innerHTML = [
        renderCycle(currentCycle(cycles)),
        ...pages.slice(0, 8).map(page => `
          <article class="panel news-card">
            <p class="news-kicker">Latest announcement</p>
            <h3>${esc(page.title)}</h3>
            <p>${esc(page.summary || "Read the latest update from the Northern Cape NTA team.")}</p>
            <span class="news-date-label">Updated ${esc(dateOnly(page.updatedAt))}</span>
            <button class="btn secondary news-read" type="button" data-page="${esc(page.slug)}">Read announcement →</button>
          </article>`)
      ].concat(pages.length ? [] : [`
        <aside class="news-empty">
          <span class="news-empty-mark" aria-hidden="true">✦</span>
          <div><h3>You’re all caught up.</h3><p>There are no new notices right now. We’ll share important updates here when they’re published. While you wait, check your documents and read the preparation checklist.</p><div class="news-empty-links"><a class="btn secondary" href="#teacher-preparation">View preparation checklist</a><a class="btn secondary" href="#faq">Browse applicant FAQs</a></div></div>
        </aside>`]).join("");
      container.addEventListener("click", async event => {
        const button = event.target.closest("[data-page]");
        if (!button) return;
        try {
          const response = await fetch(`/api/public/pages/${encodeURIComponent(button.dataset.page)}`);
          const payload = await response.json();
          if (!response.ok) throw Error(payload.error || "Unable to load this announcement.");
          const dialog = document.createElement("dialog");
          dialog.className = "content-dialog";
          dialog.innerHTML = `<h2>${esc(payload.data.title)}</h2><div class="page-body">${esc(payload.data.body).replace(/\n/g, "<br>")}</div><form method="dialog"><button class="btn">Close</button></form>`;
          document.body.appendChild(dialog);
          dialog.addEventListener("close", () => dialog.remove());
          dialog.showModal();
        } catch (error) {
          container.insertAdjacentHTML("afterbegin", `<p class="notice error" role="alert">${esc(error.message)}</p>`);
        }
      });
    } catch (error) {
      container.innerHTML = `<p class="notice error" role="alert">${esc(error.message)} Refresh the page to try again.</p>`;
    }
  }

  fetch("/api/public/settings")
    .then(response => {
      if (!response.ok) throw Error(`Unable to load site settings (${response.status}).`);
      return response.json();
    })
    .then(({ data }) => {
      if (!data) return;
      document.title = `${data.siteTitle || "Northern Cape NTA"} | Management System`;
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = data.metaDescription || "";
      document.documentElement.dataset.theme = data.theme || "forest";
      const heading = document.querySelector(".hero h1");
      if (heading && data.tagline) heading.title = data.tagline;
    })
    .catch(error => console.error("Could not load public site settings:", error));

  renderAnnouncements();
  fetch("/api/public/visit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: location.pathname })
  }).catch(() => {});
})();

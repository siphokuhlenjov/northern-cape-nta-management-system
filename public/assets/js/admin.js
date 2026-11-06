(() => {
  "use strict";

  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
  const date = value => value ? new Date(value).toLocaleString() : "Not set";
  const statuses = ["DRAFT", "CONFIGURED", "PUBLISHED", "OPEN", "CLOSED", "ARCHIVED"];
  let pages = [];
  let activeTab = "overview";

  const msg = (text, bad = false) => {
    $("#message").textContent = text;
    $("#message").style.background = bad ? "#ffebea" : "#e5f2ed";
    $("#message").setAttribute("role", bad ? "alert" : "status");
  };

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      ...options
    });
    let payload = {};
    try { payload = await response.json(); } catch {}
    if (!response.ok) throw Error(payload.error || `Request failed (${response.status})`);
    return payload.data ?? payload;
  }

  function tab(name) {
    activeTab = name;
    document.querySelectorAll("#console>section").forEach(section =>
      section.classList.toggle("admin-hidden", section.id !== name));
    document.querySelectorAll("[data-tab]").forEach(button =>
      button.classList.toggle("active", button.dataset.tab === name));
    if (name === "cycles") loadCycles().catch(error => msg(error.message, true));
    if (name === "requirements") loadRequirementOptions().catch(error => msg(error.message, true));
  }

  $("#tabs").addEventListener("click", event => {
    const button = event.target.closest("[data-tab]");
    if (button) tab(button.dataset.tab);
  });

  function setupDashboard() {
    $("#tabs").insertAdjacentHTML("beforeend", '<button type="button" data-tab="cycles">Award cycles</button><button type="button" data-tab="requirements">Category requirements</button>');
    $("#overview").insertAdjacentHTML("beforeend", `
      <section class="admin-card">
        <h2>Performance &amp; workflow tools</h2>
        <p class="muted">Review operational workload and go straight to the next task.</p>
        <div id="workflowMetrics" class="admin-grid"></div>
        <div class="admin-actions admin-queue-links" aria-label="Review queues">
          <a class="btn" href="/?queue=review#workspace">Open applications awaiting review</a>
          <a class="btn secondary" href="/?queue=overdue#workspace">Open overdue reassessment tasks</a>
        </div>
        <div class="admin-actions">
          <button type="button" class="btn" data-open-tab="cycles">Manage award cycles</button>
          <button type="button" class="btn secondary" data-open-tab="requirements">Configure category requirements</button>
          <button type="button" class="btn secondary" data-open-tab="pages">Manage site content</button>
          <button type="button" class="btn secondary" data-open-tab="activity">Review activity</button>
        </div>
        <h3>Application workflow breakdown</h3>
        <div id="workflowChart" class="workflow-chart"></div>
        <h3>Current and upcoming award cycle</h3>
        <div id="cycleSummary" class="cycle-summary"></div>
      </section>`);

    $("#console").insertAdjacentHTML("beforeend", `
      <section id="requirements" class="admin-card admin-hidden">
        <h2>Cycle and category requirements</h2>
        <p>Enter eligibility guidance and required documents from the approved official guide. These settings are guidance for applicants; missing items warn teachers but do not prevent submission.</p>
        <div class="admin-form requirement-scope">
          <label>Award cycle<select id="requirementCycle" required></select></label>
          <label>Award category<select id="requirementCategory" required></select></label>
        </div>
        <div id="requirementNotice" class="admin-message" role="status">Choose a cycle and category to review requirements.</div>
        <form id="requirementForm">
          <div id="requirementRows" class="requirement-rows"></div>
          <div class="admin-actions">
            <button type="button" class="btn secondary" id="addRequirement">Add requirement</button>
            <button type="submit" class="btn">Save requirements</button>
          </div>
        </form>
      </section>`);

    $("#console").insertAdjacentHTML("beforeend", `
      <section id="cycles" class="admin-card admin-hidden">
        <div class="section-heading">
          <div><h2>Award cycles &amp; dates</h2>
          <p class="muted">Create a cycle, set the official dates and guide, then publish or open it when approved.</p></div>
          <button id="newCycleButton" class="btn secondary" type="button">New cycle</button>
        </div>
        <form id="cycleForm" class="admin-form cycle-form">
          <input type="hidden" name="id">
          <label>Cycle name<input name="name" required maxlength="120" placeholder="NTA 2027"></label>
          <label>Year<input name="year" type="number" min="2000" max="2100" required></label>
          <label>Status<select name="status">${statuses.map(status => `<option value="${status}" ${status === "CONFIGURED" ? "selected" : ""}>${esc(status.replaceAll("_", " "))}</option>`).join("")}</select></label>
          <label>Opens at<input name="opensAt" type="datetime-local"></label>
          <label>Closes at<input name="closesAt" type="datetime-local"></label>
          <label>Official nomination guide URL<input name="guideUrl" type="url" maxlength="1000" placeholder="https://..."></label>
          <label class="cycle-notes">Internal notes<textarea name="notes" maxlength="2000"></textarea></label>
          <div class="admin-actions cycle-buttons">
            <button class="btn" type="submit">Create cycle</button>
            <button id="cancelCycleButton" class="btn secondary" type="button">Clear form</button>
          </div>
        </form>
        <div id="cycleNotice" class="admin-message" role="status">Saving a cycle as Configured does not open applications. Set dates and open it only when approved.</div>
        <h3>Configured cycles</h3>
        <div class="table-wrap"><table class="admin-table"><thead><tr>
          <th>Cycle</th><th>Status</th><th>Opens</th><th>Closes</th><th>Guide</th><th>Action</th>
        </tr></thead><tbody id="cycleRows"></tbody></table></div>
      </section>`);

    const style = document.createElement("style");
    style.textContent = `
      .admin-actions{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}
      .admin-queue-links a{text-align:center}
      .workflow-chart{display:grid;gap:10px}
      .workflow-row{display:grid;grid-template-columns:minmax(135px,1fr) 3fr auto;align-items:center;gap:12px}
      .workflow-track{height:12px;background:#edf2ef;border-radius:20px;overflow:hidden}
      .workflow-fill{height:100%;background:#237b60;border-radius:20px}
      .cycle-summary{padding:16px;border:1px solid #d7e4dd;border-radius:10px;background:#f7faf8}
      .cycle-form{max-width:none;grid-template-columns:repeat(2,minmax(0,1fr))}
      .cycle-notes,.cycle-buttons{grid-column:1/-1}
      .cycle-state{display:inline-flex;padding:5px 9px;border-radius:20px;background:#eaf4ee;font-weight:700;font-size:.8rem}
      .requirement-scope{margin:18px 0}
      .requirement-rows{display:grid;gap:12px}
      .requirement-row{display:grid;grid-template-columns:minmax(130px,.7fr) minmax(160px,1fr) minmax(180px,1.4fr) auto auto;gap:10px;align-items:end;padding:14px;border:1px solid #d7e4dd;border-radius:10px;background:#f8faf8}
      .requirement-row label{display:grid;gap:5px;font-weight:650;font-size:.84rem}
      .requirement-row input,.requirement-row select{min-width:0;width:100%;padding:9px;border:1px solid #b9c9c1;border-radius:7px;font:inherit}
      .requirement-row .required-toggle{display:flex;align-items:center;gap:6px;white-space:nowrap}
      .requirement-row .required-toggle input{width:auto}
      @media(max-width:850px){.requirement-row{grid-template-columns:1fr 1fr}.requirement-row .description-field{grid-column:1/-1}}
      @media(max-width:650px){.cycle-form{grid-template-columns:1fr}.cycle-notes,.cycle-buttons{grid-column:auto}.workflow-row{grid-template-columns:1fr auto}.workflow-track{grid-column:1/-1;grid-row:2}.requirement-row{grid-template-columns:1fr}.requirement-row .description-field{grid-column:auto}}
    `;
    document.head.append(style);

    document.querySelectorAll("[data-open-tab]").forEach(button =>
      button.addEventListener("click", () => tab(button.dataset.openTab)));

    $("#newCycleButton").addEventListener("click", resetCycleForm);
    $("#cancelCycleButton").addEventListener("click", resetCycleForm);
    $("#cycleForm").addEventListener("submit", saveCycle);
    $("#requirementCycle").addEventListener("change", loadRequirementRows);
    $("#requirementCategory").addEventListener("change", loadRequirementRows);
    $("#addRequirement").addEventListener("click", () => addRequirementRow());
    $("#requirementRows").addEventListener("click", event => {
      const remove = event.target.closest("[data-remove-requirement]");
      if (remove) remove.closest(".requirement-row").remove();
    });
    $("#requirementForm").addEventListener("submit", saveRequirements);
  }

  async function overview() {
    const data = await api("/api/admin/overview");
    $("#metrics").innerHTML = [
      ["Registered users", data.users],
      ["Applications", data.applications],
      ["Page visits", data.visits],
      ["Server errors", data.errors],
      ["Uptime (seconds)", data.uptimeSeconds],
      ["Memory (MB)", data.memoryMB]
    ].map(([label, value]) => `<div class="metric"><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join("");

    $("#workflowMetrics").innerHTML = [
      ["Awaiting district review", data.workflow?.SUBMITTED || 0],
      ["Under review", data.workflow?.UNDER_REVIEW || 0],
      ["Applications awaiting review", (data.workflow?.SUBMITTED || 0) + (data.workflow?.UNDER_REVIEW || 0)],
      ["Returned to teachers", data.workflow?.RETURNED || 0],
      ["Ready for provincial review", data.workflow?.DISTRICT_APPROVED || 0],
      ["Open disputes", data.workflow?.openDisputes || 0],
      ["Pending reassessment tasks", data.workflow?.pendingTasks || 0],
      ["Overdue reassessment tasks", data.workflow?.overdueTasks || 0]
    ].map(([label, value]) => `<div class="metric"><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join("");

    const entries = Object.entries(data.daily || {}).sort((a, b) => a[0].localeCompare(b[0]));
    const maxVisits = Math.max(1, ...entries.map(([, count]) => count));
    $("#chart").setAttribute("viewBox", "0 0 700 160");
    $("#chart").innerHTML = entries.map(([day, count], index) =>
      `<rect x="${index * 48 + 12}" y="${130 - count / maxVisits * 115}" width="27" height="${count / maxVisits * 115}" fill="#237b60"><title>${esc(day)}: ${count} visits</title></rect><text x="${index * 48 + 12}" y="150" font-size="9">${esc(day.slice(5))}</text>`
    ).join("") || '<text x="15" y="50">No visit data yet</text>';

    const total = Math.max(1, data.applications);
    $("#statuses").innerHTML = data.byStatus.length
      ? `<div class="workflow-chart">${data.byStatus.map(item => {
        const count = item._count._all;
        const percent = Math.round(count / total * 100);
        return `<div class="workflow-row"><span>${esc(item.status.replaceAll("_", " "))}</span><div class="workflow-track"><div class="workflow-fill" style="width:${percent}%"></div></div><strong>${count} · ${percent}%</strong></div>`;
      }).join("")}</div>`
      : "<p>No applications yet.</p>";

    const cycle = data.currentCycle;
    $("#cycleSummary").innerHTML = cycle
      ? `<strong>${esc(cycle.name)} (${cycle.year})</strong><p><span class="cycle-state">${esc(cycle.status)}</span></p><p>Opens: ${esc(date(cycle.opensAt))}<br>Closes: ${esc(date(cycle.closesAt))}</p>`
      : "<p>No open or upcoming cycle is configured. Create a cycle and add the approved award dates.</p>";

    $("#activityRows").innerHTML = data.recent.map(item =>
      `<p>${esc(new Date(item.createdAt).toLocaleString())} · ${esc(item.action)} · ${esc(item.entityType)}</p>`
    ).join("") || "No activity yet.";
  }

  async function loadCycles() {
    const cycles = await api("/api/cycles");
    $("#cycleRows").innerHTML = cycles.length ? cycles.map(cycle => `
      <tr>
        <td><strong>${esc(cycle.name)}</strong><div class="muted">${cycle.year}</div></td>
        <td><span class="cycle-state">${esc(cycle.status)}</span></td>
        <td>${esc(date(cycle.opensAt))}</td>
        <td>${esc(date(cycle.closesAt))}</td>
        <td>${cycle.guideUrl && /^https?:\/\//i.test(cycle.guideUrl) ? `<a href="${esc(cycle.guideUrl)}" target="_blank" rel="noopener noreferrer">Open guide</a>` : "Not set"}</td>
        <td><button class="btn secondary" type="button" data-edit-cycle="${esc(cycle.id)}">Edit</button></td>
      </tr>`).join("") : '<tr><td colspan="6">No cycles configured yet. Create one above.</td></tr>';
    $("#cycleRows").querySelectorAll("[data-edit-cycle]").forEach(button =>
      button.addEventListener("click", () => editCycle(cycles.find(cycle => cycle.id === button.dataset.editCycle))));
    const open = cycles.find(cycle => cycle.status === "OPEN");
    $("#cycleNotice").textContent = open
      ? `Current open cycle: ${open.name}. An expired open cycle is closed automatically when you open a new cycle.`
      : "No cycle is currently open. Configure dates and open an approved cycle when ready.";
  }

  async function loadRequirementOptions() {
    const [cycles, categories] = await Promise.all([
      api("/api/cycles"),
      api("/api/reference/categories")
    ]);
    $("#requirementCycle").innerHTML = cycles.map(cycle =>
      `<option value="${esc(cycle.id)}">${esc(cycle.name)} (${esc(cycle.year)})</option>`
    ).join("") || '<option value="">No cycles configured</option>';
    $("#requirementCategory").innerHTML = categories.map(category =>
      `<option value="${esc(category.id)}">${esc(category.code)} · ${esc(category.name)}</option>`
    ).join("") || '<option value="">No active categories</option>';
    await loadRequirementRows();
  }

  function addRequirementRow(requirement = {}) {
    $("#requirementRows").insertAdjacentHTML("beforeend", `
      <div class="requirement-row" ${requirement.id ? `data-id="${esc(requirement.id)}"` : ""}>
        <label>Requirement type
          <select name="kind">
            <option value="ELIGIBILITY" ${requirement.kind !== "DOCUMENT" ? "selected" : ""}>Eligibility</option>
            <option value="DOCUMENT" ${requirement.kind === "DOCUMENT" ? "selected" : ""}>Required document</option>
          </select>
        </label>
        <label>Label
          <input name="label" maxlength="160" required value="${esc(requirement.label || "")}" placeholder="For example: Employment evidence">
        </label>
        <label class="description-field">Details
          <input name="description" maxlength="1000" value="${esc(requirement.description || "")}" placeholder="Short guidance from the official award guide">
        </label>
        <label class="required-toggle"><input name="required" type="checkbox" ${requirement.required === false ? "" : "checked"}> Required</label>
        <button type="button" class="btn secondary" data-remove-requirement>Remove</button>
      </div>`);
  }

  async function loadRequirementRows() {
    const cycleId = $("#requirementCycle").value;
    const categoryId = $("#requirementCategory").value;
    const rows = $("#requirementRows");
    rows.innerHTML = "";
    if (!cycleId || !categoryId) {
      $("#requirementNotice").textContent = "Create an award cycle and activate at least one category to configure requirements.";
      return;
    }
    try {
      const requirements = await api(`/api/cycles/${encodeURIComponent(cycleId)}/requirements?categoryId=${encodeURIComponent(categoryId)}`);
      requirements.forEach(addRequirementRow);
      $("#requirementNotice").textContent = requirements.length
        ? `${requirements.length} configured requirement${requirements.length === 1 ? "" : "s"}. Changes are shown to teachers for this cycle and category.`
        : "No requirements configured for this cycle and category. Add only items confirmed in the approved official guide.";
    } catch (error) {
      $("#requirementNotice").textContent = error.message;
      msg(error.message, true);
    }
  }

  async function saveRequirements(event) {
    event.preventDefault();
    const cycleId = $("#requirementCycle").value;
    const categoryId = $("#requirementCategory").value;
    if (!cycleId || !categoryId) return msg("Choose an award cycle and category first.", true);
    const requirements = [...$("#requirementRows").querySelectorAll(".requirement-row")].map(row => ({
      ...(row.dataset.id ? { id: row.dataset.id } : {}),
      kind: row.querySelector('[name="kind"]').value,
      label: row.querySelector('[name="label"]').value.trim(),
      description: row.querySelector('[name="description"]').value.trim(),
      required: row.querySelector('[name="required"]').checked
    }));
    const button = event.currentTarget.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      const result = await api(`/api/cycles/${encodeURIComponent(cycleId)}/categories/${encodeURIComponent(categoryId)}/requirements`, {
        method: "PUT",
        body: JSON.stringify({ requirements })
      });
      $("#requirementRows").innerHTML = "";
      result.forEach(addRequirementRow);
      $("#requirementNotice").textContent = `${result.length} requirement${result.length === 1 ? "" : "s"} saved. Applicants can review these items; missing required documents do not block submission.`;
      msg("Cycle/category requirements saved.");
    } catch (error) {
      msg(error.message, true);
    } finally {
      button.disabled = false;
    }
  }

  function localDateTime(value) {
    if (!value) return "";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "" : new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  function editCycle(cycle) {
    if (!cycle) return msg("Cycle not found.", true);
    const form = $("#cycleForm");
    for (const [key, value] of Object.entries({
      id: cycle.id, name: cycle.name, year: cycle.year, status: cycle.status,
      opensAt: localDateTime(cycle.opensAt), closesAt: localDateTime(cycle.closesAt),
      guideUrl: cycle.guideUrl || "", notes: cycle.notes || ""
    })) form.elements[key].value = value;
    form.querySelector('[type="submit"]').textContent = "Save cycle changes";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetCycleForm() {
    const form = $("#cycleForm");
    form.reset();
    form.elements.id.value = "";
    form.elements.status.value = "CONFIGURED";
    form.querySelector('[type="submit"]').textContent = "Create cycle";
  }

  async function saveCycle(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    const data = Object.fromEntries(new FormData(form).entries());
    const id = data.id;
    delete data.id;
    data.year = Number(data.year);
    for (const key of ["opensAt", "closesAt"]) {
      data[key] = data[key] ? new Date(data[key]).toISOString() : null;
    }
    if (data.opensAt && data.closesAt && new Date(data.opensAt) >= new Date(data.closesAt)) {
      msg("Closing time must be after opening time.", true);
      return;
    }
    button.disabled = true;
    try {
      await api(id ? `/api/cycles/${encodeURIComponent(id)}` : "/api/cycles", {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify(data)
      });
      msg(id ? "Award cycle and dates updated." : "Award cycle created. You can edit or open it from the cycle list.");
      resetCycleForm();
      await loadCycles();
      await overview();
    } catch (error) {
      msg(error.message, true);
    } finally {
      button.disabled = false;
    }
  }

  async function loadPages() {
    pages = await api("/api/admin/pages");
    $("#pageRows").innerHTML = pages.map(page => `
      <tr><td><input type="checkbox" data-select="${esc(page.id)}"></td>
      <td>${esc(page.title)}</td><td>${esc(page.slug)}</td>
      <td>${page.published ? "Published" : "Draft"}</td>
      <td><button data-edit="${esc(page.id)}">Edit</button> <button data-delete="${esc(page.id)}">Delete</button></td></tr>`
    ).join("") || '<tr><td colspan="5">No pages yet</td></tr>';
  }

  $("#pageRows").addEventListener("click", async event => {
    const id = event.target.dataset.edit || event.target.dataset.delete;
    if (!id) return;
    const page = pages.find(item => item.id === id);
    if (event.target.dataset.edit) {
      const form = $("#pageForm");
      for (const key of ["id", "title", "slug", "summary", "body"]) form.elements[key].value = page[key] || "";
      form.elements.published.checked = page.published;
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (!confirm("Delete this page permanently?")) return;
    try {
      await api(`/api/admin/pages/${id}`, { method: "DELETE" });
      msg("Page deleted.");
      await loadPages();
    } catch (error) { msg(error.message, true); }
  });

  $("#clearPage").onclick = () => $("#pageForm").reset();
  $("#pageForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.target;
    const data = Object.fromEntries(new FormData(form).entries());
    data.published = form.elements.published.checked;
    const id = data.id;
    delete data.id;
    try {
      await api(id ? `/api/admin/pages/${id}` : "/api/admin/pages", {
        method: id ? "PATCH" : "POST", body: JSON.stringify(data)
      });
      form.reset();
      form.elements.id.value = "";
      msg("Page saved.");
      await loadPages();
    } catch (error) { msg(error.message, true); }
  });

  document.querySelectorAll("[data-bulk]").forEach(button => button.onclick = async () => {
    const ids = [...document.querySelectorAll("[data-select]:checked")].map(item => item.dataset.select);
    if (!ids.length) return msg("Select pages first.", true);
    if (button.dataset.bulk === "delete" && !confirm("Delete selected pages permanently?")) return;
    try {
      const result = await api("/api/admin/pages/bulk", {
        method: "POST", body: JSON.stringify({ ids, action: button.dataset.bulk })
      });
      msg(`${result.count} pages updated.`);
      await loadPages();
    } catch (error) { msg(error.message, true); }
  });

  async function loadSettings() {
    const settings = await api("/api/admin/settings");
    const form = $("#settingsForm");
    for (const [key, value] of Object.entries(settings)) if (form.elements[key]) form.elements[key].value = value;
  }

  $("#settingsForm").addEventListener("submit", async event => {
    event.preventDefault();
    try {
      await api("/api/admin/settings", {
        method: "PUT", body: JSON.stringify(Object.fromEntries(new FormData(event.target).entries()))
      });
      msg("Settings saved. Refresh the public site to see changes.");
    } catch (error) { msg(error.message, true); }
  });

  $("#importBtn").onclick = async () => {
    try {
      const file = $("#importFile").files[0];
      if (!file) throw Error("Select a JSON file first.");
      if (file.size > 1024 * 1024) throw Error("Maximum file size is 1 MB.");
      const result = await api("/api/admin/import/pages", {
        method: "POST", body: JSON.stringify(JSON.parse(await file.text()))
      });
      msg(`${result.count} pages imported as drafts.`);
      await loadPages();
    } catch (error) { msg(error.message, true); }
  };

  async function init() {
    try {
      const me = await api("/api/auth/me");
      const user = me.user || me;
      if (!["SYSTEM_ADMIN", "PROVINCIAL_OFFICIAL"].includes(user.role)) {
        throw Error("You must sign in with an authorised staff account.");
      }
      $("#console").classList.remove("admin-hidden");
      setupDashboard();
      msg(`Signed in as ${user.role.replaceAll("_", " ")}.`);
      await overview();
      await Promise.all([loadPages(), loadCycles(), loadRequirementOptions()]);
      if (user.role === "SYSTEM_ADMIN") await loadSettings();
      else {
        for (const id of ["settingsForm", "pageForm", "importBtn"]) $(`#${id}`).classList.add("admin-hidden");
      }
      const system = user.role === "SYSTEM_ADMIN" ? await api("/api/admin/system").catch(() => null) : null;
      $("#system").textContent = system
        ? `Database: ${system.database}; Node: ${system.node}; uptime: ${system.uptimeSeconds}s; memory: ${system.memoryMB} MB`
        : "System health available to system administrators only.";
      $("#activityRows").innerHTML = (await api("/api/admin/overview")).recent.map(item =>
        `<p>${esc(new Date(item.createdAt).toLocaleString())} · ${esc(item.action)} · ${esc(item.entityType)}</p>`
      ).join("") || "No activity yet.";
    } catch (error) { msg(error.message, true); }
  }

  init();
})();

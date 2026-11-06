
/* ==========================================
   NTA HALL OF FAME PHOTO VIEWER
========================================== */

document.addEventListener("DOMContentLoaded", () => {
  const gallery = document.querySelectorAll(
    ".nta-fame-photo"
  );

  const dialog = document.getElementById("fameLightbox");
  const preview = document.getElementById("fameLightboxImage");
  const closeBtn = document.getElementById("fameClose");
  const nextBtn = document.getElementById("fameNext");
  const previousBtn = document.getElementById("famePrevious");

  if (!gallery.length || !dialog || !preview) return;

  let currentIndex = 0;

  function showPhoto(index) {
    currentIndex = (index + gallery.length) % gallery.length;

    const image = gallery[currentIndex].querySelector("img");

    if (!image) return;

    preview.src = image.src;
    preview.alt = image.alt;
  }

  gallery.forEach((button, index) => {
    button.addEventListener("click", () => {
      showPhoto(index);

      if (!dialog.open) {
        dialog.showModal();
      }
    });
  });

  closeBtn.addEventListener("click", () => {
    dialog.close();
  });

  nextBtn.addEventListener("click", () => {
    showPhoto(currentIndex + 1);
  });

  previousBtn.addEventListener("click", () => {
    showPhoto(currentIndex - 1);
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
      showPhoto(currentIndex + 1);
    }

    if (event.key === "ArrowLeft") {
      showPhoto(currentIndex - 1);
    }
  });
});

/* =========================================================
   SOUL & SCRIPT — js/pages/photos.js
   Photo gallery listing page.
   Page-specific script for photos.html. Loaded last, after all
   shared js/lib, js/render, js/nav.js, js/richtext.js, js/bootstrap.js.
   ========================================================= */

  const sortedPhotos = allPhotosSorted();
  document.getElementById("photos-grid").innerHTML = sortedPhotos.length
    ? sortedPhotos.map(photoCardHTML).join("")
    : `<div class="empty-state">${escapeHtml(ssUi("ui.noPhotos"))}</div>`;

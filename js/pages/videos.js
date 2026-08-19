/* =========================================================
   SOUL & SCRIPT — js/pages/videos.js
   Video gallery listing page.
   Page-specific script for videos.html. Loaded last, after all
   shared js/lib, js/render, js/nav.js, js/richtext.js, js/bootstrap.js.
   ========================================================= */

  const sortedVideos = [...window.VIDEOS].sort((a,b) => new Date(b.date) - new Date(a.date));
  document.getElementById("videos-grid").innerHTML = sortedVideos.length
    ? sortedVideos.map(videoCardHTML).join("")
    : `<div class="empty-state">No videos published yet.</div>`;

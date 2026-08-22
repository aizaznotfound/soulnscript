/* =========================================================
   SOUL & SCRIPT — js/lib/content-data.js
   Lookup/sort helpers over window.POSTS / VIDEOS / PHOTOS
   (the data window.NV — actually window.POSTS etc — populated
   by js/content.js, which must load before this file).
   ========================================================= */

function allPostsSorted(){
  return [...window.POSTS].sort((a,b) => new Date(b.date) - new Date(a.date));
}

function postsByCategory(cat){
  return allPostsSorted().filter(p => p.category === cat);
}

function findPost(slug){
  return window.POSTS.find(p => p.slug === slug);
}

function findVideo(slug){
  return window.VIDEOS.find(v => v.slug === slug);
}

function findPhoto(slug){
  return (window.PHOTOS || []).find(p => p.slug === slug);
}

function allPhotosSorted(){
  return [...(window.PHOTOS || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function findEvent(slug){
  return (window.EVENTS || []).find(e => e.slug === slug);
}

// An event counts as "active" if it has no end date and its start date
// hasn't passed yet, or if today falls within [date, endDate]. Staff can
// also force it either way with an explicit `status` field ("active" /
// "past") for things like open-ended calls for submissions that aren't
// tied to a single date.
function isEventActive(event, today){
  if (event.status === "active") return true;
  if (event.status === "past") return false;
  const now = today || new Date(new Date().toDateString());
  const start = event.date ? new Date(`${event.date}T00:00:00`) : null;
  const end = event.endDate ? new Date(`${event.endDate}T23:59:59`) : start;
  if (!start) return false;
  return now <= (end || start);
}

function activeEventsSorted(){
  const today = new Date(new Date().toDateString());
  return (window.EVENTS || [])
    .filter(e => isEventActive(e, today))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function pastEventsSorted(){
  const today = new Date(new Date().toDateString());
  return (window.EVENTS || [])
    .filter(e => !isEventActive(e, today))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}


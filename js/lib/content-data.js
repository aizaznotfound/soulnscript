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


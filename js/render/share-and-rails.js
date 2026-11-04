/* =========================================================
   SOUL & SCRIPT — js/render/share-and-rails.js
   Bilingual share bar, strips, rails, and mega-menu content.
   ========================================================= */

function shareBarMarkup(){
  return `
  <div class="share-bar">
    <span class="label">${escapeHtml(ssUi("ui.share"))}</span>
    <a href="#" class="share-fb">${escapeHtml(ssUi("ui.facebook"))}</a>
    <a href="#" class="share-x">${escapeHtml(ssUi("ui.twitter"))}</a>
    <a href="#" class="share-wa">${escapeHtml(ssUi("ui.whatsapp"))}</a>
    <button type="button" class="share-copy">${escapeHtml(ssUi("ui.copyLink"))}</button>
  </div>`;
}
function wireShareBar(mount, title){
  if(!mount) return;
  mount.innerHTML = shareBarMarkup();
  const pageUrl = () => location.href;
  const open = (url) => window.open(url, "_blank", "noopener,noreferrer");
  const fb = mount.querySelector(".share-fb");
  const x = mount.querySelector(".share-x");
  const wa = mount.querySelector(".share-wa");
  const copyBtn = mount.querySelector(".share-copy");
  if(fb) fb.addEventListener("click", (e) => { e.preventDefault(); open("https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(pageUrl())); });
  if(x) x.addEventListener("click", (e) => { e.preventDefault(); open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(title || "") + "&url=" + encodeURIComponent(pageUrl())); });
  if(wa) wa.addEventListener("click", (e) => { e.preventDefault(); open("https://wa.me/?text=" + encodeURIComponent((title || "") + " " + pageUrl())); });
  if(copyBtn) copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(pageUrl()).then(() => {
      copyBtn.textContent = ssUi("ui.copied");
      setTimeout(() => { copyBtn.textContent = ssUi("ui.copyLink"); }, 1500);
    });
  });
}

/* =========================================================
   SOUL & SCRIPT — js/render/team.js
   Groups window.TEAM (from js/content.js, built out of
   content/team/*.json) by team, and renders the grid on
   team.html. Depends on escapeHtml (js/lib/format.js).
   ========================================================= */

const TEAM_LABELS = {
  founders: "Founders & Co-Founders",
  editorial: "Editorial Board",
  media: "Media Team",
  promotion: "Promotional Team",
  judges: "Judges",
  communication: "Communication Team",
  finance: "Finance Team"
};
const TEAM_ORDER = ["founders", "editorial", "media", "promotion", "judges", "communication", "finance"];

function teamMemberCardHTML(member, index){
  const name = escapeHtml(member.name || "");
  const role = escapeHtml(member.role || "");
  const bio = escapeHtml(member.bio || "");
  const initials = (member.name || "?").trim().split(/\s+/).map(w => w[0]).slice(0,2).join("").toUpperCase();
  const photo = member.photo
    ? `<img src="${member.photo}" alt="${name}" loading="lazy">`
    : `<span class="team-avatar-initials">${initials}</span>`;
  const delay = Math.min(index, 8) * 45;
  return `
  <div class="team-card" style="transition-delay:${delay}ms;">
    <div class="team-avatar">${photo}</div>
    <h4>${name}</h4>
    ${role ? `<div class="team-role">${role}</div>` : ""}
    ${bio ? `<p class="team-bio">${bio}</p>` : ""}
  </div>`;
}

function renderTeamPage(){
  const mount = document.getElementById("team-groups");
  if(!mount) return;
  const members = Array.isArray(window.TEAM) ? window.TEAM : [];
  if(!members.length){
    mount.innerHTML = `<div class="empty-state">Our team roster isn't published yet — check back soon.</div>`;
    return;
  }
  const groups = {};
  members.forEach(m => {
    const key = m.team && TEAM_LABELS[m.team] ? m.team : "founders";
    (groups[key] = groups[key] || []).push(m);
  });
  Object.keys(groups).forEach(k => {
    groups[k].sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
  });
  const keys = TEAM_ORDER.filter(k => groups[k] && groups[k].length);
  mount.innerHTML = keys.map(k => `
    <section class="team-group">
      <h3><span>${TEAM_LABELS[k]}</span><span class="team-group-count">${groups[k].length} ${groups[k].length === 1 ? "member" : "members"}</span></h3>
      <div class="team-grid">
        ${groups[k].map((m, i) => teamMemberCardHTML(m, i)).join("")}
      </div>
    </section>`).join("");
}

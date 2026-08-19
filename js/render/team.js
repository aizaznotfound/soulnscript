/* =========================================================
   SOUL & SCRIPT — js/render/team.js
   Groups window.TEAM (from js/content.js, built out of
   content/team/*.json) by team, and renders the grid on
   team.html. Depends on escapeHtml (js/lib/format.js).
   ========================================================= */

const TEAM_LABELS = {
  founders: "Founders & Co-Founders",
  media: "Media Team",
  promotion: "Promotion Team",
  judges: "Judges",
  communication: "Communication Team",
  finance: "Finance Team"
};
const TEAM_ORDER = ["founders", "media", "promotion", "judges", "communication", "finance"];

function teamMemberCardHTML(member){
  const name = escapeHtml(member.name || "");
  const role = escapeHtml(member.role || "");
  const bio = escapeHtml(member.bio || "");
  const initials = (member.name || "?").trim().split(/\s+/).map(w => w[0]).slice(0,2).join("").toUpperCase();
  const photo = member.photo
    ? `<img src="${member.photo}" alt="${name}" loading="lazy">`
    : `<span class="team-avatar-initials">${initials}</span>`;
  return `
  <div class="team-card">
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
  const keys = TEAM_ORDER.filter(k => groups[k] && groups[k].length);
  mount.innerHTML = keys.map(k => `
    <section class="team-group">
      <h3>${TEAM_LABELS[k]}</h3>
      <div class="team-grid">
        ${groups[k].map(teamMemberCardHTML).join("")}
      </div>
    </section>`).join("");
}

/* =========================================================
   SOUL & SCRIPT — bilingual team renderer
   ========================================================= */

const TEAM_LABELS = {
  founders: "team.founders", editorial: "team.editorial", media: "team.media", promotion: "team.promotion",
  judges: "team.judges", communication: "team.communication", finance: "team.finance"
};
const TEAM_ORDER = ["founders", "editorial", "media", "promotion", "judges", "communication", "finance"];

function teamMemberCardHTML(member, index){
  const name = escapeHtml(ssField(member, "name"));
  const role = escapeHtml(ssField(member, "role"));
  const bio = escapeHtml(ssField(member, "bio"));
  const initials = (ssField(member, "name") || "?").trim().split(/\s+/).map(w => w[0]).slice(0,2).join("").toUpperCase();
  const photo = member.photo ? `<img src="${member.photo}" alt="${name}" loading="lazy">` : `<span class="team-avatar-initials">${initials}</span>`;
  const delay = Math.min(index, 8) * 45;
  return `<div class="team-card" style="transition-delay:${delay}ms;"><div class="team-avatar">${photo}</div><h4>${name}</h4>${role ? `<div class="team-role">${role}</div>` : ""}${bio ? `<p class="team-bio">${bio}</p>` : ""}</div>`;
}

function renderTeamPage(){
  const mount = document.getElementById("team-groups");
  if(!mount) return;
  const members = Array.isArray(window.TEAM) ? window.TEAM : [];
  if(!members.length){ mount.innerHTML = `<div class="empty-state">${escapeHtml(ssUi("ui.noTeam"))}</div>`; return; }
  const groups = {};
  members.forEach(member => {
    const key = member.team && TEAM_LABELS[member.team] ? member.team : "founders";
    (groups[key] = groups[key] || []).push(member);
  });
  Object.keys(groups).forEach(key => groups[key].sort((a,b) => (Number(a.order) || 99) - (Number(b.order) || 99)));
  const keys = TEAM_ORDER.filter(key => groups[key] && groups[key].length);
  mount.innerHTML = keys.map(key => `<section class="team-group"><h3><span>${escapeHtml(ssUi(TEAM_LABELS[key]))}</span><span class="team-group-count">${groups[key].length} ${escapeHtml(ssUi(groups[key].length === 1 ? "ui.member" : "ui.members"))}</span></h3><div class="team-grid">${groups[key].map((member, i) => teamMemberCardHTML(member, i)).join("")}</div></section>`).join("");
}

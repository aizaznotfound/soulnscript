/* =========================================================
   SOUL & SCRIPT — js/pages/contribute.js
   Reader sign-up / login for the Write for Us program.
   Page-specific script for contribute.html. Loaded last, after all
   shared js/lib, js/render, js/nav.js, js/richtext.js, js/bootstrap.js.
   ========================================================= */

  const TOKEN_KEY = "gkmc_contributor_session_v1";

  function setTab(tab){
    document.querySelectorAll(".auth-tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    document.getElementById("register-form").style.display = tab === "register" ? "block" : "none";
    document.getElementById("login-form").style.display = tab === "login" ? "block" : "none";
  }

  function showStatus(elId, type, html){
    const el = document.getElementById(elId);
    el.className = "publish-status show " + type;
    el.innerHTML = html;
  }

  // Already logged in? Send them straight to the writing tool.
  (function checkExisting(){
    try{
      const session = JSON.parse(localStorage.getItem(TOKEN_KEY) || "null");
      if(session && session.token) window.location.href = "write.html";
    } catch(e){}
  })();

  document.getElementById("register-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("r-username").value.trim();
    const email = document.getElementById("r-email").value.trim();
    const whatsapp = document.getElementById("r-whatsapp").value.trim();
    const password = document.getElementById("r-password").value;

    showStatus("register-status", "working", "Creating your account…");
    try{
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, whatsapp, password })
      });
      const data = await res.json();
      if(!data.ok) throw new Error(data.error || "Couldn't create your account.");

      // Log straight in after registering.
      const loginRes = await fetch("/api/contributor-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const loginData = await loginRes.json();
      if(!loginData.ok) throw new Error("Account created — please log in.");

      localStorage.setItem(TOKEN_KEY, JSON.stringify({ username: loginData.username, token: loginData.token }));
      showStatus("register-status", "success", "✅ Account created! Taking you to the writing tool…");
      setTimeout(() => { window.location.href = "write.html"; }, 900);
    } catch(err){
      showStatus("register-status", "error", "⚠ " + err.message);
    }
  });

  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("l-username").value.trim();
    const password = document.getElementById("l-password").value;

    showStatus("login-status", "working", "Checking…");
    try{
      const res = await fetch("/api/contributor-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if(!data.ok) throw new Error(data.error || "Incorrect username or password.");
      localStorage.setItem(TOKEN_KEY, JSON.stringify({ username: data.username, token: data.token }));
      showStatus("login-status", "success", "✅ Logged in. Taking you to the writing tool…");
      setTimeout(() => { window.location.href = "write.html"; }, 700);
    } catch(err){
      showStatus("login-status", "error", "⚠ " + err.message);
    }
  });

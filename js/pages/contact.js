/* =========================================================
   SOUL & SCRIPT — js/pages/contact.js
   Contact form — opens a pre-filled email, no backend needed.
   Page-specific script for contact.html. Loaded last, after all
   shared js/lib, js/render, js/nav.js, js/richtext.js, js/bootstrap.js.
   ========================================================= */

  document.getElementById("contact-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const reason = document.getElementById("reason").value;
    const message = document.getElementById("message").value;
    const subject = encodeURIComponent(`[Soul & Script] ${reason} — from ${name}`);
    const body = encodeURIComponent(`${message}\n\n—\n${name}\n${email}`);
    window.location.href = `mailto:soulnscript26@gmail.com?subject=${subject}&body=${body}`;
  });

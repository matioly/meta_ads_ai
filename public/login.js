const form = document.querySelector("#login-form");
const button = document.querySelector("#login-submit");
const errorBox = document.querySelector("#login-error");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!form.reportValidity()) return;

  button.disabled = true;
  button.textContent = "Entrando…";
  errorBox.hidden = true;

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: document.querySelector("#email").value,
        password: document.querySelector("#password").value
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Não foi possível entrar.");
    }

    window.location.replace("/");
  } catch (error) {
    errorBox.textContent = error.message || "Falha de conexão.";
    errorBox.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = "Entrar no painel";
  }
});
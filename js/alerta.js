// alerta.js
export function mostrarAlerta(mensagem, tipo = 'feedback') {
  const alerta = document.getElementById("alerta");
  const alertaTexto = document.getElementById("alertaTexto");
  const alertaIcon = document.getElementById("alertaIcon");

  alerta.classList.remove("bg-green-600", "bg-red-600", "bg-yellow-500");
  alerta.style.backgroundColor = "";
  alerta.style.color = "";
  alertaIcon.className = "fas";

  if (tipo === 'feedback') {
    alerta.style.backgroundColor = "var(--color-feedback-bg)";
    alerta.style.color = "var(--color-feedback-text)";
    alertaIcon.classList.add("fa-check-circle");
  } else if (tipo === 'alerta') {
    alerta.style.backgroundColor = "var(--color-alerta-bg)";
    alerta.style.color = "var(--color-alerta-text)";
    alertaIcon.classList.add("fa-exclamation-triangle");
  } else if (tipo === 'informacao') {
    alerta.style.backgroundColor = "var(--color-informacao-bg)";
    alerta.style.color = "var(--color-informacao-text)";
    alertaIcon.classList.add("fa-info-circle");
  }

  alertaTexto.textContent = mensagem;
  alerta.classList.remove("hidden");
  alerta.classList.add("animate-fade-in-down");
  setTimeout(() => alerta.classList.add("hidden"), 3000);
}

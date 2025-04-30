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



export function mostrarConfirmacao(mensagem) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';

    const box = document.createElement('div');
    box.className = 'bg-white rounded-lg p-6 shadow-lg text-center max-w-sm w-full animate-fade-in-down';

    const texto = document.createElement('p');
    texto.className = 'text-lg font-semibold mb-4 text-gray-800';
    texto.textContent = mensagem;

    const botoes = document.createElement('div');
    botoes.className = 'flex justify-center gap-4';

    const btnSim = document.createElement('button');
    btnSim.className = 'bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition';
    btnSim.textContent = 'Sim';
    btnSim.onclick = () => {
      document.body.removeChild(overlay);
      resolve(true);
    };

    const btnNao = document.createElement('button');
    btnNao.className = 'bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition';
    btnNao.textContent = 'Não';
    btnNao.onclick = () => {
      document.body.removeChild(overlay);
      resolve(false);
    };

    botoes.appendChild(btnSim);
    botoes.appendChild(btnNao);

    box.appendChild(texto);
    box.appendChild(botoes);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  });
}
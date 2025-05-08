export function mostrarAlerta(mensagem, tipo = 'success') {
  const alerta = document.getElementById('alertaCustom');
  const texto = document.getElementById('textoAlerta');

  texto.textContent = mensagem;

  // Reseta classes visuais
  alerta.className = `fixed bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded text-center text-white text-sm shadow-lg z-50 ${
    tipo === 'error' ? 'error' : 'success'
  } hidden`;

  // Remove hidden com delay de renderização
  requestAnimationFrame(() => {
    alerta.classList.remove('hidden'); // torna visível
    requestAnimationFrame(() => {
      alerta.classList.add('mostrar'); // aplica a animação de subida

      // Inicia processo de ocultar
      setTimeout(() => {
        alerta.classList.remove('mostrar');
        alerta.classList.add('ocultar');

        setTimeout(() => {
          alerta.classList.remove('ocultar');
          alerta.classList.add('hidden');
        }, 400); // tempo da animação de saída
      }, 3000); // tempo que fica visível
    });
  });
}

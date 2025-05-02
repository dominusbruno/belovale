// auth.js

document.addEventListener('DOMContentLoaded', () => {
  const nome = localStorage.getItem('colabNome');
  const validade = localStorage.getItem('authValidade');

  // Se não houver login salvo ou validade expirada, redireciona
  if (!nome || !validade || Date.now() > parseInt(validade)) {
    localStorage.clear();
    window.location.href = 'login.html';
    return;
  }

  // Aqui segue com o carregamento normal da página
});


// Verifica se o usuário está logado
const nome = localStorage.getItem('colabNome');

// Se não estiver logado, redireciona para a página de login
if (!nome) {
  window.location.href = 'login.html';
}

// auth.js

// Verifica se o usuário está logado
const nome = localStorage.getItem('colabNome');

// Se não estiver logado, redireciona para a página de login
if (!nome) {
  window.location.href = 'login.html';
}

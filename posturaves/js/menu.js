// menu.js
console.log('menu.js iniciado');
console.log('menuMobile:', document.getElementById('menuMobile'));


document.addEventListener('DOMContentLoaded', () => {
  // ✅ Obtém o nome do usuário armazenado
  const nome = localStorage.getItem('colabNome') || 'Usuário';

  // ✅ Atualiza nome no menu desktop
  const spanUsuario = document.getElementById('nomeUsuario');
  if (spanUsuario) {
    spanUsuario.classList.add('hover:text-red-400');
    spanUsuario.textContent = `Olá, ${nome}`;
  }

  // ✅ Atualiza nome no menu mobile
  const spanMobile = document.getElementById('nomeUsuarioMobile');
  if (spanMobile) {
    spanMobile.textContent = `Olá, ${nome}`;
  }

  // ✅ Dropdown do usuário no desktop
  const usuarioContainer = document.getElementById('usuarioContainer');
  const menuUsuario = document.getElementById('menuUsuario');
  if (usuarioContainer && menuUsuario) {
    usuarioContainer.addEventListener('click', () => {
      menuUsuario.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!usuarioContainer.contains(e.target)) {
        menuUsuario.classList.add('hidden');
      }
    });
  }

  // ✅ Toggle menu mobile
  const menuToggle = document.getElementById('menuToggle');
  const menuMobile = document.getElementById('menuMobile');
  if (menuToggle && menuMobile) {
    menuToggle.addEventListener('click', () => {
      menuMobile.classList.toggle('hidden');
    });
  }

  // ✅ Logout para desktop
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.clear();
      window.location.href = 'login.html';
    });
  }

  // ✅ Logout para mobile
  const btnLogoutMobile = document.getElementById('btnLogoutMobile');
  if (btnLogoutMobile) {
    btnLogoutMobile.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.clear();
      window.location.href = 'login.html';
    });
  }
});

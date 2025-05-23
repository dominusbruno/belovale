// menu.js
document.addEventListener('DOMContentLoaded', () => {
  // ✅ Obtém o nome do usuário armazenado
  const nome = localStorage.getItem('colabNome') || 'Usuário';

  // ✅ Atualiza nome no menu desktop
  const spanUsuario = document.getElementById('nomeUsuario');
  if (spanUsuario) {
    spanUsuario.classList.add('hover:text-red-400');
    spanUsuario.textContent = `${nome}`;
  }

  // ✅ Atualiza nome no menu mobile
  const spanMobile = document.getElementById('nomeUsuarioMobile');
  if (spanMobile) {
    spanMobile.textContent = `${nome}`;
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

  // ✅ Fecha todos os submenus se clicar fora do menu mobile
  document.addEventListener('click', function (event) {
    const menuMobile = document.getElementById('menuMobile');
    const menuToggle = document.getElementById('menuToggle');
  
    if (
      menuMobile &&
      !menuMobile.classList.contains('hidden') &&
      !menuMobile.contains(event.target) &&
      !menuToggle.contains(event.target)
    ) {
  
      ['cadastrosMenu', 'relatoriosMenu', 'graficosMenu'].forEach(id => {
        const menu = document.getElementById(id);
        if (menu) menu.classList.add('hidden');
      });
  
      menuMobile.classList.add('hidden');
    }
  });
  
});

/**
 * ✅ Função global chamada pelos botões para abrir o submenu correspondente
 * Fecha todos os outros submenus antes de abrir o clicado
 */
function toggleMenu(id) {
  const submenus = ['cadastrosMenu', 'relatoriosMenu', 'graficosMenu'];
  submenus.forEach(menuId => {
    const el = document.getElementById(menuId);
    if (el && menuId !== id) {
      el.classList.add('hidden');
    }
  });

  const target = document.getElementById(id);
  if (target) {
    target.classList.toggle('hidden');
  }
}

// Torna a função acessível no escopo global para uso no HTML (ex: onclick="toggleMenu('cadastrosMenu')")
window.toggleMenu = toggleMenu;

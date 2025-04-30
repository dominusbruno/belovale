// submenu.js
export function configurarSubmenuMobile() {
  document.querySelectorAll('#mobileMenu details').forEach(detail => {
    detail.addEventListener('toggle', () => {
      if (detail.open) {
        document.querySelectorAll('#mobileMenu details').forEach(d => {
          if (d !== detail) d.removeAttribute('open');
        });
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  configurarSubmenuMobile();
});

// Torna a função disponível globalmente:
window.configurarSubmenuMobile = configurarSubmenuMobile;

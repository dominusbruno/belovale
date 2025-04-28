// menu.js
export function navigateTo(id) {
  document.querySelectorAll('.spa-section').forEach(sec => sec.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');

  // Fecha o menu mobile ao clicar em qualquer link
  const mobileMenu = document.getElementById('mobileMenu');
  if (window.innerWidth < 768 && !mobileMenu.classList.contains('hidden')) {
    mobileMenu.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.getElementById('mobileMenu').classList.toggle('hidden');
  });

  navigateTo('inicial');
});

// Torna a função disponível globalmente:
window.navigateTo = navigateTo;

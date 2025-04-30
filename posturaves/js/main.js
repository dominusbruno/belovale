// Carrega o sidebar dinamicamente
async function carregarSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    const res = await fetch('components/sidebar.html');
    sidebar.innerHTML = await res.text();
  }
}

carregarSidebar();

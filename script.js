
const chartContainer = document.getElementById('chartContainer');

window.addEventListener('DOMContentLoaded', () => {
  fetch('dados.csv')
    .then(response => response.text())
    .then(csvText => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => processarDados(results.data)
      });
    })
    .catch(error => {
      chartContainer.innerHTML = `<p class="text-red-600">Erro ao importar: ${error.message}</p>`;
    });
});

function processarDados(data) {
  chartContainer.innerHTML = "";
  const grouped = {};

  data.forEach(row => {
    const tipo = (row['Tipo'] || '').trim();
    const categoria = (row['Categoria'] || '').trim();
    const grafico = (row['Grafico'] || 'bar').toLowerCase().trim();

    if (!grouped[tipo]) {
      grouped[tipo] = { labels: [], datasets: {}, grafico };
    }

    grouped[tipo].labels.push(categoria);

    Object.keys(row).forEach(col => {
      if (!['Tipo', 'Categoria', 'Grafico'].includes(col)) {
        if (!grouped[tipo].datasets[col]) grouped[tipo].datasets[col] = [];
        grouped[tipo].datasets[col].push(parseFloat(row[col]) || 0);
      }
    });
  });

  Object.entries(grouped).forEach(([titulo, dados], index) => {
    const card = document.createElement('div');
    card.classList.add('bg-white', 'rounded-xl', 'shadow-md', 'p-4', 'flex', 'flex-col');
    card.style.aspectRatio = '1 / 1';
    card.style.flex = '1 1 30%';

    const canvas = document.createElement('canvas');
    canvas.id = `chart${index}`;
    canvas.classList.add('w-full');
    canvas.style.height = '100%';
    canvas.style.width = '100%';
    card.appendChild(canvas);
    chartContainer.appendChild(card);

    const cores = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    new Chart(canvas.getContext('2d'), {
      type: dados.grafico,
      data: {
        labels: dados.labels,
        datasets: Object.entries(dados.datasets).map(([label, valores], i) => ({
          label,
          data: valores,
          borderColor: cores[i % cores.length],
          backgroundColor: cores[i % cores.length],
          borderWidth: 2,
          fill: false,
          tension: 0.3
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true },
          title: { display: true, text: titulo }
        },
        scales: ['pie', 'doughnut', 'radar'].includes(dados.grafico) ? {} : {
          y: { beginAtZero: true }
        }
      }
    });
  });
}

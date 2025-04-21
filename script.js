window.addEventListener('DOMContentLoaded', () => {
  const chartContainer = document.getElementById('chartContainer');
  const controlContainer = document.createElement('div');
  controlContainer.className = 'mb-4 flex justify-end px-4';
  chartContainer.before(controlContainer);

  const select = document.createElement('select');
  select.className = 'border border-gray-300 rounded px-2 py-1';
  [10, 20, 30, 40].forEach(n => {
    const option = document.createElement('option');
    option.value = n;
    option.textContent = `${n} semanas`;
    select.appendChild(option);
  });
  controlContainer.appendChild(select);

  let semanasExibir = 10;
  select.addEventListener('change', () => {
    semanasExibir = parseInt(select.value);
    chartContainer.innerHTML = '';
    Papa.parse('dados.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        renderizarGraficos(results.data);
      }
    });
  });

  Papa.parse('dados.csv', {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      renderizarGraficos(results.data);
    }
  });

  function renderizarGraficos(dataRaw) {
    const dados = dataRaw
      .filter(row => row['STATUS'] === 'ATIVO')
      .map(row => ({
        galpao: row['GALPAO'],
        lote: row['LOTE'],
        idade: parseInt(row['IDADE']),
        real: parseFloat(row['PRODUTIVIDADE REAL'].replace('%','').replace(',', '.')) / 100,
        padrao: parseFloat(row['PRODUTIVIDADE PADRAO'].replace('%','').replace(',', '.')) / 100
      }));

    const agrupado = {};
        
    dados.forEach(row => {
      const chave = row.lote;
      if (!agrupado[chave]) agrupado[chave] = [];
      agrupado[chave].push(row);
    });

    Object.entries(agrupado)
      .sort(([, a], [, b]) => {
        const ga = a.sort((x, y) => y.idade - x.idade)[0].galpao;
        const gb = b.sort((x, y) => y.idade - x.idade)[0].galpao;
        return ga.localeCompare(gb, 'pt', { numeric: true });
      })
      .forEach(([chave, valores], i) => {
        const porIdade = {};
        valores.forEach(v => {
          if (!porIdade[v.idade]) porIdade[v.idade] = [];
          porIdade[v.idade].push(v);
        });

        const medias = Object.entries(porIdade).map(([idade, linhas]) => {
          const idadeNum = parseInt(idade);
          const realMedia = linhas.reduce((sum, l) => sum + l.real, 0) / linhas.length;
          const padraoMedia = linhas.reduce((sum, l) => sum + l.padrao, 0) / linhas.length;
          return { idade: idadeNum, real: realMedia, padrao: padraoMedia };
        });

        const ultimas = medias
          .sort((a, b) => b.idade - a.idade)
          .slice(0, semanasExibir)
          .sort((a, b) => a.idade - b.idade);

        const labels = ultimas.map(p => `${p.idade}`);
        const real = ultimas.map(p => p.real);
        const padrao = ultimas.map(p => p.padrao);

        const card = document.createElement('div');
        card.className = "bg-white shadow-md rounded-xl p-4 w-full h-[400px]";
        const canvas = document.createElement('canvas');
        canvas.id = "grafico" + i;
        card.appendChild(canvas);
        chartContainer.appendChild(card);

        new Chart(canvas.getContext('2d'), {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              {
                label: 'Real',
                data: real,
                borderColor: '#3b82f6',
                borderWidth: 1.5,
                tension: 0.4,
                pointRadius: 1,
              },
              {
                label: 'Padrão',
                data: padrao,
                borderColor: '#f97316',
                borderWidth: 1,
                borderDash: [5, 5],
                tension: 0.4,
                pointRadius: 1,
              }
            ]
          },
          options: {
            plugins: {
              title: {
                display: true,
                text: `${valores.sort((a,b)=>b.idade-a.idade)[0].galpao} - ${chave}`
              },
              legend: {
                display: false
              }
            },
            scales: {
              y: {
                beginAtZero: false,
                // suggestedMax removido para eixo dinâmico
                ticks: {
                  callback: value => (value * 100).toFixed(1) + '%'
                }
              },
              x: {
                title: {
                  display: true,
                  text: 'Idade (semanas)'
                }
              }
            }
          }
        });
      });
  }
});

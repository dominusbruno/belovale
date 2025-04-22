window.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('bg-blue-100');
  const corDeFundoCard = 'bg-white';
  const chartContainer = document.getElementById('chartContainer');
  const controlContainer = document.createElement('div');
  controlContainer.className = 'mb-4 flex justify-center gap-2 px-4 flex-wrap';
  chartContainer.before(controlContainer);

  const selectStatus = document.createElement('select');
  selectStatus.className = 'border border-gray-300 rounded px-2 py-1 bg-white';
  ['ATIVO', 'INATIVO', 'TODOS'].forEach(status => {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status.charAt(0) + status.slice(1).toLowerCase();
    if (status === 'ATIVO') option.selected = true;
    selectStatus.appendChild(option);
  });
  controlContainer.appendChild(selectStatus);

  const dropdownWrapper = document.createElement('div');
  dropdownWrapper.className = 'relative';

  const dropdownToggle = document.createElement('button');
  dropdownToggle.textContent = 'Selecionar Lotes';
  dropdownToggle.className = 'border border-gray-300 rounded px-2 py-1 bg-white';

  dropdownWrapper.appendChild(dropdownToggle);

  const dropdownMenu = document.createElement('div');
  dropdownMenu.className = 'absolute mt-1 w-56 bg-white border border-gray-300 rounded shadow z-10 hidden max-h-60 overflow-y-auto';
  dropdownWrapper.appendChild(dropdownMenu);

  controlContainer.appendChild(dropdownWrapper);

  dropdownToggle.addEventListener('click', () => {
    dropdownMenu.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!dropdownWrapper.contains(e.target)) dropdownMenu.classList.add('hidden');
  });

  const selectSemanas = document.createElement('select');
  selectSemanas.className = 'border border-gray-300 rounded px-2 py-1 bg-white';
  [10, 20, 30, 40, 60, 80, 100].forEach(n => {
    const option = document.createElement('option');
    option.value = n;
    option.textContent = `${n} semanas`;
    selectSemanas.appendChild(option);
  });
  controlContainer.appendChild(selectSemanas);

  const resetButton = document.createElement('button');
  resetButton.textContent = 'Resetar Filtros';
  resetButton.className = 'bg-gray-200 hover:bg-gray-300 text-sm px-4 py-1 rounded border border-gray-300';
  controlContainer.appendChild(resetButton);

  let semanasExibir = 10;
  let lotesSelecionados = [];
  let statusSelecionado = 'ATIVO';

  resetButton.addEventListener('click', () => {
    selectStatus.value = 'ATIVO';
    selectSemanas.value = 10;
    semanasExibir = 10;
    statusSelecionado = 'ATIVO';
    carregarLotesFiltrados(() => {
      lotesSelecionados = Array.from(dropdownMenu.querySelectorAll('input:checked')).map(cb => cb.value);
      atualizarGraficos();
    });
  });

  selectSemanas.addEventListener('change', () => {
    semanasExibir = parseInt(selectSemanas.value);
    atualizarGraficos();
  });

  selectStatus.addEventListener('change', () => {
    statusSelecionado = selectStatus.value;
    carregarLotesFiltrados(() => {
      lotesSelecionados = Array.from(dropdownMenu.querySelectorAll('input:checked')).map(cb => cb.value);
      atualizarGraficos();
    });
  });

  function carregarLotesFiltrados(callback) {
    Papa.parse('dados.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        const loteMaisRecentePorLote = {};
        results.data
          .filter(row => statusSelecionado === 'TODOS' || row['STATUS'] === statusSelecionado)
          .forEach(row => {
            const lote = row['LOTE'];
            const idade = parseInt(row['IDADE']);
            if (!loteMaisRecentePorLote[lote] || idade > loteMaisRecentePorLote[lote].idade) {
              loteMaisRecentePorLote[lote] = {
                galpao: row['GALPAO'],
                idade,
                lote
              };
            }
          });

        const lotesFiltrados = Object.values(loteMaisRecentePorLote).sort((a, b) => `${a.galpao}-${a.lote}`.localeCompare(`${b.galpao}-${b.lote}`, 'pt', { numeric: true }));
        dropdownMenu.innerHTML = '';
        lotesFiltrados.forEach(lote => {
          const label = document.createElement('label');
          label.className = 'flex items-center px-3 py-1 hover:bg-gray-100 cursor-pointer';

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.value = lote.lote;
          checkbox.className = 'mr-2';

          checkbox.addEventListener('change', () => {
            const selected = dropdownMenu.querySelectorAll('input:checked');
            lotesSelecionados = Array.from(selected).map(cb => cb.value);
            atualizarGraficos();
          });

          label.appendChild(checkbox);
          label.appendChild(document.createTextNode(`${lote.galpao} - ${lote.lote}`));
          dropdownMenu.appendChild(label);
        });
        if (callback) callback();
      }
    });
  }

  Papa.parse('dados.csv', {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      carregarLotesFiltrados(() => {
        atualizarGraficos();
      });
    }
  });

  function atualizarGraficos() {
    chartContainer.innerHTML = '';
    Papa.parse('dados.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        renderizarGraficos(results.data);
      }
    });
  }

  function renderizarGraficos(dataRaw) {
    const dados = dataRaw
      .filter(row => statusSelecionado === 'TODOS' || row['STATUS'] === statusSelecionado)
      .filter(row => lotesSelecionados.length === 0 || lotesSelecionados.includes(row['LOTE']))
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

    const total = Object.keys(agrupado).length;
    let largura = 'w-full';
    if (total >= 3 && total < 5) largura = 'lg:w-1/2';
    else if (total >= 5) largura = 'lg:w-1/3';

    chartContainer.className = 'flex flex-wrap gap-4 justify-center items-start';

    Object.entries(agrupado)
      .sort(([, a], [, b]) => {
        const ga = [...a].sort((x, y) => y.idade - x.idade)[0].galpao;
        const gb = [...b].sort((x, y) => y.idade - x.idade)[0].galpao;
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
        card.className = `${corDeFundoCard} shadow-md rounded-xl p-4 ${largura} min-w-[300px]`;
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
            responsive: true,
            maintainAspectRatio: false,
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

        card.style.minHeight = '200px';
        card.style.height = '250px';
      });
  }
});

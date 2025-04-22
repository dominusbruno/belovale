window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM totalmente carregado');

  document.body.classList.add('bg-blue-100');
  const corDeFundoCard = 'bg-white';
  const chartContainer = document.getElementById('chartContainer');
  const controlContainer = document.createElement('div');
  controlContainer.className = 'mb-4 flex flex-wrap justify-center sm:justify-center items-start gap-2 px-4';
  chartContainer.before(controlContainer);

  // Menu STATUS personalizado
  const statusWrapper = document.createElement('div');
  statusWrapper.className = 'relative';

  const statusToggle = document.createElement('button');
  statusToggle.textContent = 'Status: ATIVO';
  statusToggle.className = 'border border-gray-300 rounded px-2 py-1 bg-white text-left w-full sm:w-48';
  statusToggle.setAttribute('aria-expanded', 'false');
  statusToggle.setAttribute('aria-controls', 'statusMenu');
  statusWrapper.appendChild(statusToggle);

  const statusMenu = document.createElement('div');
  statusMenu.id = 'statusMenu';
  statusMenu.className = 'absolute mt-1 w-full sm:w-40 bg-white border border-gray-300 rounded shadow z-10 hidden';
  ['ATIVO', 'INATIVO', 'TODOS'].forEach(status => {
    const option = document.createElement('div');
    option.className = 'px-2 py-1 hover:bg-gray-100 cursor-pointer';
    option.textContent = status;
    option.addEventListener('click', () => {
      statusSelecionado = status;
      statusToggle.textContent = `Status: ${status}`;
      statusMenu.classList.add('hidden');
      carregarLotesFiltrados(() => {
        lotesSelecionados = Array.from(dropdownMenu.querySelectorAll('input:checked')).map(cb => cb.value);
        atualizarGraficos();
      });
    });
    statusMenu.appendChild(option);
  });
  statusWrapper.appendChild(statusMenu);
  controlContainer.appendChild(statusWrapper);

  statusToggle.addEventListener('click', () => {
    const isExpanded = statusMenu.classList.toggle('hidden') === false;
    statusToggle.setAttribute('aria-expanded', isExpanded);
  });
  document.addEventListener('click', (e) => {
    if (!statusWrapper.contains(e.target)) statusMenu.classList.add('hidden');
  });

  // Menu SEMANAS personalizado
  const semanasWrapper = document.createElement('div');
  semanasWrapper.className = 'relative';

  const semanasToggle = document.createElement('button');
  semanasToggle.textContent = 'Semanas: 100';
  semanasToggle.className = 'border border-gray-300 rounded px-2 py-1 bg-white text-left w-full sm:w-48';
  semanasToggle.setAttribute('aria-expanded', 'false');
  semanasToggle.setAttribute('aria-controls', 'semanasMenu');
  semanasWrapper.appendChild(semanasToggle);

  const semanasMenu = document.createElement('div');
  semanasMenu.id = 'semanasMenu';
  semanasMenu.className = 'absolute mt-1 w-full sm:w-40 bg-white border border-gray-300 rounded shadow z-10 hidden';
  [10, 20, 30, 40, 60, 80, 100].forEach(semana => {
    const option = document.createElement('div');
    option.className = 'px-2 py-1 hover:bg-gray-100 cursor-pointer';
    option.textContent = `${semana} semanas`;
    option.addEventListener('click', () => {
      semanasExibir = semana;
      semanasToggle.textContent = `Semanas: ${semana}`;
      semanasMenu.classList.add('hidden');
      atualizarGraficos();
    });
    semanasMenu.appendChild(option);
  });
  semanasWrapper.appendChild(semanasMenu);
  controlContainer.appendChild(semanasWrapper);

  semanasToggle.addEventListener('click', () => {
    const isExpanded = semanasMenu.classList.toggle('hidden') === false;
    semanasToggle.setAttribute('aria-expanded', isExpanded);
  });
  document.addEventListener('click', (e) => {
    if (!semanasWrapper.contains(e.target)) semanasMenu.classList.add('hidden');
  });

  // Dropdown de lotes (já estava personalizado)
  const dropdownWrapper = document.createElement('div');
  dropdownWrapper.className = 'relative';
  dropdownWrapper.classList.add('w-full', 'sm:w-auto');

  const dropdownToggle = document.createElement('button');
  dropdownToggle.textContent = 'Selecionar Lotes';
  dropdownToggle.className = 'border border-gray-300 rounded px-2 py-1 bg-white text-left w-full sm:w-48';
  dropdownToggle.setAttribute('aria-expanded', 'false');
  dropdownToggle.setAttribute('aria-controls', 'dropdownMenu');
  dropdownWrapper.appendChild(dropdownToggle);

  const dropdownMenu = document.createElement('div');
  dropdownMenu.id = 'dropdownMenu';
  dropdownMenu.className = 'absolute mt-1 w-full sm:w-56 bg-white border border-gray-300 rounded shadow z-10 hidden max-h-60 overflow-y-auto';
  dropdownWrapper.appendChild(dropdownMenu);

  controlContainer.appendChild(dropdownWrapper);

  dropdownToggle.addEventListener('click', () => {
    const isExpanded = dropdownMenu.classList.toggle('hidden') === false;
    dropdownToggle.setAttribute('aria-expanded', isExpanded);
  });
  document.addEventListener('click', (e) => {
    if (!dropdownWrapper.contains(e.target)) dropdownMenu.classList.add('hidden');
  });

  const resetButton = document.createElement('button');
  resetButton.textContent = 'Resetar Filtros';
  resetButton.className = 'bg-gray-200 hover:bg-gray-300 text-sm px-4 py-1 rounded border border-gray-300 w-full sm:w-auto sm:text-left';
  controlContainer.appendChild(resetButton);

  let semanasExibir = 100;
  let lotesSelecionados = [];
  let statusSelecionado = 'ATIVO';

  resetButton.addEventListener('click', () => {
    console.log('Resetando filtros...');
    semanasExibir = 100;
    statusSelecionado = 'ATIVO';
    statusToggle.textContent = 'Status: ATIVO';
    semanasToggle.textContent = 'Semanas: 100';
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
        const colReal = results.meta.fields.find(col => col.toUpperCase().includes('REAL'));
        if (colReal) {
          const titulo = colReal.split(' ')[0].toUpperCase();
          document.querySelector('header h1').textContent = `AVÍCOLA BELO VALE - ${titulo} (Últimas ${semanasExibir} semanas)`;
        }

        dropdownMenu.innerHTML = '';
        const dadosFiltrados = statusSelecionado === 'TODOS' 
          ? results.data 
          : results.data.filter(row => row['STATUS'] === statusSelecionado);

        const ultimoGalpaoPorLote = {};
  dadosFiltrados.forEach(row => {
    const lote = row['LOTE'];
    const idade = parseInt(row['IDADE']);
    if (!ultimoGalpaoPorLote[lote] || idade > ultimoGalpaoPorLote[lote].idade) {
      ultimoGalpaoPorLote[lote] = { galpao: row['GALPAO'], idade };
    }
  });

  const lotesUnicos = Object.entries(ultimoGalpaoPorLote)
  .map(([lote, info]) => `${info.galpao}|${lote}`)
  .sort((a, b) => {
    const [galpaoA, loteA] = a.split('|');
    const [galpaoB, loteB] = b.split('|');
    return galpaoA.localeCompare(galpaoB, 'pt', { numeric: true }) || loteA.localeCompare(loteB, 'pt', { numeric: true });
  });

        lotesUnicos.forEach(entry => {
  const [galpao, lote] = entry.split('|');
  const labelTexto = `${galpao} - ${lote}`;
  const item = document.createElement('div');
  item.className = 'px-2 py-1 hover:bg-gray-100 flex items-center';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.value = lote;
  checkbox.id = `lote-${lote}`;
  checkbox.className = 'mr-2 mb-1 sm:mb-0';

  const label = document.createElement('label');
  label.htmlFor = `lote-${lote}`;
  label.className = 'ml-2';
  label.textContent = labelTexto;

  item.appendChild(checkbox);
  item.appendChild(label);
  dropdownMenu.appendChild(item);

  checkbox.addEventListener('change', () => {
    lotesSelecionados = Array.from(dropdownMenu.querySelectorAll('input:checked')).map(cb => cb.value);
    atualizarGraficos();
  });
});
        if (callback) callback();
      }
    });
  }

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
    if (total >= 3 && total < 4) largura = 'lg:w-1/2';
    else if (total >= 4) largura = 'lg:w-1/3';

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
        canvas.id = 'grafico' + i;
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
                pointRadius: 1
              },
              {
                label: 'Padrão',
                data: padrao,
                borderColor: '#f97316',
                borderWidth: 1,
                borderDash: [5, 5],
                tension: 0.4,
                pointRadius: 1
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: `${valores.sort((a, b) => b.idade - a.idade)[0].galpao} - ${chave}`
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

  carregarLotesFiltrados(() => {
    atualizarGraficos();
  });
});

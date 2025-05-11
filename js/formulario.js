// Importações principais
import { db } from './firebaseConfig.js';
import { mostrarAlerta, dataHoraBR } from './utils.js';
import { configuracoesFormularios, camposCalculadosPersonalizados  } from './configFormularios.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';



// Aguarda o carregamento do DOM para inicializar o sistema
document.addEventListener('DOMContentLoaded', async () => {
  // Elementos da interface
  const tabelaCorpo = document.getElementById('tabelaCorpo');
  const btnToggleFiltros = document.getElementById('btnToggleFiltros');
  const formConteudo = document.getElementById('formConteudo');
  const areaFiltros = document.getElementById('areaFiltros');
  const btnLimparFiltros = document.getElementById('btnLimparFiltros');
  const barraFormulario = document.getElementById('barraFormulario');
  const spanFormulario = barraFormulario.querySelector('span');
  const filtroContainer = document.getElementById('filtroContainer');
  const filtrosAtivos = {};

  
  
  // Função para capitalizar nomes de tipo
  const capitalizar = texto => texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();

  // Captura os parâmetros da URL: tipo (lotes, colaboradores...) e modo (simples ou composto)
  const tipo = new URLSearchParams(window.location.search).get('tipo');
  const modo = new URLSearchParams(window.location.search).get('modo') || 'simples';

  // Captura o tipo e gera o título do formulário e da página
  const tituloPagina = tipo ? `Cadastro de ${capitalizar(tipo)}` : 'Cadastro';
  const h2Titulo = document.getElementById('tituloPagina');
  if (h2Titulo) h2Titulo.textContent = tituloPagina;
  document.title = `PosturAves - ${tituloPagina}`;
  const spanTitulo = document.getElementById('formTituloTexto');
  if (spanTitulo) {
    spanTitulo.textContent = tituloPagina;
  }


  // Captura a configuração do tipo e modo (ex: simples.lotes ou composto.financeiro)
const estruturaConfig = configuracoesFormularios[modo]?.[tipo];

// Valida se tipo existe
if (!estruturaConfig) {
  mostrarAlerta('Tipo de formulário inválido ou não configurado.', 'error');
  return;
}

// Extrai a estrutura real: campos (simples) ou seções (composto)
const estrutura = Array.isArray(estruturaConfig)
  ? estruturaConfig
  : estruturaConfig.campos || estruturaConfig.seções || [];

// Define a ordenação padrão (se houver)
const ordenacao = estruturaConfig.ordenacaoPadrao;

// Define nome da coleção Firebase
const colecao = tipo === 'colaboradores' ? 'bdcolaboradores' : 'bd' + tipo;

  

  let campoOrdenacao = null;
  let direcaoOrdenacao = 'asc';
  let registros = [];
  let idEditando = null;
  let paginaAtual = 1;
  const registrosPorPagina = 5;



  
  //***************************************************************************************
  // Gera dinamicamente o cabeçalho da tabela com base na estrutura
  const renderizarCabecalho = () => {
    tabelaCabecalho.innerHTML = '';
  
    // 🔹 Para modo simples: tabela padrão com colunas fixas
    if (modo === 'simples') {
      const tr = document.createElement('tr');
  
      estrutura
        .filter(col => col.eColuna)
        .forEach(col => {
          const th = document.createElement('th');
          th.className = 'px-2 py-1 text-sm text-center uppercase whitespace-nowrap overflow-hidden text-ellipsis';
  
          const botao = document.createElement('button');
          botao.dataset.campo = col.campo;
          botao.className = 'flex items-center gap-1 uppercase hover:underline mx-auto';
  
          const spanLabel = document.createElement('span');
          spanLabel.textContent = col.label;
  
          botao.textContent = col.label;
          th.appendChild(botao);
          tr.appendChild(th);
        });
  
      // Coluna de ações
      const thAcoes = document.createElement('th');
      thAcoes.className = 'px-2 py-1 text-sm text-center uppercase whitespace-nowrap overflow-hidden text-ellipsis';
      thAcoes.textContent = 'Ações';
      tr.appendChild(thAcoes);
  
      tabelaCabecalho.appendChild(tr);
  
      // Eventos de clique para ordenar
      tabelaCabecalho.querySelectorAll('button[data-campo]').forEach(btn => {
        btn.addEventListener('click', () => {
          const campo = btn.dataset.campo;
          if (campoOrdenacao === campo) {
            direcaoOrdenacao = direcaoOrdenacao === 'asc' ? 'desc' : 'asc';
          } else {
            campoOrdenacao = campo;
            direcaoOrdenacao = 'asc';
          }
          renderizarTabela();
        });
      });
    }
  
    // 🔹 Para modo composto: cabeçalho simplificado
    else if (modo === 'composto') {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.className = 'px-4 py-2 text-sm uppercase text-left text-slate-500';
      th.colSpan = 100;
      th.textContent = 'Registros agrupados por seção (clique para expandir)';
      tr.appendChild(th);
      tabelaCabecalho.appendChild(tr);
    }
  };
  

  //***************************************************************************************
  // Busca os registros do Firebase e atualiza a interface conforme o modo (simples ou composto)
  const carregarRegistros = async () => {
    registros = [];
  
    try {
      const snapshot = await getDocs(collection(db, colecao));
  
      snapshot.forEach(doc => {
        registros.push({ id: doc.id, ...doc.data() });
      });
  
      // Ordena sempre com prioridade para 'criadoEm' (caso exista), senão por 'data'
     // 🔄 Ordena com base na configuração padrão do formulário
if (estruturaConfig.ordenacaoPadrao) {
  const { campo, direcao } = estruturaConfig.ordenacaoPadrao;
  registros.sort((a, b) => {
    const valorA = a[campo] || '';
    const valorB = b[campo] || '';

    // Tenta ordenar como data, senão como string comum
    const tipo = isNaN(Date.parse(valorA)) ? 'string' : 'date';

    const comparacao = tipo === 'date'
      ? new Date(valorA) - new Date(valorB)
      : valorA.localeCompare(valorB);

    return direcao === 'desc' ? -comparacao : comparacao;
  });
}


  
      renderizarCabecalho();
      renderizarTabela();
      
  
    } catch (erro) {
      console.error('Erro ao carregar registros:', erro);
      mostrarAlerta('Erro ao buscar dados do banco de dados.', 'error');
    }
  };
  

  //***************************************************************************************
  // Gera as linhas da tabela com os registros carregados (simples ou composto)
  const renderizarTabela = (dados = registros) => {
    if (campoOrdenacao) {
      dados.sort((a, b) => {
        const getValor = (item) => {
          const campo = campoOrdenacao;
          const ehCalculado = estrutura.some(c => c.campo === campo && c.calculado);
          if (ehCalculado && camposCalculadosPersonalizados[tipo]?.[campo]) {
            return camposCalculadosPersonalizados[tipo][campo](item) || '';
          }
          return item[campo] || '';
        };
    
        let valA = getValor(a);
        let valB = getValor(b);
    
        // Conversão para número se possível
        if (!isNaN(valA) && !isNaN(valB)) {
          valA = parseFloat(valA);
          valB = parseFloat(valB);
        }
    
        if (valA < valB) return direcaoOrdenacao === 'asc' ? -1 : 1;
        if (valA > valB) return direcaoOrdenacao === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    
    tabelaCorpo.innerHTML = '';
    const inicio = (paginaAtual - 1) * registrosPorPagina;
    const fim = inicio + registrosPorPagina;
    const registrosPaginados = dados.slice(inicio, fim);

    registrosPaginados.forEach((item, index) => {
      // 🔹 Modo SIMPLES
      if (modo === 'simples') {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-yellow-50 transition-colors';

        estrutura.filter(col => col.eColuna).forEach(col => {
          const td = document.createElement('td');
          let valor = '';

          if (col.calculado && camposCalculadosPersonalizados[tipo]?.[col.campo]) {
            valor = camposCalculadosPersonalizados[tipo][col.campo](item);
          } else {
            valor = item[col.campo] || '';
            if (col.tipo === 'date' && valor) {
              const [ano, mes, dia] = valor.split('-');
              valor = `${dia}/${mes}/${ano.slice(2)}`;
            }
          }

          const classeCondicional = col.formatoCondicional ? col.formatoCondicional(valor, item) : '';
          td.className = `px-2 py-1 text-sm border-t text-center align-middle leading-tight whitespace-nowrap overflow-hidden text-ellipsis ${classeCondicional}`;
          td.textContent = valor;
          tr.appendChild(td);
        });

        const tdAcoes = document.createElement('td');
        tdAcoes.className = 'px-2 py-0.5 text-sm border-t text-center align-middle leading-tight';

        const btnEditar = document.createElement('button');
        btnEditar.innerHTML = `<img src="icons/icon-edit.svg" alt="Editar" class="w-5 h-5 inline-block">`;
        btnEditar.className = 'hover:scale-125 transition-transform';
        btnEditar.title = 'Editar';

        btnEditar.addEventListener('click', () => abrirFormulario(item.id));

        tdAcoes.appendChild(btnEditar);
        tr.appendChild(tdAcoes);
        tabelaCorpo.appendChild(tr);
      }

      // 🔹 Modo COMPOSTO
      else if (modo === 'composto') {
        const wrapper = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 100;
        td.className = 'border-t';

        const details = document.createElement('details');
        details.className = 'bg-white border rounded shadow-sm mb-2';

        const summary = document.createElement('summary');
        summary.className = 'px-4 py-2 cursor-pointer select-none font-semibold bg-gray-100 hover:bg-gray-200 rounded';
        summary.textContent = item.finNota
          ? `Nota ${item.finNota} - ${item.finTipo || ''} - ${item.finData || ''}`
          : `Registro ${index + 1}`;

        const conteudo = document.createElement('div');
        conteudo.className = 'p-4 bg-gray-50 space-y-6 text-sm text-slate-700';

        estrutura.forEach(secao => {
          // Cabeçalho
          if (secao.tipo === 'cabecalho') {
            const grid = document.createElement('div');
            grid.className = 'grid sm:grid-cols-2 md:grid-cols-3 gap-2';

            secao.campos.forEach(campo => {
              const valor = item[campo.campo] || '';
              const div = document.createElement('div');
              const classe = campo.formatoCondicional ? campo.formatoCondicional(valor, item) : '';
              div.className = classe;
              div.innerHTML = `<strong>${campo.label}:</strong> ${valor}`;
              grid.appendChild(div);
            });

            conteudo.appendChild(grid);
          }

          // Tabelas dinâmicas
          if (secao.tipo === 'tabela') {
            const dadosTabela = item[secao.id] || [];
            if (!Array.isArray(dadosTabela) || !dadosTabela.length) return;

            const div = document.createElement('div');
            div.innerHTML = `<div class="font-semibold mb-1">${secao.titulo}</div>`;

            const table = document.createElement('table');
            table.className = 'w-full border text-sm';

            const thead = document.createElement('thead');
            thead.className = 'bg-gray-100';
            thead.innerHTML = `
              <tr>
                ${secao.colunas.map(col => `<th class="border px-2 py-1">${col.label}</th>`).join('')}
              </tr>`;

            const tbody = document.createElement('tbody');
            dadosTabela.forEach(linha => {
              const tr = document.createElement('tr');
              secao.colunas.forEach(col => {
                const td = document.createElement('td');
                let val = linha[col.campo] || '';

                if (col.tipo === 'number' && typeof val === 'number') {
                  val = val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                  td.className = 'text-right';
                }
                if (col.tipo === 'date' && typeof val === 'string') {
                  const [y, m, d] = val.split('-');
                  val = `${d}/${m}/${y}`;
                }

                td.className += ' border px-2 py-1';
                td.textContent = val;
                tr.appendChild(td);
              });
              tbody.appendChild(tr);
            });

            table.appendChild(thead);
            table.appendChild(tbody);
            div.appendChild(table);
            conteudo.appendChild(div);
          }
        });

        const btnEditar = document.createElement('button');
        btnEditar.textContent = 'Editar';
        btnEditar.className = 'mt-3 inline-flex items-center bg-blue-500 text-white px-3 py-1 text-sm rounded hover:bg-blue-600';
        btnEditar.addEventListener('click', () => abrirFormulario(item.id));
        conteudo.appendChild(btnEditar);

        details.appendChild(summary);
        details.appendChild(conteudo);
        td.appendChild(details);
        wrapper.appendChild(td);
        tabelaCorpo.appendChild(wrapper);
      }
    });

    atualizarPaginacao(dados);
  };

  
  //***************************************************************************************
  // Calcula e exibe as páginas da paginação para ambos os modos
  const atualizarPaginacao = (dados = registros) => {
    const paginacao = document.getElementById('paginacao');
    const totalPaginas = Math.ceil(dados.length / registrosPorPagina);

    // Oculta a paginação se só houver uma página
    if (totalPaginas <= 1) {
      paginacao.innerHTML = '';
      return;
    }

    paginacao.innerHTML = `
      <div class="flex justify-center items-center gap-4 mt-4 text-sm">
        <button id="btnAnterior" class="bg-blue-500 text-white px-3 py-1.5 rounded shadow disabled:opacity-50 hover:bg-blue-600">
          Anterior
        </button>
        <span class="text-slate-700">Página ${paginaAtual} de ${totalPaginas}</span>
        <button id="btnProxima" class="bg-blue-500 text-white px-3 py-1.5 rounded shadow disabled:opacity-50 hover:bg-blue-600">
          Próxima
        </button>
      </div>
    `;

    // Botão anterior
    document.getElementById('btnAnterior')?.addEventListener('click', () => {
      if (paginaAtual > 1) {
        paginaAtual--;
        renderizarTabela(dados); // envia dados corretamente para manter filtros
      }
    });

    // Botão próxima
    document.getElementById('btnProxima')?.addEventListener('click', () => {
      if (paginaAtual < totalPaginas) {
        paginaAtual++;
        renderizarTabela(dados); // idem
      }
    });
  };


  //***************************************************************************************
  // Função unificada para abrir formulários dinâmicos (simples ou composto)
  const abrirFormulario = (id = null) => {
    formConteudo.classList.remove('hidden');
    formConteudo.innerHTML = '';
    idEditando = id;

    const registro = registros.find(r => r.id === id);
    const form = document.createElement('form');
    form.className = modo === 'simples'
      ? 'p-4 text-slate-700 text-sm grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 uppercase'
      : 'p-4 bg-white text-slate-700 text-sm space-y-6 uppercase';

    formConteudo.appendChild(form);

    //============================================
    // MODO SIMPLES
    //============================================
    if (modo === 'simples') {
      estrutura.filter(col => !col.calculado).forEach(col => {
        const div = document.createElement('div');

        const label = document.createElement('label');
        label.className = 'block text-sm font-medium text-gray-700';
        label.setAttribute('for', col.campo);
        label.textContent = col.label;

        let input;
        if (col.tipo === 'select') {
          input = document.createElement('select');
          input.className = 'w-full border border-gray-300 rounded px-3 py-2 text-sm';
          
          if (col.placeholder) {
            const optPlaceholder = document.createElement('option');
            optPlaceholder.value = '';
            optPlaceholder.textContent = col.placeholder;
            optPlaceholder.disabled = true;
            optPlaceholder.selected = !registro;
            input.appendChild(optPlaceholder);
          }

          col.opcoes?.forEach(opcao => {
            const opt = document.createElement('option');
            opt.value = opcao;
            opt.textContent = opcao;
            input.appendChild(opt);
          });
          
        } else {
          input = document.createElement('input'); //Cria o input
          input.type = col.tipo === 'date' ? 'date' : (col.tipo || 'text');
          input.className = 'w-full border border-gray-300 rounded px-3 py-2 text-sm';
          if (col.placeholder) input.placeholder = col.placeholder;
          if (col.mascara) IMask(input, { mask: col.mascara });
        }

        input.id = col.campo;
        input.name = col.campo;
        input.value = registro ? registro[col.campo] : (col.defaultValue || '');

        if (col.min) input.min = col.min;
        if (col.max) input.max = col.max;
        if (col.mascara === 'moeda') {
          IMask(input, {
            mask: 'R$ num',
            blocks: {
              num: {
                // Define formato de moeda com separador brasileiro
                mask: Number,
                thousandsSeparator: '.',
                radix: ',',
                mapToRadix: ['.'],
                scale: 2,
                normalizeZeros: true,
                padFractionalZeros: true
              }
            }
          });
        } else if (col.mascara) {
          IMask(input, { mask: col.mascara });
        }
        
        if (col.readOnly) {
          if (col.tipo === 'select') input.disabled = true;
          else input.readOnly = true;
        }
        if (!col.readOnly && col.required) input.required = true;

        div.appendChild(label);
        div.appendChild(input);

        if (col.descricao) {
          const spanAjuda = document.createElement('small');
          spanAjuda.className = 'text-xs text-gray-500';
          spanAjuda.textContent = col.descricao;
          div.appendChild(spanAjuda);
        }

        form.appendChild(div);
      });
    }

    //============================================
    // MODO COMPOSTO
    //============================================
    if (modo === 'composto') {
      estrutura.forEach(secao => {
        const fieldset = document.createElement('fieldset');
        fieldset.className = 'col-span-full space-y-4';

        if (secao.titulo) {
          const legend = document.createElement('legend');
          legend.textContent = secao.titulo;
          legend.className = 'text-base font-semibold text-gray-600 border-b pb-1';
          fieldset.appendChild(legend);
        }

        if (secao.tipo === 'cabecalho') {
          const grid = document.createElement('div');
          grid.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4';

          secao.campos.forEach(campo => {
            const div = document.createElement('div');
            const label = document.createElement('label');
            label.className = 'block text-sm font-medium text-gray-700';
            label.setAttribute('for', campo.campo);
            label.textContent = campo.label;

            const input = document.createElement('input');
            input.type = campo.tipo === 'date' ? 'date' : (campo.tipo || 'text');
            input.className = 'w-full border border-gray-300 rounded px-3 py-2 text-sm';
            input.id = campo.campo;
            input.name = campo.campo;
            input.value = registro ? (registro[campo.campo] || '') : (campo.defaultValue || '');

            if (campo.placeholder) input.placeholder = campo.placeholder;
            if (campo.required) input.required = true;
            if (campo.readOnly) input.readOnly = true;

            div.appendChild(label);
            div.appendChild(input);
            grid.appendChild(div);
          });

          fieldset.appendChild(grid);
        }

        if (secao.tipo === 'tabela') {
          const container = document.createElement('div');
          container.id = `secao-${secao.id}`;

          const table = document.createElement('div');
          table.className = 'space-y-2';

          const btnAdd = document.createElement('button');
          btnAdd.type = 'button';
          btnAdd.textContent = `+ ${secao.titulo}`;
          btnAdd.className = 'px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600';

          btnAdd.addEventListener('click', () => {
            const linha = document.createElement('div');
            linha.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-1';

            secao.colunas.forEach(col => {
              const input = document.createElement('input');
              input.type = col.tipo || 'text';
              input.placeholder = col.label;
              input.name = `${secao.id}_${col.campo}`;
              input.className = 'border border-gray-300 rounded px-2 py-1 text-sm';
              linha.appendChild(input);
            });

            table.appendChild(linha);
          });

          container.appendChild(table);
          container.appendChild(btnAdd);
          fieldset.appendChild(container);
        }

        form.appendChild(fieldset);
      });
    }

    //============================================
    // BOTÕES: salvar, excluir, cancelar
    //============================================
    const actions = document.createElement('div');
    actions.className = 'col-span-full flex justify-end gap-4 pt-4';

    const btnSalvar = document.createElement('button');
    btnSalvar.type = 'submit';
    btnSalvar.textContent = idEditando ? 'Atualizar' : 'Salvar';
    btnSalvar.className = 'inline-flex items-center bg-blue-500 text-white px-4 py-1.5 text-sm rounded hover:bg-blue-600';
    actions.appendChild(btnSalvar);

    if (idEditando) {
      const btnExcluir = document.createElement('button');
      btnExcluir.type = 'button';
      btnExcluir.textContent = 'Excluir';
      btnExcluir.className = 'inline-flex items-center bg-red-500 text-white px-4 py-1.5 text-sm rounded hover:bg-red-600';
      btnExcluir.addEventListener('click', async () => {
        const confirmacao = confirm('Tem certeza que deseja excluir este registro?');
        if (confirmacao) {
          await deleteDoc(doc(db, colecao, idEditando));
          mostrarAlerta('Registro excluído com sucesso.', 'success');
          await carregarRegistros();
          abrirFormulario();
        }
      });
      actions.appendChild(btnExcluir);
    }

    const btnCancelar = document.createElement('button');
    btnCancelar.type = 'button';
    btnCancelar.textContent = 'Cancelar';
    btnCancelar.className = 'inline-flex items-center bg-gray-500 text-white px-4 py-1.5 text-sm rounded hover:bg-gray-600';
    btnCancelar.addEventListener('click', () => {
      formConteudo.innerHTML = '';
      abrirFormulario();
      formConteudo.classList.add('hidden');
    });
    actions.appendChild(btnCancelar);

    form.appendChild(actions);
    formConteudo.appendChild(form);

    // Submit final
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (modo === 'simples') await salvarRegistro();
      else await salvarRegistro();
    });
  };


  //***************************************************************************************
  // Função unificada para salvar registros (simples ou composto)
  const salvarRegistro = async () => {
    const novoRegistro = {};

    //==========================
    // MODO SIMPLES
    //==========================
    if (modo === 'simples') {
      estrutura.filter(col => !col.calculado).forEach(col => {
        const input = document.getElementById(col.campo);
        if (input) novoRegistro[col.campo] = input.value.trim();
      });

      // Verificação de duplicidade
      for (const col of estrutura) {
        if (col.verificarDuplicidade) {
          const querySnapshot = await getDocs(collection(db, colecao));
          const existe = querySnapshot.docs.some(docSnap => {
            const dados = docSnap.data();
            const mesmoValor = dados[col.campo] === novoRegistro[col.campo];
            const mesmoRegistro = idEditando && docSnap.id === idEditando;
            return mesmoValor && !mesmoRegistro;
          });

          if (existe) {
            mostrarAlerta(`Já existe um registro com o mesmo valor para "${col.label}".`, 'error');
            return;
          }
        }
      }
    }

    //==========================
    // MODO COMPOSTO
    //==========================
    if (modo === 'composto') {
      estrutura.forEach(secao => {
        if (secao.tipo === 'cabecalho') {
          secao.campos.forEach(campo => {
            const input = document.getElementById(campo.campo);
            if (input) novoRegistro[campo.campo] = input.value.trim();
          });
        }

        if (secao.tipo === 'tabela') {
          const secaoEl = document.getElementById(`secao-${secao.id}`);
          const linhas = secaoEl?.querySelectorAll('div.grid');
          const lista = [];

          linhas?.forEach(linha => {
            const obj = {};
            linha.querySelectorAll('input')?.forEach(input => {
              const nomeCampo = input.name.replace(`${secao.id}_`, '');
              obj[nomeCampo] = input.value.trim();
            });
            if (Object.values(obj).some(v => v !== '')) lista.push(obj);
          });

          novoRegistro[secao.id] = lista;
        }
      });
    }

    //==========================
    // SALVAMENTO FIREBASE
    //==========================
    const agora = dataHoraBR();
    if (idEditando) {
      novoRegistro.atualizadoEm = agora;
      await updateDoc(doc(db, colecao, idEditando), novoRegistro);
      mostrarAlerta('Registro atualizado com sucesso.', 'success');
    } else {
      novoRegistro.criadoEm = agora;
      novoRegistro.atualizadoEm = agora;
      await addDoc(collection(db, colecao), novoRegistro);
      mostrarAlerta('Registro criado com sucesso.', 'success');
    }

    await carregarRegistros();
    formConteudo.innerHTML = '';
    formConteudo.classList.add('hidden');
    idEditando = null;

  };


  //***************************************************************************************
  // Abre o accordion para inserção de novo cadastro
  barraFormulario?.addEventListener('click', (e) => {
    const clicouNoTexto = e.target === spanFormulario;
  
    const estavaFechado = formConteudo.classList.contains('hidden');
    formConteudo.classList.toggle('hidden');
  
    // Se estiver abrindo agora e não estiver editando nada, monta o formulário
    if (estavaFechado && !idEditando) {
      abrirFormulario(); // limpa e exibe campos
    }
  
    // Se clicou exatamente no "+ NOVO CADASTRO", sempre reinicia o formulário
    if (clicouNoTexto) {
      idEditando = null;
      abrirFormulario(); // força novo
    }
  });
  

  //***************************************************************************************
  // Controle do collapse do filtro
  document.getElementById('barraFiltro')?.addEventListener('click', (e) => {
    // Ignora se clicou no botão de limpar
    if (e.target.id === 'btnLimparFiltros') return;
  
    areaFiltros.classList.toggle('hidden');
    const span = e.currentTarget.querySelector('span');
    span.textContent = areaFiltros.classList.contains('hidden') ? 'FILTROS ▼' : 'FILTROS ▲';
  });
  

  //***************************************************************************************
  // Aplica os filtros ativos e atualiza a visualização
  const aplicarFiltros = () => {
    let dadosFiltrados = [...registros];

    //==========================
    // MODO SIMPLES
    //==========================
    if (modo === 'simples') {
      Object.entries(filtrosAtivos).forEach(([campo, valores]) => {
        if (valores.length > 0) {
          dadosFiltrados = dadosFiltrados.filter(reg => valores.includes(reg[campo]));
        }
      });
    }

    //==========================
    // MODO COMPOSTO (aplica filtros com base em campos do cabeçalho)
    //==========================
    if (modo === 'composto') {
      const camposCabecalho = estrutura
        .filter(secao => secao.tipo === 'cabecalho')
        .flatMap(secao => secao.campos.filter(f => f.filtrar).map(f => f.campo));

      Object.entries(filtrosAtivos).forEach(([campo, valores]) => {
        if (valores.length > 0 && camposCabecalho.includes(campo)) {
          dadosFiltrados = dadosFiltrados.filter(reg => valores.includes(reg[campo]));
        }
      });
    }

    // Atualiza visualização e filtros com os dados filtrados
    renderizarTabela(dadosFiltrados);
    gerarFiltros(registros);
  };
  

  //***************************************************************************************
  // Gera dinamicamente os filtros com base nos campos configurados para cada modo
  const gerarFiltros = (dados = registros) => {
    areaFiltros.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'flex flex-wrap justify-center gap-4';

    //==========================
    // MODO SIMPLES
    //==========================
    if (modo === 'simples') {
      estrutura
        .filter(f => !f.calculado && f.filtrar)
        .forEach(filtro => {
          const wrapper = document.createElement('div');
          wrapper.className = 'flex flex-col w-auto min-w-[160px]';

          const label = document.createElement('label');
          label.className = 'block text-sm font-medium mb-1 text-white uppercase';
          label.textContent = filtro.label;

          const select = document.createElement('select');
          select.className = 'px-2 py-1 h-16 text-sm rounded border border-gray-300 text-slate-700 bg-white w-full';
          select.multiple = true;

          let valoresUnicos = [...new Set(dados.map(r => r[filtro.campo]).filter(Boolean))];

          const valoresSelecionados = filtrosAtivos[filtro.campo] || [];
          valoresSelecionados.forEach(selecionado => {
            if (!valoresUnicos.includes(selecionado)) valoresUnicos.push(selecionado);
          });

          valoresUnicos.sort();

          valoresUnicos.forEach(valor => {
            const option = document.createElement('option');
            option.value = valor;
            option.textContent = valor;
            if (valoresSelecionados.includes(valor)) option.selected = true;

            option.addEventListener('mousedown', (e) => {
              e.preventDefault();
              option.selected = !option.selected;

              const selecionados = [...select.options]
                .filter(o => o.selected)
                .map(o => o.value);

              filtrosAtivos[filtro.campo] = selecionados;
              aplicarFiltros();
            });

            select.appendChild(option);
          });

          wrapper.appendChild(label);
          wrapper.appendChild(select);
          container.appendChild(wrapper);
        });
    }

    //==========================
    // MODO COMPOSTO (filtros por campos do cabeçalho)
    //==========================
    if (modo === 'composto') {
      estrutura
        .filter(secao => secao.tipo === 'cabecalho')
        .flatMap(secao => secao.campos.filter(f => f.filtrar))
        .forEach(filtro => {
          const wrapper = document.createElement('div');
          wrapper.className = 'flex flex-col w-auto min-w-[160px]';

          const label = document.createElement('label');
          label.className = 'block text-sm font-medium mb-1 text-white uppercase';
          label.textContent = filtro.label;

          const select = document.createElement('select');
          select.className = 'px-2 py-1 h-16 text-sm rounded border border-gray-300 text-slate-700 bg-white w-full';
          select.multiple = true;

          let valoresUnicos = [...new Set(dados.map(r => r[filtro.campo]).filter(Boolean))];

          const valoresSelecionados = filtrosAtivos[filtro.campo] || [];
          valoresSelecionados.forEach(selecionado => {
            if (!valoresUnicos.includes(selecionado)) valoresUnicos.push(selecionado);
          });

          valoresUnicos.sort();

          valoresUnicos.forEach(valor => {
            const option = document.createElement('option');
            option.value = valor;
            option.textContent = valor;
            if (valoresSelecionados.includes(valor)) option.selected = true;

            option.addEventListener('mousedown', (e) => {
              e.preventDefault();
              option.selected = !option.selected;

              const selecionados = [...select.options]
                .filter(o => o.selected)
                .map(o => o.value);

              filtrosAtivos[filtro.campo] = selecionados;
              aplicarFiltros();
            });

            select.appendChild(option);
          });

          wrapper.appendChild(label);
          wrapper.appendChild(select);
          container.appendChild(wrapper);
        });
    }

    areaFiltros.appendChild(container);

    if (btnLimparFiltros) {
      btnLimparFiltros.classList.remove('hidden');
      btnLimparFiltros.addEventListener('click', () => {
        Object.keys(filtrosAtivos).forEach(campo => filtrosAtivos[campo] = []);

        areaFiltros.querySelectorAll('select').forEach(sel => {
          [...sel.options].forEach(opt => (opt.selected = false));
        });

        aplicarFiltros();
      });
    }
  };


  //***************************************************************************************
  // Fechar o filtro ao clicar fora dele
  document.addEventListener('click', (e) => {
    const clicouDentroDoFiltro = filtroContainer.contains(e.target);
  
    if (!areaFiltros.classList.contains('hidden')) {
      if (!clicouDentroDoFiltro) {
        areaFiltros.classList.add('hidden');
        btnToggleFiltros.textContent = 'FILTROS ▼';
      }
    }
  });
    

  //***************************************************************************************
  // Carrega a tabela de registros atualizada
  await carregarRegistros();
  gerarFiltros();  
  //***************************************************************************************



});

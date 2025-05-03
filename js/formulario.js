// formulario.js

import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { mostrarAlerta } from './alerta.js';
import { db } from './firebaseConfig.js';

document.addEventListener('DOMContentLoaded', async () => {
  const btnNovo = document.getElementById('btnNovoRegistro');
  const formContainer = document.getElementById('formContainer');
  const btnFechar = document.getElementById('btnFecharSlide');
  const formConteudo = document.getElementById('formConteudo');
  const tabelaCorpo = document.getElementById('tabelaCorpo');
  const btnToggleFiltros = document.getElementById('btnToggleFiltros');
  const areaFiltros = document.getElementById('areaFiltros');
  const btnLimparFiltros = document.getElementById('btnLimparFiltros');

 
    
  //***************************************************************************************
  // Define campos calculados por Formulário
  const camposCalculadosPersonalizados = {
    lotes: {
      _idadeSemanas: (item) => {
        const nascimento = item.loteDataNascimento;
        if (!nascimento) return '-';
        const nasc = new Date(nascimento);
        const hoje = new Date();
        const dias = Math.floor((hoje - nasc) / (1000 * 60 * 60 * 24));
        return dias < 7 ? '1 Sem' : `${Math.ceil(dias / 7)} Sem`;
      }
    },
    // outros
  };
  
  

  //***************************************************************************************
  // Define os campos dinâmicos usados na tabela e formulário
  const configuracoesFormularios = {
    lotes: [
      { campo: 'loteStatus', label: 'Status', filtrar: true, eColuna: false },
      { campo: 'loteIdentificador', label: 'Identificador', filtrar: false, eColuna: true },
      { campo: 'loteLinhagem', label: 'Linhagem', filtrar: true, eColuna: true },
      { campo: 'loteGalpao', label: 'Galpão', tipo: 'select', opcoes: ['Pinteiro', 'Recria', '01', '02', '03', '04', '05'], filtrar: true, eColuna: true },
      { campo: 'loteProprietario', label: 'Proprietário', filtrar: true, eColuna: true },
      { campo: 'loteDataNascimento', label: 'Nascimento', tipo: 'date', filtrar: false, eColuna: true },
      { campo: '_idadeSemanas', label: 'Idade (sem)', calculado: true, eColuna: true },
      { campo: 'loteDataChegada', label: 'Chegada', tipo: 'date', filtrar: false, eColuna: true },
      { campo: 'loteQuantAves', label: 'Qtd Aves', filtrar: false, eColuna: true }
    ],
    colaboradores: [
      { campo: 'colabNome', label: 'Nome', filtrar: false, eColuna: true },
      { campo: 'colabLogin', label: 'Login', filtrar: false, eColuna: true },
      { campo: 'colabSenha', label: 'Senha', filtrar: false, eColuna: true },
      { campo: 'colabTipo', label: 'Tipo', filtrar: true, eColuna: true }
    ],
    // insumos, vacinas, etc...
  };
  
  const capitalizar = texto => texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
  const tipo = new URLSearchParams(window.location.search).get('tipo');
  const tituloPagina = tipo ? `Cadastro de ${capitalizar(tipo)}` : 'Cadastro';
  const h2Titulo = document.getElementById('tituloPagina');
  if (h2Titulo) h2Titulo.textContent = tituloPagina;
  document.title = `PosturAves - ${tituloPagina}`;


  
  const estrutura = configuracoesFormularios[tipo];
  const colecao = tipo === 'colaboradores' ? 'bdcolaboradores' : 'bd' + tipo;
  
  if (!estrutura && tipo !== 'financeiro') {
    mostrarAlerta('Tipo de formulário inválido ou não configurado.', 'error');
    return;
  }
  
  

  let registros = [];
  let idEditando = null;
  let paginaAtual = 1;
  const registrosPorPagina = 20;


  //***************************************************************************************
  // Inicia o formulário financeiro (layout básico inicial)
  const iniciarFormularioFinanceiro = (id = null) => {
    formContainer.classList.remove('hidden');
    formConteudo.innerHTML = '';

    // Cabeçalho
    const titulo = document.createElement('h3');
    titulo.textContent = id ? 'Editar Registro Financeiro' : 'Novo Registro Financeiro';
    titulo.className = 'text-lg font-semibold mb-4';
    formConteudo.appendChild(titulo);

    // Exemplo de campos iniciais
    const camposBasicos = [
      { id: 'finTipo', label: 'Tipo', tipo: 'select', opcoes: ['Compra', 'Venda'] },
      { id: 'finData', label: 'Data', tipo: 'date' },
      { id: 'finDescricao', label: 'Descrição', tipo: 'text' }
    ];

    camposBasicos.forEach(campo => {
      const div = document.createElement('div');
      div.className = 'mb-4';

      const label = document.createElement('label');
      label.textContent = campo.label;
      label.className = 'block text-sm font-medium text-gray-700 mb-1';

      let input;
      if (campo.tipo === 'select') {
        input = document.createElement('select');
        input.className = 'w-full border rounded px-3 py-2 text-sm';
        campo.opcoes.forEach(op => {
          const option = document.createElement('option');
          option.value = op;
          option.textContent = op;
          input.appendChild(option);
        });
      } else {
        input = document.createElement('input');
        input.type = campo.tipo;
        input.className = 'w-full border rounded px-3 py-2 text-sm';
      }

      input.id = campo.id;
      div.appendChild(label);
      div.appendChild(input);
      formConteudo.appendChild(div);
    });

    // Botão salvar (placeholder por enquanto)
    const btnSalvar = document.createElement('button');
    btnSalvar.textContent = 'Salvar';
    btnSalvar.className = 'bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600';
    formConteudo.appendChild(btnSalvar);
  };



  //***************************************************************************************
  // Identifica quando se tratar do formulário financeiro(Tem uma estrutura diferenciada)
  if (tipo === 'financeiro') {
    iniciarFormularioFinanceiro(); // nova função isolada
    return;
  }


  //***************************************************************************************
  // Gera dinamicamente o cabeçalho da tabela com base na estrutura
  const renderizarCabecalho = () => {
    tabelaCabecalho.innerHTML = '';
    const tr = document.createElement('tr');
  
    estrutura
      .filter(col => col.eColuna)
      .forEach(col => {
        const th = document.createElement('th');
        th.className = 'px-2 py-1 text-sm text-center uppercase whitespace-nowrap overflow-hidden text-ellipsis';

        th.textContent = col.label;
        tr.appendChild(th);
      });
  
    const thAcoes = document.createElement('th');
    thAcoes.className = 'px-4 py-2 text-center uppercase';
    thAcoes.textContent = 'Ações';
    tr.appendChild(thAcoes);
  
    tabelaCabecalho.appendChild(tr);
  };
  
  
  //***************************************************************************************
  // Busca os registros do Firebase e atualiza a tabela
  const carregarRegistros = async () => {
    registros = [];
    const snapshot = await getDocs(collection(db, colecao));
    snapshot.forEach(doc => {
      registros.push({ id: doc.id, ...doc.data() });
    });
    renderizarCabecalho();
    renderizarTabela();
  };

  
  //***************************************************************************************
  // Gera as linhas da tabela com os registros carregados
  const renderizarTabela = (dados = registros) => {

    tabelaCorpo.innerHTML = '';
    const inicio = (paginaAtual - 1) * registrosPorPagina;
    const fim = inicio + registrosPorPagina;
    const registrosPaginados = dados.slice(inicio, fim);
    registrosPaginados.forEach((item, index) => {
      const tr = document.createElement('tr');
      estrutura
      .filter(col => col.eColuna)
      .forEach(col => {
        const td = document.createElement('td');
        td.className = 'px-2 py-0.5 text-sm border-t text-center align-middle leading-tight whitespace-nowrap overflow-hidden text-ellipsis';
        //td.className = 'px-2 py-1 border-t text-center align-middle';

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

        td.textContent = valor;
        tr.appendChild(td);
      });

    
      const tdAcoes = document.createElement('td');
      //tdAcoes.className = 'px-4 py-2 border-t text-center align-middle';
      tdAcoes.className = 'px-2 py-0.5 text-sm border-t text-center align-middle leading-tight';

      const btnEditar = document.createElement('button');
      btnEditar.innerHTML = `<img src="icons/icon-edit.svg" alt="Editar" class="w-5 h-5 inline-block">`;
      btnEditar.className = 'hover:scale-125 transition-transform';
      btnEditar.title = 'Editar';
      
      btnEditar.addEventListener('click', () => {
        if (tipo === 'financeiro') {
          iniciarFormularioFinanceiro(item.id);
        } else {
          abrirFormulario(item.id);
        }
      });
      
      tdAcoes.appendChild(btnEditar);
      tr.appendChild(tdAcoes);
      tabelaCorpo.appendChild(tr);
      atualizarPaginacao(dados);


    });
  };




  //***************************************************************************************
  // Cálcula e exibe as páginas da paginação
  const atualizarPaginacao = (dados = registros) => {
    const paginacao = document.getElementById('paginacao');
    const totalPaginas = Math.ceil(registros.length / registrosPorPagina);
    paginacao.innerHTML = `
      <div class="flex justify-center items-center gap-4 mt-6 text-sm">
        <button id="btnAnterior" class="bg-blue-500 text-white px-3 py-1.5 rounded shadow disabled:opacity-50 hover:bg-blue-600">
          Anterior
        </button>
        <span class="text-slate-700">Página ${paginaAtual} de ${totalPaginas}</span>
        <button id="btnProxima" class="bg-blue-500 text-white px-3 py-1.5 rounded shadow disabled:opacity-50 hover:bg-blue-600">
          Próxima
        </button>
      </div>
    `;

  
    document.getElementById('btnAnterior')?.addEventListener('click', () => {
      if (paginaAtual > 1) {
        paginaAtual--;
        renderizarTabela();
      }
    });
  
    document.getElementById('btnProxima')?.addEventListener('click', () => {
      if (paginaAtual < totalPaginas) {
        paginaAtual++;
        renderizarTabela();
      }
    });
  };


  //***************************************************************************************
  // Cria e exibe o formulário para novo registro ou edição
  const abrirFormulario = (id = null) => {
    formContainer.classList.remove('hidden');
    formConteudo.innerHTML = '';
    idEditando = id;
  
    const registro = registros.find(r => r.id === id);
  
    estrutura
      .filter(col => !col.calculado)
      .forEach(col => {
        const div = document.createElement('div');
        div.className = 'mb-4';
  
        const label = document.createElement('label');
        label.className = 'block text-sm font-medium text-gray-700 mb-1';
        label.setAttribute('for', col.campo);
        label.textContent = col.label;
  
        let input;
        if (col.tipo === 'select') {
          input = document.createElement('select');
          input.className = 'w-full border border-gray-300 rounded px-3 py-2 text-sm';
          col.opcoes.forEach(opcao => {
            const opt = document.createElement('option');
            opt.value = opcao;
            opt.textContent = opcao;
            input.appendChild(opt);
          });
        } else {
          input = document.createElement('input');
          input.type = col.tipo === 'date' ? 'date' : 'text';
          input.className = 'w-full border border-gray-300 rounded px-3 py-2 text-sm';
        }
  
        input.id = col.campo;
        input.name = col.campo;
        input.value = registro ? registro[col.campo] : '';
        div.appendChild(label);
        div.appendChild(input);
        formConteudo.appendChild(div);
      });
  
    // Botão salvar
    const btnSalvar = document.createElement('button');
    btnSalvar.textContent = idEditando ? 'Atualizar' : 'Salvar';
    btnSalvar.className = 'bg-blue-500 text-white px-3 py-1.5 text-sm rounded hover:bg-blue-600';
    btnSalvar.addEventListener('click', salvarRegistro);
    formConteudo.appendChild(btnSalvar);
  
    // Botão excluir (se edição)
    if (idEditando) {
      const btnExcluir = document.createElement('button');
      btnExcluir.textContent = 'Excluir';
      btnExcluir.className = 'ml-4 bg-red-500 text-white px-3 py-1.5 text-sm rounded hover:bg-red-600';
  
      btnExcluir.addEventListener('click', async () => {
        const confirmacao = confirm('Tem certeza que deseja excluir este registro?');
        if (confirmacao) {
          try {
            await deleteDoc(doc(db, colecao, idEditando));
            mostrarAlerta('Registro excluído com sucesso.', 'success');
            formContainer.classList.add('hidden');
            formConteudo.innerHTML = '';
            await carregarRegistros();
          } catch (error) {
            mostrarAlerta('Erro ao excluir o registro.', 'error');
          }
        }
      });
  
      formConteudo.appendChild(btnExcluir);
    }
  };
  


  //***************************************************************************************
  // Salva novo registro ou atualiza existente no Firebase
  const salvarRegistro = async () => {
    const novoRegistro = {};
    estrutura
      .filter(col => !col.calculado)
      .forEach(col => {
        const input = document.getElementById(col.campo);
        if (input) {
          novoRegistro[col.campo] = input.value;
        }
      });


    const now = new Date().toISOString();

    if (idEditando) {
      novoRegistro.atualizadoEm = now;
      await updateDoc(doc(db, colecao, idEditando), novoRegistro);
      mostrarAlerta('Registro atualizado com sucesso.', 'success');
    } else {
      novoRegistro.criadoEm = now;
      novoRegistro.atualizadoEm = now;
      await addDoc(collection(db, colecao), novoRegistro);
      mostrarAlerta('Registro criado com sucesso.', 'success');
    }


    formContainer.classList.add('hidden');
    formConteudo.innerHTML = '';
    await carregarRegistros();
  };


  //***************************************************************************************
  // Captura o click do botão +Novo Registro
  //btnNovo?.addEventListener('click', () => {
  //  if (tipo === 'financeiro') {
  //    iniciarFormularioFinanceiro();
  //  } else {
  //    abrirFormulario();
  //  }
  //});
  
  // Fecha o formulário
  btnFechar?.addEventListener('click', () => {
    formContainer.classList.add('hidden');
    formConteudo.innerHTML = '';
  });


  //***************************************************************************************
  // Controle do collapse do filtro
  btnToggleFiltros?.addEventListener('click', (e) => {
    e.preventDefault();
    areaFiltros.classList.toggle('hidden');
    btnToggleFiltros.textContent = areaFiltros.classList.contains('hidden')
      ? 'FILTROS ▼'
      : 'FILTROS ▲';
  });


  // Armazena os valores selecionados de cada filtro visível na interface
  const filtrosAtivos = {};


  //***************************************************************************************
  // Aplica os filtros ativos sobre os registros carregados
  // Atualiza dinamicamente a tabela com os dados correspondentes
  const aplicarFiltros = () => {
    let dadosFiltrados = [...registros];

    Object.entries(filtrosAtivos).forEach(([campo, valores]) => {
      if (valores.length > 0) {
        dadosFiltrados = dadosFiltrados.filter(reg => valores.includes(reg[campo]));
      }
    });
    
  
    renderizarTabela(dadosFiltrados);
    gerarFiltros(dadosFiltrados);
  };
  

  //***************************************************************************************
  // Gera dinamicamente os filtros com base nos campos tipo 'select'
  // Insere cada filtro na área colapsável e define escutadores de mudança
  const gerarFiltros = (dados = registros) => {
    areaFiltros.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'flex flex-wrap justify-center gap-4';

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

        // Pega valores únicos dos dados filtrados
        let valoresUnicos = [...new Set(registros.map(r => r[filtro.campo]).filter(Boolean))];

        // Garante que as opções selecionadas permaneçam no dropdown
        const valoresSelecionados = filtrosAtivos[filtro.campo] || [];
        valoresSelecionados.forEach(selecionado => {
          if (!valoresUnicos.includes(selecionado)) {
            valoresUnicos.push(selecionado);
          }
        });

        valoresUnicos.sort(); // ordena alfabeticamente

        valoresUnicos.forEach(valor => {
          const option = document.createElement('option');
          option.value = valor;
          option.textContent = valor;

          // Mantém a seleção ativa
          if (valoresSelecionados.includes(valor)) {
            option.selected = true;
          }

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

    areaFiltros.appendChild(container);

    btnLimparFiltros.classList.remove('hidden');
    btnLimparFiltros.addEventListener('click', () => {
      Object.keys(filtrosAtivos).forEach(campo => filtrosAtivos[campo] = []);

      // desmarca visualmente os selects
      areaFiltros.querySelectorAll('select').forEach(sel => {
        [...sel.options].forEach(opt => (opt.selected = false));
      });

      aplicarFiltros();
    });
  };


  //***************************************************************************************
  // Fechar o filtro ao clicar fora dele
  const filtroContainer = document.getElementById('filtroContainer');
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
  // Fechar o formulário ao clicar fora dele
  formContainer?.addEventListener('click', (e) => {
    // Garante que o clique não foi dentro do formulário em si
    if (e.target === formContainer) {
      formContainer.classList.add('hidden');
      formConteudo.innerHTML = '';
    }
  });
  

  //***************************************************************************************
  // Carrega a tabela de registros atualizada
  await carregarRegistros();
  gerarFiltros();  
  

  //***************************************************************************************
  // Captura o click do botão +Novo Registro
  btnNovo?.addEventListener('click', () => {
    if (tipo === 'financeiro') {
      iniciarFormularioFinanceiro();
    } else {
      abrirFormulario();
    }
  });
});
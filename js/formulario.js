// formulario.js

import { db } from './firebaseConfig.js';
import { mostrarAlerta } from './alerta.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async () => {
  const btnNovo = document.getElementById('btnNovoRegistro');
  const btnFechar = document.getElementById('btnFecharSlide');
  const tabelaCorpo = document.getElementById('tabelaCorpo');
  const btnToggleFiltros = document.getElementById('btnToggleFiltros');
  const btnToggleFormulario = document.getElementById('btnToggleFormulario');
  const formConteudo = document.getElementById('formConteudo');
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
  // Cada objeto de campo no formulário pode conter as seguintes propriedades:
  // - campo: nome da propriedade no objeto (string obrigatória)
  // - label: rótulo visível no formulário
  // - tipo: tipo de input (ex: 'text', 'date', 'select')
  // - opcoes: array de strings para selects (usado somente se tipo === 'select')
  // - placeholder: dica exibida no input quando vazio
  // - mascara: máscara para formatação automática (usada com IMask.js)
  // - required: define se o campo é obrigatório (adiciona required no input)
  // - readOnly: impede edição do campo no formulário (readonly)
  // - min / max: valores mínimos ou máximos para campos numéricos ou datas
  // - defaultValue: valor inicial padrão ao criar novo registro
  // - descricao: texto de ajuda abaixo do campo, como observação
  // - filtrar: se o campo deve ser incluído nos filtros (true/false)
  // - eColuna: se o campo deve aparecer na tabela (true/false)
  // - calculado: se o campo não é editável e deve ser calculado a partir de outros
  const configuracoesFormularios = {
    lotes: [
      { campo: 'loteStatus', label: 'Status', filtrar: true, eColuna: false, tipo:'select', opcoes: ['ATIVO', 'INATIVO'], required: true, defaultValue: "ATIVO"},
      { campo: 'loteIdentificador', label: 'Identificador', placeholder: 'EX: AL042025', filtrar: false, eColuna: true, required: true, verificarDuplicidade: true},
      { campo: 'loteLinhagem', label: 'Linhagem', placeholder: 'Linhagem das aves', filtrar: true, eColuna: true, required: true },
      { campo: 'loteGalpao', label: 'Galpão', tipo: 'select', opcoes: ['Pinteiro', 'Recria', '01', '02', '03', '04', '05', 'GRANJA'], filtrar: true, eColuna: true, placeholder: 'Selecione o galpão...', required: true },
      { campo: 'loteProprietario', label: 'Proprietário', placeholder: 'Alex, Bruno ou Carlos?', filtrar: true, eColuna: true, required: true },
      { campo: 'loteDataNascimento', label: 'Nascimento', tipo: 'date', filtrar: false, eColuna: true, required: true,},
      { campo: '_idadeSemanas', label: 'Idade (sem)', calculado: true, eColuna: true, required: true },
      { campo: 'loteDataChegada', label: 'Chegada', tipo: 'date', filtrar: false, eColuna: true, required: true},
      { campo: 'loteQuantAves', label: 'Qtd Aves', filtrar: false, eColuna: true, required: true }
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
  
  if (!estrutura) {
    mostrarAlerta('Tipo de formulário inválido ou não configurado.', 'error');
    return;
  }
  
  // Captura o tipo e gera o título do formulário
  const spanTitulo = document.getElementById('formTituloTexto');
  if (spanTitulo) {
    spanTitulo.textContent = tipo ? `Cadastro de ${capitalizar(tipo)}` : 'Cadastro';
  }
  
  


  let registros = [];
  let idEditando = null;
  let paginaAtual = 1;
  const registrosPorPagina = 20;



  
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
    thAcoes.className = 'px-2 py-1 text-sm text-center uppercase whitespace-nowrap overflow-hidden text-ellipsis';
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
      tr.className = 'hover:bg-yellow-50 transition-colors';
      estrutura
      .filter(col => col.eColuna)
      .forEach(col => {
        const td = document.createElement('td');
        td.className = `px-2 py-1 text-sm border-t text-center align-middle leading-tight whitespace-nowrap overflow-hidden text-ellipsis`;

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
      tdAcoes.className = 'px-2 py-0.5 text-sm border-t text-center align-middle leading-tight';

      const btnEditar = document.createElement('button');
      btnEditar.innerHTML = `<img src="icons/icon-edit.svg" alt="Editar" class="w-5 h-5 inline-block">`;
      btnEditar.className = 'hover:scale-125 transition-transform';
      btnEditar.title = 'Editar';
      
      btnEditar.addEventListener('click', () => abrirFormulario(item.id));
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
  // Função que monta e exibe o formulário dinâmico de cadastro/edição
  const abrirFormulario = (id = null) => {
    // Mostra e limpa o formulário
    formConteudo.classList.remove('hidden');
    formConteudo.innerHTML = '';
    idEditando = id;
  
    // Cria o elemento <form> com grid responsivo
    const form = document.createElement('form');
    form.className = `p-4 bg-white text-slate-700 text-sm grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 uppercase`;


    formConteudo.appendChild(form);
  
    // Recupera o registro se estiver editando
    const registro = registros.find(r => r.id === id);
  
    estrutura.filter(col => !col.calculado).forEach(col => {
      const div = document.createElement('div');
  
      // Label
      const label = document.createElement('label');
      label.className = 'block text-sm font-medium text-gray-700 mb-1';
      label.setAttribute('for', col.campo);
      label.textContent = col.label;
  
      let input;
  
      if (col.tipo === 'select') {
        input = document.createElement('select');
        input.className = 'w-full border border-gray-300 rounded px-3 py-2 text-sm';
  
        // Placeholder como primeira opção
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
        input = document.createElement('input');
        input.type = col.tipo === 'date' ? 'date' : (col.tipo || 'text');
        input.className = 'w-full border border-gray-300 rounded px-3 py-2 text-sm';
  
        if (col.placeholder) input.placeholder = col.placeholder;
      }
  
      // Identidade do campo
      input.id = col.campo;
      input.name = col.campo;
  
      // Valor padrão ou do registro
      input.value = registro ? registro[col.campo] : (col.defaultValue || '');
  
      // Atributos condicionais
      if (col.min) input.min = col.min;
      if (col.max) input.max = col.max;
      if (col.mascara) IMask(input, { mask: col.mascara });
  
      // readonly ou disabled
      if (col.readOnly) {
        if (col.tipo === 'select') input.disabled = true;
        else input.readOnly = true;
      }
  
      // required (somente se editável)
      const editavel = !col.readOnly && !(col.tipo === 'select' && input.disabled);
      if (editavel && col.required) input.required = true;
  
      // Monta campo no DOM
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
  
    // Container dos botões
    const actions = document.createElement('div');
    actions.className = 'col-span-full flex justify-center gap-4 pt-4';

    // Botão salvar (submit do formulário)
    const btnSalvar = document.createElement('button');
    btnSalvar.type = 'submit';
    btnSalvar.textContent = idEditando ? 'Atualizar' : 'Salvar';
    btnSalvar.className = 'inline-flex items-center bg-blue-500 text-white px-4 py-1.5 text-sm rounded hover:bg-blue-600';
    actions.appendChild(btnSalvar);

    // Botão excluir (apenas se edição)
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
          formConteudo.innerHTML = '';
          abrirFormulario()
          formConteudo.classList.add('hidden');
        }
      });
      actions.appendChild(btnExcluir);
    }

    // Adiciona os botões ao form
    form.appendChild(actions);

    // Intercepta o submit e executa salvarRegistro()
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); // Impede envio por URL (GET)
      await salvarRegistro(); // Sua função de salvar/atualizar
    });
  };
    

  //***************************************************************************************
  // Salva novo registro ou atualiza existente no Firebase
  const salvarRegistro = async () => {
    const novoRegistro = {};
  
    estrutura.filter(col => !col.calculado).forEach(col => {
      const input = document.getElementById(col.campo);
      if (input) novoRegistro[col.campo] = input.value.trim();
    });
  
    // Verifica duplicidade para campos marcados
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
  
    const now = new Date().toISOString();
  
    if (idEditando) {
      novoRegistro.atualizadoEm = now;
      await updateDoc(doc(db, colecao, idEditando), novoRegistro);
      mostrarAlerta('Registro atualizado com sucesso.', 'success');
      formConteudo.classList.add('hidden');
    } else {
      novoRegistro.criadoEm = now;
      novoRegistro.atualizadoEm = now;
      await addDoc(collection(db, colecao), novoRegistro);
      mostrarAlerta('Registro criado com sucesso.', 'success');
      formConteudo.classList.add('hidden');
    }
  
    await carregarRegistros();
    
  };
  
  
  // Abre o accordion para inserção de novo cadastro
  btnToggleFormulario?.addEventListener('click', () => {
    console.log('Abrindo formulário...'); // teste
    formConteudo.classList.toggle('hidden');
    if (!formConteudo.classList.contains('hidden') && !idEditando) {
      abrirFormulario(); // função que insere os campos no formulário
    }
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
  // Carrega a tabela de registros atualizada
  await carregarRegistros();
  gerarFiltros();  
  
  
  //***************************************************************************************



});

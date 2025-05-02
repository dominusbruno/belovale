// formulario.js

import { db } from './firebaseConfig.js';
import { mostrarAlerta } from './alerta.js';
import { collection, getDocs, addDoc, updateDoc, doc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async () => {
  const btnNovo = document.getElementById('btnNovoRegistro');
  const formContainer = document.getElementById('formContainer');
  const btnFechar = document.getElementById('btnFecharSlide');
  const formConteudo = document.getElementById('formConteudo');
  const tabelaCorpo = document.getElementById('tabelaCorpo');
  const btnToggleFiltros = document.getElementById('btnToggleFiltros');
  const areaFiltros = document.getElementById('areaFiltros');

  
  //***************************************************************************************
  // Define os campos dinâmicos usados na tabela e formulário
  const configuracoesFormularios = {
    lotes: [
      { campo: 'loteStatus', label: 'Status' },
      { campo: 'loteIdentificador', label: 'Identificador' },
      { campo: 'loteLinhagem', label: 'Linhagem' },
      { campo: 'loteGalpao', label: 'Galpão', tipo: 'select', opcoes: ['Pinteiro', 'Recria', '01', '02', '03', '04', '05'] },
      { campo: 'loteProprietario', label: 'Proprietário' },
      { campo: 'loteDataNascimento', label: 'Nascimento', tipo: 'date' },
      { campo: '_idadeSemanas', label: 'Idade (sem)', calculado: true },
      { campo: 'loteDataChegada', label: 'Chegada', tipo: 'date' },
      { campo: 'loteQuantAves', label: 'Qtd Aves' }
    ],
    colaboradores: [
      { campo: 'colabNome', label: 'Nome' },
      { campo: 'colabLogin', label: 'Login' },
      { campo: 'colabSenha', label: 'Senha' },
      { campo: 'colabTipo', label: 'Tipo' }
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
  

  let registros = [];
  let idEditando = null;
  let paginaAtual = 1;
  const registrosPorPagina = 20;



  
  //***************************************************************************************
  // Gera dinamicamente o cabeçalho da tabela com base na estrutura
  const renderizarCabecalho = () => {
    const tabelaCabecalho = document.getElementById('tabelaCabecalho');
    tabelaCabecalho.innerHTML = '';
    const tr = document.createElement('tr');
    estrutura.forEach(col => {
      const th = document.createElement('th');
      th.className = 'px-4 py-2 text-center uppercase text-xs text-slate-600';
      th.textContent = col.label;
      tr.appendChild(th);
    });
    const thAcoes = document.createElement('th');
    thAcoes.className = 'px-4 py-2';
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
      estrutura.forEach(col => {
        const td = document.createElement('td');
        td.className = 'px-2 py-1 border-t text-center align-middle';     
        let valor = '';
        if (col.calculado && col.campo === '_idadeSemanas') {
          const nascimento = item.loteDataNascimento;
          if (nascimento) {
            const nasc = new Date(nascimento);
            const hoje = new Date();
            const dias = Math.floor((hoje - nasc) / (1000 * 60 * 60 * 24));
            valor = dias < 7 ? '1 Sem' : `${Math.ceil(dias / 7)} Sem`;
          } else {
            valor = '-';
          }
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
      tdAcoes.className = 'px-4 py-2 border-t';
      const btnEditar = document.createElement('button');
      btnEditar.textContent = 'Editar';
      btnEditar.className = 'text-blue-500 hover:underline text-sm';
      btnEditar.addEventListener('click', () => abrirFormulario(index));
      tdAcoes.appendChild(btnEditar);
      tr.appendChild(tdAcoes);
      tabelaCorpo.appendChild(tr);
      //atualizarPaginacao();
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
  const abrirFormulario = (index = null) => {
    formContainer.classList.remove('hidden');
    formConteudo.innerHTML = '';
    idEditando = index !== null ? registros[index].id : null;

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
      input.value = index !== null ? registros[index][col.campo] : '';
      div.appendChild(label);
      div.appendChild(input);
      formConteudo.appendChild(div);
    });

    const btnSalvar = document.createElement('button');
    btnSalvar.textContent = idEditando ? 'Atualizar' : 'Salvar';
    btnSalvar.className = 'bg-blue-500 text-white px-3 py-1.5 text-sm rounded hover:bg-blue-600';
    btnSalvar.addEventListener('click', salvarRegistro);
    formConteudo.appendChild(btnSalvar);

    const btnExcluir = document.createElement('button');
    if (idEditando) {
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
    estrutura.forEach(col => {
      const valor = document.getElementById(col.campo).value;
      novoRegistro[col.campo] = valor;
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
  btnNovo?.addEventListener('click', () => abrirFormulario());
  btnFechar?.addEventListener('click', () => {
    formContainer.classList.add('hidden');
    formConteudo.innerHTML = '';
  });


  //***************************************************************************************
  // Controle do collapse do filtro
  btnToggleFiltros?.addEventListener('click', () => {
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
  
    Object.entries(filtrosAtivos).forEach(([campo, valor]) => {
      if (valor !== '') {
        dadosFiltrados = dadosFiltrados.filter(reg => reg[campo] === valor);
      }
    });
  
    renderizarTabela(dadosFiltrados);
  };
  

//***************************************************************************************
// Gera dinamicamente os filtros com base nos campos tipo 'select'
// Insere cada filtro na área colapsável e define escutadores de mudança
  const gerarFiltros = () => {
    areaFiltros.innerHTML = '';
  
    estrutura.filter(f => f.tipo === 'select').forEach(filtro => {
      const wrapper = document.createElement('div');
      wrapper.className = 'mb-3';
  
      const label = document.createElement('label');
      label.className = 'block text-sm font-medium mb-1 text-slate-700';
      label.textContent = filtro.label;
  
      const select = document.createElement('select');
      select.className = 'w-full px-2 py-1 rounded border border-gray-300 text-sm';
      select.innerHTML = `<option value="">Todos</option>`;
      filtro.opcoes.forEach(op => {
        const opt = document.createElement('option');
        opt.value = op;
        opt.textContent = op;
        select.appendChild(opt);
      });
  
      select.addEventListener('change', () => {
        filtrosAtivos[filtro.campo] = select.value;
        aplicarFiltros();
      });
  
      filtrosAtivos[filtro.campo] = '';
      wrapper.appendChild(label);
      wrapper.appendChild(select);
      areaFiltros.appendChild(wrapper);
    });
  };


  //***************************************************************************************
  // Carrega a tabela de registros atualizada
  await carregarRegistros();
  gerarFiltros();  
  
});

// formcomposto.js

import { db } from './firebaseConfig.js';
import { mostrarAlerta } from './alerta.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

// Função utilitária que cria uma estrutura de input com um <label> acima.
// Recebe o texto do label e o elemento input (ou outro campo) e retorna uma <div> contendo ambos.
function criarCampoComLabel(labelTexto, inputElemento) {
  const div = document.createElement('div');
  const label = document.createElement('label');
  label.textContent = labelTexto;
  label.className = 'block text-sm font-medium text-gray-700 mb-1';
  div.appendChild(label);
  div.appendChild(inputElemento);
  return div;
}



document.addEventListener('DOMContentLoaded', async () => {
  // Estrutura básica inicial, igual ao formulario.js
  const btnNovo = document.getElementById('btnNovoRegistro');
  const formContainer = document.getElementById('formContainer');
  const btnFechar = document.getElementById('btnFecharSlide');
  const formConteudo = document.getElementById('formConteudo');
  const tabelaCorpo = document.getElementById('tabelaCorpo');
  const btnToggleFiltros = document.getElementById('btnToggleFiltros');
  const areaFiltros = document.getElementById('areaFiltros');
  const btnLimparFiltros = document.getElementById('btnLimparFiltros');

  // Setup inicial da página baseado no parâmetro ?tipo
  const capitalizar = texto => texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
  const tipo = new URLSearchParams(window.location.search).get('tipo');
  console.log('TIPO:', tipo); //Log de depuração
  const tituloPagina = tipo ? `Cadastro de ${capitalizar(tipo)}` : 'Cadastro';
  document.title = `PosturAves - ${tituloPagina}`;
  const h2Titulo = document.getElementById('tituloPagina');
  if (h2Titulo) h2Titulo.textContent = tituloPagina;

  // Verifica se o tipo está presente e se é um formulário composto conhecido
  const tiposCompostos = ['financeiro', 'producao', 'racao']; // adicionar aqui outros tipos no futuro
  console.log('É tipo composto válido?', tiposCompostos.includes(tipo)); // <--- Log de depuração
  if (!tipo || !tiposCompostos.includes(tipo)) {
    mostrarAlerta('Tipo de formulário inválido ou não configurado.', 'error');
    return;
  }
  
  const colecao = 'bd' + tipo;


  // Estado local
  let registros = [];
  let idEditando = null;
  let paginaAtual = 1;
  const registrosPorPagina = 20;

  // Função para renderizar cabeçalho da tabela (será customizado por tipo)
  const renderizarCabecalho = () => {
    const tabelaCabecalho = document.getElementById('tabelaCabecalho');
    tabelaCabecalho.innerHTML = '<tr><th class="px-2 py-2">Data</th><th class="px-2 py-2">Descrição</th><th class="px-2 py-2">Ações</th></tr>';
  };

  // Função para carregar dados
  const carregarRegistros = async () => {
    registros = [];
    const snapshot = await getDocs(collection(db, colecao));
    snapshot.forEach(doc => {
      registros.push({ id: doc.id, ...doc.data() });
      console.log('Documento carregado:', { id: doc.id, ...doc.data() });
    });
    renderizarCabecalho();
    renderizarTabela();
  };

  // Renderiza tabela com registros
  const renderizarTabela = () => {
    tabelaCorpo.innerHTML = '';
    const inicio = (paginaAtual - 1) * registrosPorPagina;
    const fim = inicio + registrosPorPagina;
    const registrosPaginados = registros.slice(inicio, fim);

    registrosPaginados.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="border px-2 py-1 text-sm text-center">${item.data || '-'}</td>
        <td class="border px-2 py-1 text-sm text-center">${item.descricao || '-'}</td>
        <td class="border px-2 py-1 text-sm text-center">
          <button class="text-blue-500 hover:underline" onclick="editarRegistro('${item.id}')">Editar</button>
        </td>
      `;
      tabelaCorpo.appendChild(tr);
    });
  };

  // Função para abrir formulário composto (ainda será definida por tipo)
  const abrirFormulario = async (id = null) => {
    formContainer.classList.remove('hidden');
    // Limpa o conteúdo anterior do formulário e cria a 1ª parte do formulário financeiro:
    // Contém os campos de dados gerais da transação: data (gerada automaticamente),
    // tipo (Receita ou Despesa), fornecedor, nota, categoria, subcategoria e observação.

    // ---------------- 1ª PARTE - INFORMAÇÕES GERAIS ---------------- //

    // Cria o contêiner principal do grupo1
    const grupo1 = document.createElement('div');
    grupo1.className = 'w-full space-y-4'; // separa visualmente as linhas

    // LINHA 1 — já existente: Data + Tipo (metade do modal)
    const linha1 = document.createElement('div');
    linha1.className = 'w-full sm:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-4';

    // Campo de Data
    const hoje = new Date();
    const data = hoje.toLocaleDateString('fr-CA');
    const campoData = document.createElement('input');
    campoData.type = 'date';
    campoData.id = 'finData';
    campoData.value = data;
    campoData.className = 'w-full border rounded px-3 py-2 text-sm';
    linha1.appendChild(criarCampoComLabel('Data', campoData));

    // Campo de Tipo
    const divTipo = document.createElement('div');
    divTipo.className = 'flex gap-4 items-center mt-4';
    ['Receita', 'Despesa'].forEach(tipo => {
      const label = document.createElement('label');
      label.className = 'flex items-center gap-2 text-sm';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'finTipo';
      input.value = tipo.toLowerCase();
      label.appendChild(input);
      label.appendChild(document.createTextNode(tipo));
      divTipo.appendChild(label);
    });
    linha1.appendChild(criarCampoComLabel('Tipo', divTipo));
    grupo1.appendChild(linha1);

    // LINHA 2 — Nota (1/4) + Fornecedor (3/4)
    const linha2 = document.createElement('div');
    linha2.className = 'grid grid-cols-1 sm:grid-cols-4 gap-4';

    const inputNota = document.createElement('input');
    inputNota.type = 'text';
    inputNota.id = 'finNota';
    inputNota.className = 'w-full border rounded px-3 py-2 text-sm';
    linha2.appendChild(criarCampoComLabel('Nota', inputNota)); // col-span-1 (1/4)

    const wrapperFornecedor = document.createElement('div');
    wrapperFornecedor.className = 'sm:col-span-3'; // 3/4 da linha
    const inputFornecedor = document.createElement('input');
    inputFornecedor.type = 'text';
    inputFornecedor.id = 'finFornecedor';
    inputFornecedor.className = 'w-full border rounded px-3 py-2 text-sm';
    wrapperFornecedor.appendChild(criarCampoComLabel('Fornecedor', inputFornecedor));
    linha2.appendChild(wrapperFornecedor);

    grupo1.appendChild(linha2);

    // LINHA 3 — Categoria (1/4), Subcategoria (1/4), Observação (2/4)
    const linha3 = document.createElement('div');
    linha3.className = 'grid grid-cols-1 sm:grid-cols-4 gap-4';

    // --- Categoria ---
    const inputCategoria = document.createElement('input');
    inputCategoria.type = 'text';
    inputCategoria.id = 'finCategoria';
    inputCategoria.setAttribute('list', 'listaCategorias'); // usa datalist
    inputCategoria.className = 'w-full border rounded px-3 py-2 text-sm';
    linha3.appendChild(criarCampoComLabel('Categoria', inputCategoria));

    // datalist da categoria
    const datalistCategoria = document.createElement('datalist');
    datalistCategoria.id = 'listaCategorias';
    document.body.appendChild(datalistCategoria); // precisa estar no body

    // --- Subcategoria ---
    const inputSubcategoria = document.createElement('input');
    inputSubcategoria.type = 'text';
    inputSubcategoria.id = 'finSubcategoria';
    inputSubcategoria.setAttribute('list', 'listaSubcategorias');
    inputSubcategoria.className = 'w-full border rounded px-3 py-2 text-sm';
    linha3.appendChild(criarCampoComLabel('Subcategoria', inputSubcategoria));

    // datalist da subcategoria
    const datalistSubcategoria = document.createElement('datalist');
    datalistSubcategoria.id = 'listaSubcategorias';
    document.body.appendChild(datalistSubcategoria);


    // Observação (ocupa metade da linha)
    const wrapperObs = document.createElement('div');
    wrapperObs.className = 'sm:col-span-2';
    const inputObs = document.createElement('input');
    inputObs.type = 'text';
    inputObs.id = 'finObs';
    inputObs.className = 'w-full border rounded px-3 py-2 text-sm';
    wrapperObs.appendChild(criarCampoComLabel('Observação', inputObs));
    linha3.appendChild(wrapperObs);

    grupo1.appendChild(linha3);

    // Adiciona tudo ao formulário
    formConteudo.appendChild(grupo1);
    await carregarCategorias();
await carregarSubcategorias();





    // ---------------- 2ª PARTE - PRODUTOS/SERVIÇOS ---------------- //

    // Cria a seção para produtos/serviços
    const grupo2 = document.createElement('div');
    grupo2.className = 'mt-8';

    // Cabeçalho da seção: título à esquerda e botão à direita
    const headerProdutos = document.createElement('div');
    headerProdutos.className = 'flex justify-between items-center mb-2';
    const tituloProdutos = document.createElement('h4');
    tituloProdutos.textContent = 'Produtos / Serviços';
    tituloProdutos.className = 'text-sm font-semibold';
    const btnAdicionarItem = document.createElement('button');
    btnAdicionarItem.textContent = '+ Adicionar Produto';
    btnAdicionarItem.className = 'bg-blue-500 text-white text-sm px-3 py-1.5 rounded hover:bg-blue-600';
    headerProdutos.appendChild(tituloProdutos);
    headerProdutos.appendChild(btnAdicionarItem);
    grupo2.appendChild(headerProdutos);

    // Tabela de itens
    const tabelaProdutos = document.createElement('table');
    tabelaProdutos.className = 'w-full text-sm border';
    tabelaProdutos.innerHTML = `
      <thead class="bg-gray-100">
        <tr>
          <th class="border px-2 py-1">Produto</th>
          <th class="border px-2 py-1">Quantidade</th>
          <th class="border px-2 py-1">Preço (R$)</th>
          <th class="border px-2 py-1">Lote</th>
          <th class="border px-2 py-1">Total (R$)</th>
          <th class="border px-2 py-1">Ações</th>
        </tr>
      </thead>
      <tbody id="tabelaItensCorpo"></tbody>
    `;

    grupo2.appendChild(tabelaProdutos);

    // Linha de total
    const linhaTotal = document.createElement('div');
    linhaTotal.className = 'text-right mt-2 text-sm font-medium';
    linhaTotal.innerHTML = `Total Geral: R$ <span id="totalGeralItens">0,00</span>`;
    grupo2.appendChild(linhaTotal);

    // Função para recalcular o total geral
    const atualizarTotalGeral = () => {
      const linhas = document.querySelectorAll('#tabelaItensCorpo tr');
      let soma = 0;
      linhas.forEach(tr => {
        const totalCelula = tr.querySelectorAll('td')[3];
        const valor = parseFloat(totalCelula.textContent.replace(',', '.')) || 0;
        soma += valor;
      });
      document.getElementById('totalGeralItens').textContent = soma.toFixed(2).replace('.', ',');
    };

    // Função para adicionar nova linha
    const adicionarLinhaProduto = () => {
      const corpo = document.getElementById('tabelaItensCorpo');
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="border px-2 py-1">
          <input type="text" class="w-full px-2 py-1 border rounded" placeholder="Produto" />
        </td>
        <td class="border px-2 py-1">
          <input type="number" class="w-full px-2 py-1 border rounded" min="0" step="0.01" placeholder="Qtd" />
        </td>
        <td class="border px-2 py-1">
          <input type="number" class="w-full px-2 py-1 border rounded" min="0" step="0.01" placeholder="Preço" />
        </td>
        <td class="border px-2 py-1">
          <select class="w-full px-2 py-1 border rounded">
            <option value="">Carregando lotes...</option>
          </select>
        </td>
        <td class="border px-2 py-1 text-center">0,00</td>
        <td class="border px-2 py-1 text-center">
          <button class="text-red-500 hover:underline">Remover</button>
        </td>
      `;

      const [produto, qtd, preco, totalCelula, btnRemover] = tr.querySelectorAll('input, td, button');

      const atualizarTotal = () => {
        const total = (parseFloat(qtd.value || 0) * parseFloat(preco.value || 0)).toFixed(2);
        totalCelula.textContent = total.replace('.', ',');
        atualizarTotalGeral();
      };

      qtd.addEventListener('input', atualizarTotal);
      preco.addEventListener('input', atualizarTotal);
      btnRemover.addEventListener('click', () => {
        tr.remove();
        atualizarTotalGeral();
      });

      corpo.appendChild(tr);
      carregarLotesAtivos(tr.querySelector('select'));
      atualizarTotal(); // Recalcula ao inserir
    };

    // Evento para adicionar produto
    btnAdicionarItem.addEventListener('click', adicionarLinhaProduto);

    // Adiciona 1 linha ao abrir o formulário
    formConteudo.appendChild(grupo2);
    adicionarLinhaProduto();




    // ---------------- 3ª PARTE - PARCELAS / PAGAMENTO ---------------- //
    const grupo3 = document.createElement('div');
    grupo3.className = 'mt-8';

    // Cabeçalho com título à esquerda e botão à direita
    const header3 = document.createElement('div');
    header3.className = 'flex justify-between items-center mb-2';

    const titulo3 = document.createElement('h4');
    titulo3.textContent = 'Pagamento / Parcelas';
    titulo3.className = 'text-base font-semibold text-slate-700';

    const btnAdicionarParcela = document.createElement('button');
    btnAdicionarParcela.textContent = '+ Adicionar Parcela';
    btnAdicionarParcela.className = 'bg-blue-500 text-white px-3 py-1.5 text-sm rounded shadow hover:bg-blue-600';
    btnAdicionarParcela.addEventListener('click', () => adicionarLinhaParcela());

    header3.appendChild(titulo3);
    header3.appendChild(btnAdicionarParcela);
    grupo3.appendChild(header3);

    // Tabela de parcelas
    const tabelaParcelas = document.createElement('table');
    tabelaParcelas.className = 'min-w-full text-sm border rounded overflow-hidden shadow';
    tabelaParcelas.innerHTML = `
      <thead class="bg-gray-200 text-slate-600">
        <tr>
          <th class="px-2 py-2">Parcela</th>
          <th class="px-2 py-2">Vencimento</th>
          <th class="px-2 py-2">Valor (R$)</th>
          <th class="px-2 py-2">Ações</th>
        </tr>
      </thead>
      <tbody id="corpoParcelas" class="bg-white"></tbody>
    `;


    grupo3.appendChild(tabelaParcelas);

    // Adiciona ao conteúdo principal do formulário
    formConteudo.appendChild(grupo3);

    // Substitui o trecho atual de criação do botão "Salvar"
const linhaSalvar = document.createElement('div');
linhaSalvar.className = 'mt-6 flex justify-center';

const btnSalvar = document.createElement('button');
btnSalvar.textContent = 'Salvar';
btnSalvar.className = 'bg-green-600 text-white px-6 py-2 rounded shadow hover:bg-green-700';

btnSalvar.addEventListener('click', async () => {
  const categoria = document.getElementById('finCategoria').value.trim();
  const subcategoria = document.getElementById('finSubcategoria').value.trim();

  const categoriasValidas = Array.from(document.getElementById('finCategoria').list.options).map(opt => opt.value.toLowerCase());
  const subcategoriasValidas = Array.from(document.getElementById('finSubcategoria').list.options).map(opt => opt.value.toLowerCase());

  // Verifica categoria
  if (categoria && !categoriasValidas.includes(categoria.toLowerCase())) {
    const inserir = confirm(`A categoria "${categoria}" não existe. Deseja cadastrá-la?`);
    if (inserir) {
      await addDoc(collection(db, 'bdcategorias'), { catNome: categoria });
      mostrarAlerta('Categoria adicionada com sucesso!', 'success');
    } else {
      mostrarAlerta('Selecione uma categoria válida para continuar.', 'error');
      return;
    }
  }

  // Verifica subcategoria
  if (subcategoria && !subcategoriasValidas.includes(subcategoria.toLowerCase())) {
    const inserir = confirm(`A subcategoria "${subcategoria}" não existe. Deseja cadastrá-la?`);
    if (inserir) {
      await addDoc(collection(db, 'bdsubcategorias'), { subCatNome: subcategoria });
      mostrarAlerta('Subcategoria adicionada com sucesso!', 'success');
    } else {
      mostrarAlerta('Selecione uma subcategoria válida para continuar.', 'error');
      return;
    }
  }

  // Aqui entra o salvamento final
  mostrarAlerta('Salvamento implementado aqui...', 'info');
});

linhaSalvar.appendChild(btnSalvar);
formConteudo.appendChild(linhaSalvar);



    // Função auxiliar: adiciona uma linha à tabela de parcelas
    function adicionarLinhaParcela(parcela = 1, vencimento = '', lote = '') {
      const tbody = document.getElementById('corpoParcelas');
      const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="border px-2 py-1 text-center">
            <input type="text" class="w-full text-sm text-center border px-2 py-1 rounded" value="${parcela}">
          </td>
          <td class="border px-2 py-1 text-center">
            <input type="date" class="w-full text-sm text-center border px-2 py-1 rounded" value="${vencimento}">
          </td>
          <td class="border px-2 py-1 text-center">
            <input type="number" class="w-full text-sm text-right border px-2 py-1 rounded" min="0" step="0.01" value="">
          </td>
          <td class="border px-2 py-1 text-center">
            <button class="text-red-500 hover:underline" onclick="this.closest('tr').remove()">Remover</button>
          </td>
        `;


      tbody.appendChild(tr);

      // Carrega os lotes ativos no dropdown
      //carregarLotesAtivos(tr.querySelector('select'), lote);
    }

    // Carrega os lotes ativos (formato Galpão(Lote), salva apenas o ID)
    // Função que carrega os lotes ativos no dropdown
    async function carregarLotesAtivos(selectElement, valorSelecionado = '') {
      try {
        const snapshot = await getDocs(collection(db, 'bdlotes'));
        const lotes = [];

        snapshot.forEach(doc => {
          const lote = doc.data();
          if (lote.loteStatus === 'ATIVO') {
            // Usa loteGalpao e loteIdentificador no formato solicitado
            lotes.push({
              id: doc.id,
              nome: `${lote.loteGalpao} (${lote.loteIdentificador})`
            });
          }
        });

        // Limpa o select e insere as opções
        selectElement.innerHTML = '<option value="">Selecione</option>';
        lotes.forEach(l => {
          const opt = document.createElement('option');
          opt.value = l.id;
          opt.textContent = l.nome;
          if (l.id === valorSelecionado) opt.selected = true;
          selectElement.appendChild(opt);
        });
      } catch (erro) {
        console.error('Erro ao carregar lotes ativos:', erro);
        mostrarAlerta('Erro ao carregar os lotes ativos.', 'error');
      }
    }

    async function carregarCategorias() {
  const lista = document.getElementById('listaCategorias');
  lista.innerHTML = '';
  const snapshot = await getDocs(collection(db, 'bdcategorias'));
  snapshot.forEach(doc => {
    const option = document.createElement('option');
    option.value = doc.data().catNome;
    lista.appendChild(option);
  });
}

async function carregarSubcategorias() {
  const lista = document.getElementById('listaSubcategorias');
  lista.innerHTML = '';
  const snapshot = await getDocs(collection(db, 'bdsubcategorias'));
  snapshot.forEach(doc => {
    const option = document.createElement('option');
    option.value = doc.data().subCatNome;
    lista.appendChild(option);
  });
}





    // Adiciona 1 parcela padrão na abertura do formulário
    const dataHoje = new Date().toLocaleDateString('fr-CA');
    adicionarLinhaParcela(1, dataHoje);


  }

  


  // Função para capturar clique no botão +Novo
  btnNovo?.addEventListener('click', () => abrirFormulario());

  // Fechar formulário
  btnFechar?.addEventListener('click', () => {
    formContainer.classList.add('hidden');
    formConteudo.innerHTML = '';
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
  


  // Carregamento inicial
  await carregarRegistros();
});

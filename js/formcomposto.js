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
  const tituloPagina = tipo ? `Cadastro de ${capitalizar(tipo)}` : 'Cadastro';
  document.title = `PosturAves - ${tituloPagina}`;
  const h2Titulo = document.getElementById('tituloPagina');
  if (h2Titulo) h2Titulo.textContent = tituloPagina;

  // Verifica se o tipo está presente e se é um formulário composto conhecido
  const tiposCompostos = ['financeiro', 'producao', 'racao']; // adicionar aqui outros tipos no futuro
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
    });
    renderizarCabecalho();
    renderizarTabela();
  };

  // Função que soma o total da nota com base nos produtos
  function calcularTotal(item) {
    if (!item.finProduto) return 0;
    return item.finProduto.reduce((soma, prod) => soma + (parseFloat(prod.quantidade) * parseFloat(prod.preco)), 0);
  }

  //Função para formatar data BR
  function formatarDataBR(dataStr) {
    if (!dataStr) return '—';
    const data = new Date(dataStr);
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = String(data.getFullYear()); // apenas os dois últimos dígitos
    return `${dia}/${mes}/${ano}`;
  }


  // Renderiza registros em cards (se for tipo financeiro)
  const renderizarTabela = () => {
    // Limpa a área da tabela (mantendo o contêiner fixo)
    tabelaCorpo.innerHTML = '';
    const tabelaCabecalho = document.getElementById('tabelaCabecalho');
    tabelaCabecalho.innerHTML = '';

    // Se for tipo financeiro, renderiza cards
    if (tipo === 'financeiro') {
      // Oculta a tabela
      document.querySelector('table').classList.add('hidden');

      // Cria ou seleciona a div dos cards
      let lista = document.getElementById('listaFinanceiros');
      if (!lista) {
        lista = document.createElement('div');
        lista.id = 'listaFinanceiros';
        lista.className = 'p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4';
        document.querySelector('main').appendChild(lista);
      } else {
        lista.innerHTML = ''; // limpa se já existe
      }

      const inicio = (paginaAtual - 1) * registrosPorPagina;
      const fim = inicio + registrosPorPagina;
      const registrosPaginados = registros.slice(inicio, fim);

      registrosPaginados.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card-financeiro bg-white border rounded-md shadow-sm text-sm text-gray-800 p-3 space-y-2';

        // Botão editar no canto superior direito
        const btnEditar = document.createElement('button');
        btnEditar.className = 'absolute top-0.5 right-0.5 p-1 hover:scale-110 transition-transform';
        btnEditar.innerHTML = `
          <img src="icons/icon-edit.svg" alt="Editar" class="w-8 h-8">
        `;
        btnEditar.addEventListener('click', () => {
          abrirFormulario(item); // função definida no próprio formcomposto.js
        });


        // Adiciona posição relativa ao card para o botão funcionar
        card.classList.add('relative');
        card.appendChild(btnEditar);


        // LINHA 1 — Cabeçalho
        const linha1 = document.createElement('div');
        linha1.className = 'flex justify-between items-center font-semibold border-b pb-1';
        linha1.innerHTML = `
          <span class="whitespace-nowrap overflow-hidden text-ellipsis block max-w-[120px]">${formatarDataBR(item.finData)}</span>
          <span class="whitespace-nowrap overflow-hidden text-ellipsis block">${item.finFornecedor || '—'} (${item.finNota || '—'})</span>
          <span class="whitespace-nowrap overflow-hidden text-ellipsis block mr-10 max-w-[120px] text-green-600">R$ ${calcularTotal(item).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
        `;

        // LINHA 2 — Produtos (tabela horizontal)
        const linha2 = document.createElement('div');
        linha2.innerHTML = `
          <div class="mt-1 mb-1 font-semibold uppercase text-xs">Item</div>
          <div class="grid grid-cols-5 gap-y-0 gap-x-2 text-[11px] ml-3">
            <div class="font-semibold uppercase">Produto</div>
            <div class="font-semibold uppercase text-center">Quant</div>
            <div class="font-semibold uppercase text-center">Preço</div>
            <div class="font-semibold uppercase text-center">Total</div>
            <div class="font-semibold uppercase text-center">Lote</div>
            ${(item.finProduto || []).map(p => `
              <div class="whitespace-nowrap overflow-hidden text-ellipsis block max-w-[120px]">${p.nome}</div>
              <div class="text-center whitespace-nowrap overflow-hidden text-ellipsis block max-w-[120px]">${p.quantidade}</div>
              <div class="text-center whitespace-nowrap overflow-hidden text-ellipsis block max-w-[120px]">R$ ${parseFloat(p.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits:2 })}</div>
              <div class="text-center whitespace-nowrap overflow-hidden text-ellipsis block max-w-[120px]">R$ ${(p.quantidade * p.preco).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2})}</div>
              <div class="text-center whitespace-nowrap overflow-hidden text-ellipsis block max-w-[120px]">${p.lote || '—'}</div>
            `).join('')}
          </div>
        `;

        // LINHA 3 — Parcelas
        const linha3 = document.createElement('div');
        linha3.innerHTML = `
          <div class="mt-5 mb-1 font-semibold uppercase text-xs">Vencimentos</div>
          <div class="grid grid-cols-4 gap-y-0 gap-x-2 text-[11px] ml-3">
            <div class="font-semibold uppercase text-center">Parcela</div>
            <div class="font-semibold uppercase text-center">Data</div>
            <div class="font-semibold uppercase text-center">Valor</div>
            <div class="font-semibold uppercase text-center">Status</div>
            ${(item.finParcelas || []).map(p => `
              <div class="text-center whitespace-nowrap overflow-hidden text-ellipsis">${p.parcela}ª</div>
              <div class="text-center whitespace-nowrap overflow-hidden text-ellipsis">${formatarDataBR(p.vencimento).slice(0, 5)}</div>
              <div class="text-center whitespace-nowrap overflow-hidden text-ellipsis">R$ ${parseFloat(p.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2})}</div>
              <div class="text-center whitespace-nowrap overflow-hidden text-ellipsisfont-semibold ${p.status === 'pago' ? 'text-green-600' : 'text-red-600'}">${p.status.toUpperCase()}</div>
            `).join('')}
          </div>
        `;

        // LINHA 4 — Observação (se houver)
        const linha4 = document.createElement('div');
        if (item.finObservacao) {
          linha4.innerHTML = `<div class="mt-2 text-xs text-gray-600"><span class="font-semibold">Obs:</span> ${item.finObservacao}</div>`;
        }

        // Adiciona tudo ao card
        card.appendChild(linha1);
        card.appendChild(linha2);
        card.appendChild(linha3);
        if (item.finObservacao) card.appendChild(linha4);

        // Adiciona ao container
        lista.appendChild(card);
      });


    } else {
      // Exibe a tabela normalmente para outros tipos
      document.querySelector('table').classList.remove('hidden');
      renderizarCabecalho();
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
    }
  };














  // Função para abrir formulário composto (ainda será definida por tipo)
  const abrirFormulario = async (dados = null) => {
    formContainer.classList.remove('hidden');
    // Limpa o conteúdo anterior do formulário e cria a 1ª parte do formulário financeiro:
    // Contém os campos de dados gerais da transação: data (gerada automaticamente),
    // tipo (Receita ou Despesa), fornecedor, nota, categoria, subcategoria e observação.

    // ---------------- 1ª PARTE - INFORMAÇÕES GERAIS ---------------- //

    // Cria o contêiner principal do grupo1
    const grupo1 = document.createElement('div');
    grupo1.className = 'w-full space-y-4 uppercase'; // separa visualmente as linhas

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
      if (tipo === 'Despesa') input.checked = true; // <-- Esta linha define o padrão
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
    wrapperFornecedor.className = 'sm:col-span-3';
    const inputFornecedor = document.createElement('input');
    inputFornecedor.type = 'text';
    inputFornecedor.id = 'finFornecedor';
    inputFornecedor.className = 'w-full border rounded px-3 py-2 text-sm';
    inputFornecedor.setAttribute('list', 'listaFornecedores'); // conecta o input ao datalist
    const datalistFornecedor = document.createElement('datalist');
    datalistFornecedor.id = 'listaFornecedores';
    document.body.appendChild(datalistFornecedor); // precisa estar fora do formulário para funcionar corretamente
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
    headerProdutos.className = 'flex justify-between items-center mb-2 uppercase';
    
    const tituloProdutos = document.createElement('h4');
    tituloProdutos.textContent = 'Itens';
    tituloProdutos.className = 'text-sm font-semibold';

    const btnAdicionarItem = document.createElement('button');
    btnAdicionarItem.textContent = '+Produto';
    btnAdicionarItem.className = 'bg-blue-500 text-white text-sm px-3 py-1.5 rounded hover:bg-blue-600';
    headerProdutos.appendChild(tituloProdutos);
    headerProdutos.appendChild(btnAdicionarItem);
    grupo2.appendChild(headerProdutos);

    // Tabela de itens
    const tabelaProdutos = document.createElement('table');
    tabelaProdutos.className = 'w-full text-sm border ';
    tabelaProdutos.innerHTML = `
      <thead>
        <tr class="grid grid-cols-10 gap-1 bg-gray-100 text-sm text-center uppercase">
          <th class="col-span-3 px-2 py-1">Produto</th>
          <th class="col-span-1 px-2 py-1">Qtd</th>
          <th class="col-span-1 px-2 py-1">Preço</th>
          <th class="col-span-2 px-2 py-1">Total</th>
          <th class="col-span-2 px-2 py-1">Lote</th>
          <th class="col-span-1 px-2 py-1 text-center">Ações</th>
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
        const totalCelula = tr.querySelectorAll('td')[3]; // coluna TOTAL
        const texto = totalCelula.textContent.replace(/[^\d,-]/g, '').replace(',', '.'); // limpa R$ e converte para número
        soma += parseFloat(texto) || 0;
      });
      document.getElementById('totalGeralItens').textContent = formatarReal(soma); // mostra total formatado
    };


    // Função para adicionar nova linha
    const adicionarLinhaProduto = () => {
      const corpo = document.getElementById('tabelaItensCorpo');
      const tr = document.createElement('tr');
      tr.className = 'grid grid-cols-10 gap-1 items-center m-1'; // define 10 colunas

      tr.innerHTML = `
        <td class="col-span-3">
          <input type="text" list="listaProdutos" placeholder="Produto" class="w-full border rounded px-2 py-1 text-sm" />
        </td>
        <td class="col-span-1"><input type="number" min="0" step="0.01" placeholder="Qtd" class="w-full border rounded px-2 py-1 text-sm text-right" /></td>
        <td class="col-span-1"><input type="number" min="0" step="0.01" placeholder="Preço" class="w-full border rounded px-2 py-1 text-sm text-right" /></td>
        <td class="col-span-2 border rounded text-right text-sm pt-1">0,00</td>
        <td class="col-span-2">
          <select class="w-full border rounded px-2 py-1 text-sm">
            <option value="">Carregando lotes...</option>
          </select>
        </td>
        <td class="col-span-1 text-center">
          <img src="./icons/icon-cancel.svg" alt="Remover" class="w-5 h-5 mx-auto cursor-pointer hover:scale-110 transition" />
        </td>
      `;


      const inputProduto = tr.querySelectorAll('input')[0];          // Produto (texto)
      const inputQtd = tr.querySelectorAll('input')[1];              // Quantidade (número)
      const inputPreco = tr.querySelectorAll('input')[2];            // Preço (número)
      const totalCelula = tr.children[3];                            // Total (célula de texto)
      const selectLote = tr.querySelector('select');                 // Lote (select)
      const btnRemover = tr.querySelector('img');                    // Botão de remover



      const atualizarTotal = () => {
        const total = parseFloat(inputQtd.value || 0) * parseFloat(inputPreco.value || 0);
        totalCelula.textContent = formatarReal(total);
        atualizarTotalGeral();
      };

      inputQtd.addEventListener('input', atualizarTotal);
      inputPreco.addEventListener('input', atualizarTotal);
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
    // Criação do datalist de produtos (uma única vez)
    const datalistProdutos = document.createElement('datalist');
    datalistProdutos.id = 'listaProdutos';
    document.body.appendChild(datalistProdutos);
    await carregarProdutos();





    // ---------------- 3ª PARTE - PARCELAS / PAGAMENTO ---------------- //
    const grupo3 = document.createElement('div');
    grupo3.className = 'mt-8 max-w-2xl mx-auto';

    // Cabeçalho com título à esquerda e botão à direita
    const header3 = document.createElement('div');
    header3.className = 'flex justify-between items-center mb-2 uppercase';

    const titulo3 = document.createElement('h4');
    titulo3.textContent = 'Pagamentos';
    titulo3.className = 'text-sm font-semibold text-slate-700 uppercase';

    const btnAdicionarParcela = document.createElement('button');
    btnAdicionarParcela.textContent = '+Parcela';
    btnAdicionarParcela.className = 'bg-blue-500 text-white px-3 py-1.5 text-sm rounded shadow hover:bg-blue-600';
    btnAdicionarParcela.addEventListener('click', () => adicionarLinhaParcela());

    header3.appendChild(titulo3);
    header3.appendChild(btnAdicionarParcela);
    grupo3.appendChild(header3);

    // Tabela de parcelas
    const tabelaParcelas = document.createElement('div');
    tabelaParcelas.className = 'w-full text-sm border ';

    // Cabeçalho customizado com grid
    const cabecalhoParcelas = document.createElement('div');
    cabecalhoParcelas.className = 'grid grid-cols-6 gap-1 bg-gray-100 text-sm text-center font-semibold uppercase px-2 py-1 rounded';
    cabecalhoParcelas.innerHTML = `
      <div class="col-span-1">Parcela</div>
      <div class="col-span-2">Vencimento</div>
      <div class="col-span-1">Valor (R$)</div>
      <div class="col-span-1">Status</div>
      <div class="col-span-1">Ações</div>
      <div class="col-span-4"></div>
    `;



    // Corpo onde as parcelas serão adicionadas
    const corpoParcelas = document.createElement('div');
    corpoParcelas.id = 'corpoParcelas';
    corpoParcelas.className = 'grid gap-1';

    tabelaParcelas.appendChild(cabecalhoParcelas);
    tabelaParcelas.appendChild(corpoParcelas);
    grupo3.appendChild(header3);
    grupo3.appendChild(tabelaParcelas);
    formConteudo.appendChild(grupo3);


    // Substitui o trecho atual de criação do botão "Salvar"
    const linhaSalvar = document.createElement('div');
    linhaSalvar.className = 'mt-6 flex justify-center';

    const btnSalvar = document.createElement('button');
    btnSalvar.textContent = 'Salvar';
    btnSalvar.className = 'bg-green-600 text-white text-sm px-5 py-1.5 rounded shadow hover:bg-green-700';

    btnSalvar.addEventListener('click', async () => {
      const categoria = document.getElementById('finCategoria').value.trim();
      const subcategoria = document.getElementById('finSubcategoria').value.trim();
      const fornecedor = document.getElementById('finFornecedor').value.trim();
      const fornecedoresValidos = Array.from(document.getElementById('listaFornecedores').options).map(opt => opt.value.toLowerCase());
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

      // Verifica Fornecedores
      if (fornecedor && !fornecedoresValidos.includes(fornecedor.toLowerCase())) {
        const inserir = confirm(`O fornecedor "${fornecedor}" não existe. Deseja cadastrá-lo?`);
        if (inserir) {
          await addDoc(collection(db, 'bdfornecedores'), { forNome: fornecedor });
          mostrarAlerta('Fornecedor adicionado com sucesso!', 'success');
        } else {
          mostrarAlerta('Selecione um fornecedor válido para continuar.', 'error');
          return;
        }
      }

      // Verifica se algum tipo foi selecionado
      const tipoSelecionado = document.querySelector('input[name="finTipo"]:checked');
      if (!tipoSelecionado) {
        mostrarAlerta('Selecione o tipo: Receita ou Despesa.', 'error');
        return;
      }


      try {
        const dados = {
          finData: document.getElementById('finData')?.value || '',
          finNota: document.getElementById('finNota')?.value || '',
          finFornecedor: document.getElementById('finFornecedor')?.value || '',
          finCategoria: categoria,
          finSubCategoria: subcategoria,
          finObservacao: document.getElementById('finObs')?.value || '',
          finTipo: tipoSelecionado.value,

        };

        // Captura os produtos da tabela
        const produtos = [];
        const linhasProdutos = document.querySelectorAll('#tabelaItensCorpo tr');
        linhasProdutos.forEach(tr => {
          const inputs = tr.querySelectorAll('input, select');
          const nome = inputs[0]?.value || '';
          const quantidade = parseFloat(inputs[1]?.value || 0);
          const preco = parseFloat(inputs[2]?.value || 0);
          const selectLote = tr.querySelector('select');
          const optionSelecionada = selectLote?.options[selectLote.selectedIndex];
          const loteTexto = optionSelecionada?.textContent || '';
          const loteIdentificador = loteTexto.split('(')[1]?.replace(')', '') || '';

          if (nome) {
            produtos.push({ nome, quantidade, preco, lote: loteIdentificador });
          }

        });

        dados.finProduto = produtos;

        // Captura as parcelas existentes
        const parcelas = [];
        const linhasParcelas = document.querySelectorAll('#corpoParcelas > div.grid');

        const todasParcelasVazias = [...linhasParcelas].every(div => {
          const valorInput = div.querySelector('input[type="number"]');
          return !valorInput || !valorInput.value || parseFloat(valorInput.value) <= 0;
        });

        if (todasParcelasVazias) {
          const hoje = new Date().toISOString().split('T')[0];
          const totalProdutos = produtos.reduce((soma, item) => soma + (item.quantidade * item.preco), 0);
          parcelas.push({
            parcela: '1',
            vencimento: hoje,
            valor: parseFloat(totalProdutos.toFixed(2)),
            status: 'pago'
          });
        } else {
          linhasParcelas.forEach(div => {
            const inputs = div.querySelectorAll('input');
            const select = div.querySelector('select');
            if (inputs.length < 3 || !select) return;

            const parcela = inputs[0]?.value?.trim();
            const vencimento = inputs[1]?.value;
            const valor = parseFloat(inputs[2]?.value || 0);
            const status = select?.value || 'pendente';

            if (parcela && vencimento && valor > 0) {
              parcelas.push({ parcela, vencimento, valor, status });
            }
          });
        }

        
        dados.finParcelas = parcelas;
        const idRegistro = formConteudo.dataset.idRegistro;
        if (idRegistro) {
          const ref = doc(db, 'bdfinanceiro', idRegistro);
          await updateDoc(ref, dados);
        } else {
          await addDoc(collection(db, 'bdfinanceiro'), dados);
        }

        mostrarAlerta('Registro salvo com sucesso!', 'success');

        // Fecha o modal e limpa
        formContainer.classList.add('hidden');
        formConteudo.innerHTML = '';

        await carregarRegistros();
      } catch (erro) {
        console.error('Erro ao salvar:', erro);
        mostrarAlerta('Erro ao salvar o registro.', 'error');
      }

    });

    linhaSalvar.appendChild(btnSalvar);
    formConteudo.appendChild(linhaSalvar);



    // Função auxiliar: adiciona uma linha à tabela de parcelas
    function adicionarLinhaParcela(parcela = 1, vencimento = '') {
      const tbody = document.getElementById('corpoParcelas');

      const linha = document.createElement('div');
      linha.className = 'grid grid-cols-6 gap-1 items-center m-1';

      linha.innerHTML = `
        <div class="col-span-1">
          <input type="text" class="w-full text-sm text-center border px-2 py-1 rounded" value="${parcela}">
        </div>
        <div class="col-span-2">
          <input type="date" class="w-full text-sm text-center border px-2 py-1 rounded" value="${vencimento}">
        </div>
        <div class="col-span-1">
          <input type="number" class="w-full text-sm text-right border px-2 py-1 rounded" min="0" step="0.01" value="">
        </div>
        <div class="col-span-1">
          <select class="w-full text-sm border px-2 py-1 rounded">
            <option value="pendente" selected>PENDENTE</option>
            <option value="pago">PAGO</option>
          </select>
        </div>
        <div class="col-span-1 text-center">
          <img src="./icons/icon-cancel.svg" alt="Remover" class="w-5 h-5 mx-auto cursor-pointer hover:scale-110 transition" />
        </div>
        <div class="col-span-4"></div>
      `;

      // Adiciona funcionalidade ao botão de remover
      const btnRemover = linha.querySelector('img');
      btnRemover.addEventListener('click', () => linha.remove());

      tbody.appendChild(linha);
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
            // Agora usa apenas o identificador do lote
            lotes.push(lote.loteIdentificador);
          }
        });

        // Limpa o select
        selectElement.innerHTML = '<option value="">Selecione</option>';

        // Cria as opções com base apenas no identificador
        lotes.forEach(identificador => {
          const opt = document.createElement('option');
          opt.value = identificador;
          opt.textContent = identificador;

          // Faz a seleção se o valor bater
          if (identificador === valorSelecionado) opt.selected = true;

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

    async function carregarFornecedores() {
      const datalist = document.getElementById('listaFornecedores');
      if (!datalist) return;

      datalist.innerHTML = ''; // limpa

      const snapshot = await getDocs(collection(db, 'bdfornecedores'));
      snapshot.forEach(doc => {
        const nome = doc.data().forNome;
        const option = document.createElement('option');
        option.value = nome;
        datalist.appendChild(option);
      });
    }

    if (dados) {
      // Preenche campos principais
      formConteudo.dataset.idRegistro = dados.id || '';
      document.getElementById('finData').value = new Date(dados.finData).toISOString().split('T')[0];
      document.getElementById('finNota').value = dados.finNota || '';
      document.getElementById('finFornecedor').value = dados.finFornecedor || '';
      document.getElementById('finCategoria').value = dados.finCategoria || '';
      document.getElementById('finSubcategoria').value = dados.finSubCategoria || '';
      document.getElementById('finObs').value = dados.finObservacao || '';

      const tipo = dados.finTipo?.toLowerCase();
      if (tipo === 'receita' || tipo === 'despesa') {
        const inputTipo = document.querySelector(`input[name="finTipo"][value="${tipo}"]`);
        if (inputTipo) inputTipo.checked = true;
      }

      // Preenche produtos
      const produtos = dados.finProduto || [];
      const corpoProdutos = document.getElementById('tabelaItensCorpo');
      corpoProdutos.innerHTML = ''; // limpa as linhas padrão

      for (const p of produtos) {
        adicionarLinhaProduto(); // cria linha
        const linha = corpoProdutos.lastElementChild;
        const inputs = linha.querySelectorAll('input, select');
        if (inputs.length >= 3) {
          inputs[0].value = p.nome || '';
          inputs[1].value = p.quantidade || '';
          inputs[2].value = p.preco || '';
          const totalCelula = linha.children[3]; // célula do total
          const total = (p.quantidade || 0) * (p.preco || 0);
          totalCelula.textContent = formatarReal(total);

        }
        await carregarLotesAtivos(inputs[3], p.lote); // seleciona o lote correspondente
      }

      // Preenche parcelas
      const parcelas = dados.finParcelas || [];
      const corpoParcelas = document.getElementById('corpoParcelas');
      corpoParcelas.innerHTML = '';

      parcelas.forEach((parcelaObj, i) => {
        adicionarLinhaParcela(parcelaObj.parcela, parcelaObj.vencimento);
        const linha = corpoParcelas.lastElementChild;
        const inputs = linha.querySelectorAll('input');
        const select = linha.querySelector('select');

        if (inputs.length >= 3) {
          inputs[0].value = parcelaObj.parcela;
          inputs[1].value = parcelaObj.vencimento;
          inputs[2].value = parcelaObj.valor;
          select.value = parcelaObj.status || 'pendente';
        }
      });
    }


    async function carregarProdutos() {
      const lista = document.getElementById('listaProdutos');
      if (!lista) return;

      lista.innerHTML = '';
      const snapshot = await getDocs(collection(db, 'bdprodutos'));
      snapshot.forEach(doc => {
        const option = document.createElement('option');
        option.value = doc.data().prodNome;
        lista.appendChild(option);
      });
    }



    // Adiciona 1 parcela padrão na abertura do formulário
    const dataHoje = new Date().toLocaleDateString('fr-CA');
    if (!dados) {
      adicionarLinhaParcela(1, dataHoje);
    }

    
    await carregarFornecedores();


  }

  // Função Converter o visual em R$
  function formatarReal(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
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

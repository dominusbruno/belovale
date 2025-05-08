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
  const tituloPagina = tipo ? `Cadastro ${capitalizar(tipo)}` : 'Cadastro';
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
  let registrosOriginais = [];
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
    registrosOriginais = [...registros]; // salva cópia original
    renderizarCabecalho();
    renderizarTabela();
  };

  // Função que soma o total da nota com base nos produtos
  function calcularTotal(item) {
    if (!item.finProduto) return 0;
    return item.finProduto.reduce((soma, prod) => soma + (parseFloat(prod.quantidade) * parseFloat(prod.preco)), 0);
  }

  //Função para formatar data BR
  function formatarDataBR(data) {
    if (!data) return '';

    // Se for string ISO (ex: "2025-05-07"), transforma manualmente
    if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}/.test(data)) {
      const [ano, mes, dia] = data.split('T')[0].split('-');
      return `${dia}/${mes}/${ano}`;
    }

    // Se já for Date
    const objData = new Date(data);
    return objData.toLocaleDateString('pt-BR');
  }

  // Renderiza registros em cards (se for tipo financeiro)
  const renderizarTabela = () => {
    // Limpa a área da tabela (mantendo o contêiner fixo)
    tabelaCorpo.innerHTML = '';
    const tabelaCabecalho = document.getElementById('tabelaCabecalho');
    tabelaCabecalho.innerHTML = '';

    // Ordena os registros do mais recente para o mais antigo com base em finData
    registros.sort((a, b) => new Date(b.finData) - new Date(a.finData));


    
    if (tipo === 'financeiro') {
      document.querySelector('table').classList.remove('hidden');

      const tabelaCabecalho = document.getElementById('tabelaCabecalho');
      tabelaCabecalho.innerHTML = `
        <tr class="bg-gray-200 text-gray-700 text-sm uppercase leading-tight">
            <th class="px-2 py-1 text-center">Data</th>
            <th class="px-2 py-1 text-center">Nota</th>
            <th class="px-2 py-1 text-left">Fornecedor</th>
            <th class="px-2 py-1 text-center">Total</th>
            <th class="px-2 py-1 text-center">Tipo</th>
            <th class="px-2 py-1 text-center">Próx. Parcela</th>
            <th class="px-2 py-1 text-center">Status</th>
        </tr>
      `;

      const inicio = (paginaAtual - 1) * registrosPorPagina;
      const fim = inicio + registrosPorPagina;
      const registrosPaginados = registros.slice(inicio, fim);

      const tabelaCorpo = document.getElementById('tabelaCorpo');
      tabelaCorpo.innerHTML = '';

      registrosPaginados.forEach((item) => {
        const total = calcularTotal(item);
        const statusGeral = definirStatusGeral(item.finParcelas || []);

        const trResumo = document.createElement('tr');
        trResumo.className = 'hover:bg-gray-300 border-b cursor-pointer whitespace-nowrap text-sm';
        trResumo.innerHTML = `
          <td class="py-0.5 text-center w-20">${formatarDataBR(item.finData).slice(0,5)}</td>
          <td class="py-0.5 text-center w-32">${item.finNota || '—'}</td>
          <td class="py-0.5 text-left">${item.finFornecedor || '—'}</td>
          <td class="py-0.5 text-center w-32 ${item.finTipo?.toUpperCase() === 'RECEITA' ? 'text-green-700' : 'text-red-700'}">R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          <td class="py-0.5 text-center w-32 ${item.finTipo?.toUpperCase() === 'RECEITA' ? 'text-green-700' : 'text-red-700'}">${item.finTipo?.toUpperCase()}</td>
          <td class="py-0.5 text-center w-36 ${statusGeral === 'ATRASADO' ? 'text-red-700' : ''}">${obterProximaParcela(item.finParcelas)}</td>
          <td class="py-0.5 text-center w-24 ${
                                                      statusGeral === 'PAGO' ? 'bg-green-500 text-white' :
                                                      statusGeral === 'ATRASADO' ? 'bg-red-500 text-white' :
                                                      statusGeral === 'HOJE' ? 'bg-yellow-500 text-white' :
                                                      'bg-gray-400 text-white'
                                                    }">${statusGeral}</td>
        `;


        const trDetalhes = document.createElement('tr');
        trDetalhes.className = 'hidden bg-gray-50';
        const td = document.createElement('td');
        td.colSpan = 7;
        td.className = 'p-4';
        td.innerHTML = gerarDetalhesProdutosEParcelasLadoALado(item);
        trDetalhes.appendChild(td);

// Evento para abrir/fechar detalhes
  trResumo.addEventListener('click', () => {
    const aberto = trDetalhes.classList.toggle('hidden');

    // Troca a cor de fundo conforme o estado aberto/fechado
    if (!aberto) {
      trResumo.classList.add('bg-gray-300');
      trResumo.classList.remove('hover:bg-gray-300');
    } else {
      trResumo.classList.remove('bg-gray-300');
      trResumo.classList.add('hover:bg-gray-300');
    }
  });

  tabelaCorpo.appendChild(trResumo);
  tabelaCorpo.appendChild(trDetalhes);
});
    }



  };
  
  // Função que define próximo pagamento/vencido
  function obterProximaParcela(parcelas) {
    if (!parcelas || parcelas.length === 0) return '—';

    const hoje = new Date().toISOString().split('T')[0];

    // Filtra apenas parcelas não pagas
    const pendentes = parcelas.filter(p => p.status !== 'pago');

    if (pendentes.length === 0) return '—';

    // Ordena por vencimento (mais antiga primeiro)
    pendentes.sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));

    const proxima = pendentes[0];
    return `${proxima.parcela}ª - ${formatarDataBR(proxima.vencimento)}`;
  }

  //Função que gera a tabela dentro do resumo/lista de registros
  function gerarDetalhesProdutosEParcelasLadoALado(dados) {
    const produtos = dados.finProduto?.map(p => `
      <tr>
        <td>${p.nome}</td>
        <td class="text-center">${p.quantidade}</td>
        <td class="text-center">${formatarReal(p.preco)}</td>
        <td class="text-center">${formatarReal(p.preco * p.quantidade)}</td>
        <td class="text-center">${p.lote || '-'}</td>
      </tr>
    `).join('') || '';

    const parcelas = dados.finParcelas?.map(p => `
      <tr class="${p.status === 'pago' ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}">
        <td>${p.parcela}ª</td>
        <td>${formatarDataBR(p.vencimento).slice(0,5)}</td>
        <td>${formatarReal(p.valor)}</td>
        <td>${p.status.toUpperCase()}</td>
      </tr>
    `).join('') || '';

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-gray-700 leading-tight">
        
        <div>
          <h4 class="mb-1 font-semibold text-gray-800">ITENS/SERVIÇOS</h4>
          <table class="w-full border">
            <thead class="bg-gray-100 text-center uppercase">
              <tr><th>Produto</th><th>Qtd</th><th>Preço</th><th>Total</th><th>Lote</th></tr>
            </thead>
            <tbody class="text-center whitespace-nowrap overflow-hidden text-ellipsis w-24">${produtos}</tbody>
          </table>
        </div>

        <div>
          <h4 class="mb-1 font-semibold text-gray-800">PARCELAS</h4>
          <table class="w-full border">
            <thead class="bg-gray-100 text-center uppercase">
              <tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr>
            </thead>
            <tbody class="text-center">${parcelas}</tbody>
          </table>
        </div>

            <div class="mt-2 col-span-2 text-center">
          <button onclick='abrirFormulario(${JSON.stringify(dados)})'
            class="bg-blue-500 text-white text-sm px-4 py-1.5 rounded shadow hover:bg-blue-600 transition">
            Editar Registro
          </button>
        </div>
      </div>
    `;
  }

  //Função de define o status geral do registro
  function definirStatusGeral(parcelas) {
    if (parcelas.length === 0) return '—';

    const hoje = new Date();
    const [anoH, mesH, diaH] = [hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate()];

    const todasPagas = parcelas.every(p => p.status === 'pago');
    if (todasPagas) return 'PAGO';

    const algumaAtrasada = parcelas.some(p => {
      if (p.status === 'pago') return false;
      const [ano, mes, dia] = p.vencimento.split('T')[0].split('-').map(Number);
      return (
        ano < anoH ||
        (ano === anoH && mes < mesH) ||
        (ano === anoH && mes === mesH && dia < diaH)
      );
    });

    if (algumaAtrasada) return 'ATRASADO';

    const algumaVenceHoje = parcelas.some(p => {
      if (p.status === 'pago') return false;
      const [ano, mes, dia] = p.vencimento.split('T')[0].split('-').map(Number);
      return ano === anoH && mes === mesH && dia === diaH;
    });

    if (algumaVenceHoje) return 'HOJE';

    return 'EM DIA';
  }

  // Função para abrir formulário composto (ainda será definida por tipo)
  const abrirFormulario = async (dados = null) => {
    // Limpa ID anterior, por segurança
    formConteudo.dataset.idRegistro = '';
    document.getElementById('formWrapper').className = 'bg-white rounded shadow-lg w-full max-w-5xl mx-4 p-6 relative transition-all duration-300';



    // Oculta o modal enquanto carrega tudo
    formConteudo.innerHTML = ''; // limpa conteúdo anterior
    formContainer.classList.add('hidden');

        // ---------------- 1ª PARTE - INFORMAÇÕES GERAIS ---------------- //

    // Cria o contêiner principal do grupo1
    const grupo1 = document.createElement('div');
    grupo1.className = 'w-full space-y-1 uppercase'; // separa visualmente as linhas

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
    divTipo.className = 'flex gap-4 items-center mt-2';
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
    
    // --- Fornecedor ---
    const inputFornecedor = document.createElement('input');
    inputFornecedor.type = 'text';
    inputFornecedor.id = 'finFornecedor';
    inputFornecedor.className = 'w-full border rounded px-3 py-2 text-sm';
    inputFornecedor.setAttribute('list', 'listaFornecedores'); // conecta o input ao datalist
    
    // datalist de fornecedor
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
    
    // ⏳ Aguarda o carregamento completo das listas antes de montar o DOM
    await carregarCategorias();
    await carregarSubcategorias();
    await carregarProdutos();
    await carregarFornecedores();


    // Se estiver editando, define o ID do registro atual
    if (dados?.id) {
      formConteudo.dataset.idRegistro = dados.id;
    }

    // Agora sim, exibe o formulário após tudo estar carregado
    formContainer.classList.remove('hidden');





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
        <td class="col-span-1"><input type="text" placeholder="Preço" class="w-full border rounded px-2 py-1 text-sm text-right" /></td>
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
      const inputQtd     = tr.querySelectorAll('input')[1];          // Quantidade (número)
      const inputPreco   = tr.querySelectorAll('input')[2];          // Preço (texto com máscara)
      const totalCelula  = tr.children[3];                           // Total (texto)
      const selectLote   = tr.querySelector('select');               // Dropdown de lote
      const btnRemover   = tr.querySelector('img');                  // Botão de remover linha

      // 🎯 Agora sim aplique a máscara ao campo de preço
      inputPreco.addEventListener('input', (e) => {
        let valor = e.target.value.replace(/\D/g, '');

        // Se for número muito grande por erro, limita
        if (valor.length > 10) valor = valor.slice(0, 10);

        // Aplica formatação somente se digitando manualmente
        if (document.activeElement === e.target) {
          valor = (parseInt(valor || '0', 10) / 100).toFixed(2);
          e.target.value = formatarReal(valor);
          atualizarTotal(); // sempre atualiza total após digitação
        }
      });





      const atualizarTotal = () => {
        const precoNumerico = parseFloat((inputPreco.value || '0').replace(/\D/g, '')) / 100;
        const total = parseFloat(inputQtd.value || 0) * precoNumerico;
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
      //atualizarTotal(); // Recalcula ao inserir
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
    //await carregarProdutos();





    // ---------------- 3ª PARTE - PARCELAS / PAGAMENTO ---------------- //
    const grupo3 = document.createElement('div');
    grupo3.className = 'mt-8 max-w-2xl mx-auto';

    // Cabeçalho com título à esquerda e botão à direita
    const header3 = document.createElement('div');
    header3.className = 'flex justify-between items-center mb-2 uppercase';

    const titulo3 = document.createElement('h4');
    titulo3.textContent = 'Pagamentos';
    titulo3.className = 'text-sm font-semibold text-slate-700 uppercase';
    
    //BOTÃO adicionar parcela
    const btnAdicionarParcela = document.createElement('button');
    btnAdicionarParcela.textContent = '+Parcela';
    btnAdicionarParcela.className = 'bg-blue-500 text-white px-3 py-1.5 text-sm rounded shadow hover:bg-blue-600';
    btnAdicionarParcela.addEventListener('click', () => {
      const corpo = document.getElementById('corpoParcelas');
      const totalParcelas = corpo.querySelectorAll('div.grid').length;

      // Nova parcela será N + 1
      const numeroParcela = totalParcelas + 1;

      // Calcula a nova data (última + 30 dias, ou hoje se for a primeira)
      let novaData = new Date();
      if (totalParcelas > 0) {
        const ultimaLinha = corpo.lastElementChild;
        const dataUltima = ultimaLinha.querySelector('input[type="date"]')?.value;
        if (dataUltima) {
          novaData = new Date(dataUltima);
          novaData.setDate(novaData.getDate() + 30);
        }
      }

      const vencimento = novaData.toISOString().split('T')[0];

      // Divide o valor total de produtos
      const totalProdutos = calcularTotalProdutos(); // definiremos essa função abaixo
      const valorParcela = totalParcelas >= 0 ? totalProdutos / (numeroParcela) : 0;

      adicionarLinhaParcela(numeroParcela, vencimento, valorParcela);
    });


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
      const parcelas = [];


      // Verifica e cadastra categoria, subcategoria e fornecedor se necessário
      await verificarCadastroSimples(categoria, 'bdcategorias', 'catNome', 'Categoria', categoriasValidas);
      await verificarCadastroSimples(subcategoria, 'bdsubcategorias', 'subCatNome', 'Subcategoria', subcategoriasValidas);
      await verificarCadastroSimples(fornecedor, 'bdfornecedores', 'forNome', 'Fornecedor', fornecedoresValidos);




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

        // Lista local com produtos válidos já existentes
        const produtosValidos = Array.from(document.getElementById('listaProdutos').options)
          .map(opt => opt.value.toLowerCase());

        for (const tr of linhasProdutos) {
          const inputs = tr.querySelectorAll('input, select');
          const nome = inputs[0]?.value || '';
          const quantidade = parseFloat(inputs[1]?.value || 0);

          // Extrai o valor do campo de preço com máscara R$
          const precoTexto = inputs[2]?.value || '0';
          const precoNumerico = parseFloat(precoTexto.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
          const preco = Number(precoNumerico.toFixed(2));

          const selectLote = tr.querySelector('select');
          const optionSelecionada = selectLote?.options[selectLote.selectedIndex];
          const loteIdentificador = optionSelecionada?.value || '';

          if (nome) {
            // Verifica e cadastra o produto se ainda não existir na lista local
            if (!produtosValidos.includes(nome.toLowerCase())) {
              const confirmar = confirm(`O produto "${nome}" não existe. Deseja cadastrá-lo?`);
              if (confirmar) {
                await addDoc(collection(db, 'bdprodutos'), { prodNome: nome });
                mostrarAlerta('Produto adicionado com sucesso!', 'success');
                produtosValidos.push(nome.toLowerCase());
              } else {
                mostrarAlerta('Selecione um produto válido para continuar.', 'error');
                return;
              }
            }

            produtos.push({ nome, quantidade, preco, lote: loteIdentificador });
          }
        }
        dados.finProduto = produtos;


        // Captura as parcelas existentes
        
        const linhasParcelas = document.querySelectorAll('#corpoParcelas > div.grid');

        // Verifica se todas as parcelas estão vazias (ou zeradas)
        const todasParcelasVazias = [...linhasParcelas].every(div => {
        const inputs = div.querySelectorAll('input');
        if (inputs.length < 3) return true;

        const parcela = inputs[0].value?.trim();
        const vencimento = inputs[1].value?.trim();
        const valorTexto = inputs[2].value?.trim();

        const valor = parseFloat(valorTexto.replace(/[^\d,]/g, '').replace(',', '.')) || 0;

        return !(parcela && vencimento && valor > 0);
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

          const parcela = inputs[0].value.trim();
          const vencimento = inputs[1].value;
          const valorTexto = inputs[2].value || '0';
          const valor = Number(parseFloat(valorTexto.replace(/[^\d,]/g, '').replace(',', '.')).toFixed(2));
          const status = select.value;

          if (parcela && vencimento && valor > 0) {
            parcelas.push({ parcela, vencimento, valor, status });
          }
        });


        }
        
        // Verifica se soma das parcelas bate com o total de produtos
        const totalProdutos = calcularTotalProdutos();
        const somaParcelas = parcelas.reduce((soma, p) => soma + Number(p.valor || 0), 0);
        const arredondado = (num) => Number(num.toFixed(2));
        const diferenca = arredondado(totalProdutos - somaParcelas);

        if (Math.abs(diferenca) > 0.05) {
          mostrarAlerta(`A soma das parcelas (R$ ${formatarReal(somaParcelas)}) difere do total dos produtos (R$ ${formatarReal(totalProdutos)}).`, 'error');
          return;
        }

        // Ajusta a última parcela se a diferença for pequena
        if (parcelas.length > 0 && Math.abs(diferenca) > 0.001) {
          const ultima = parcelas[parcelas.length - 1];
          ultima.valor = arredondado(ultima.valor + diferenca);
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
    function adicionarLinhaParcela(parcela = 1, vencimento = '', valor = '') {
      const tbody = document.getElementById('corpoParcelas');

      const linha = document.createElement('div');
      linha.className = 'grid grid-cols-6 gap-1 items-center m-1';

      linha.innerHTML = `
        <div class="col-span-1 ">
          <input type="text" class="w-full text-sm text-center border px-2 py-1 rounded" value="${parcela}">
        </div>
        <div class="col-span-2">
          <input type="date" class="w-full text-sm text-center border px-2 py-1 rounded " value="${vencimento}">
        </div>
        <div class="col-span-1">
          <input type="text" class="w-full text-sm text-right border px-2 py-1 rounded" placeholder="Valor" value="${valor ? formatarReal(valor) : ''}">
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

      // Aplica máscara de moeda apenas durante a digitação
      const inputValorParcela = linha.querySelectorAll('input')[2];
      inputValorParcela.addEventListener('input', (e) => {
        if (document.activeElement !== e.target) return;
        let valor = e.target.value.replace(/\D/g, '');
        valor = (parseInt(valor || '0', 10) / 100).toFixed(2);
        e.target.value = formatarReal(valor);
      });

      // Botão para remover a linha
      const btnRemover = linha.querySelector('img');
      btnRemover.addEventListener('click', () => {
        linha.remove();
        redistribuirValoresParcelas(); // recalcula após remoção
      });

      tbody.appendChild(linha);

      redistribuirValoresParcelas(); // recalcula ao adicionar nova
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
      await carregarProdutos()
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
          inputs[2].value = formatarReal(p.preco);
          const totalCelula = linha.children[3]; // célula do total
          const total = (p.quantidade || 0) * (p.preco || 0);
          totalCelula.textContent = formatarReal(total);

        }
        await carregarLotesAtivos(inputs[3], p.lote); // seleciona o lote correspondente
        atualizarTotalGeral();
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
          inputs[2].value = formatarReal(parcelaObj.valor);
          select.value = parcelaObj.status || 'pendente';
        }
      });
    }






    // Adiciona 1 parcela padrão na abertura do formulário
    const dataHoje = new Date().toLocaleDateString('fr-CA');
    if (!dados) {
      adicionarLinhaParcela(1, dataHoje);
    }

    
    //await carregarFornecedores();


  }

  // Função Converter o visual em R$
  function formatarReal(valor) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(valor);
  }

  // Função para capturar clique no botão +Novo
  btnNovo?.addEventListener('click', () => abrirFormulario());

  // Fechar formulário
  btnFechar?.addEventListener('click', () => {
    formContainer.classList.add('hidden');
    formConteudo.innerHTML = '';
  });

  // Limpa o filtro
  btnLimparFiltros?.addEventListener('click', () => {
    document.getElementById('filtroStatus').value = 'todos';
    btnLimparFiltros.classList.add('hidden');
    aplicarFiltros();
  });

  // Fechar o formulário ao clicar fora dele
  formContainer?.addEventListener('click', (e) => {
    // Garante que o clique não foi dentro do formulário em si
    if (e.target === formContainer) {
      formContainer.classList.add('hidden');
      formConteudo.innerHTML = '';
    }
  });

  // Abre e fecha a barra de filtro
  btnToggleFiltros?.addEventListener('click', (e) => {
    e.preventDefault();
    areaFiltros.classList.toggle('hidden');

    // Alterna o ícone de setinha
    if (areaFiltros.classList.contains('hidden')) {
      btnToggleFiltros.textContent = 'FILTROS ▼';
    } else {
      btnToggleFiltros.textContent = 'FILTROS ▲';
    }
  });

  /**Função reutilizazel de inserção de campos
   * Verifica se o valor já existe em uma lista local e cadastra se o usuário confirmar.
   * @param {string} valor - O texto digitado pelo usuário
   * @param {string} nomeColecao - Nome da coleção no Firebase (ex: 'bdcategorias')
   * @param {string} campo - Nome do campo a ser salvo (ex: 'catNome')
   * @param {string} label - Nome amigável para exibição no alerta (ex: 'Categoria')
   * @param {Array} listaValidos - Lista de valores válidos existentes (ex: ['ração', 'vacina'])
   */
  async function verificarCadastroSimples(valor, nomeColecao, campo, label, listaValidos = []) {
    if (!valor.trim()) return;

    const valorLower = valor.toLowerCase();
    const listaLower = listaValidos.map(v => v.toLowerCase());

    if (!listaLower.includes(valorLower)) {
      const confirmar = confirm(`${label} "${valor}" não existe. Deseja cadastrá-lo?`);
      if (confirmar) {
        await addDoc(collection(db, nomeColecao), { [campo]: valor });
        mostrarAlerta(`${label} adicionado com sucesso!`, 'success');
      } else {
        mostrarAlerta(`Selecione uma ${label.toLowerCase()} válida para continuar.`, 'error');
        throw new Error(`${label} não confirmado`);
      }
    }
  }

  //função auxiliar para calcular o total de produtos
  function calcularTotalProdutos() {
    const linhas = document.querySelectorAll('#tabelaItensCorpo tr');
    let total = 0;

    linhas.forEach(tr => {
      const inputs = tr.querySelectorAll('input');
      if (inputs.length < 3) return; // ignora linhas incompletas

      const precoTexto = inputs[2]?.value || '0';
      const preco = parseFloat(precoTexto.replace(/[^\d,]/g, '').replace(',', '.')) || 0;

      const quantidade = parseFloat(inputs[1]?.value || '0') || 0;

      total += preco * quantidade;
    });

    return Number(total.toFixed(2));
  }

  //Função que recalcula os valores existentes proporcionalmente ao clicar em "+Parcela"
  function redistribuirValoresParcelas() {
    const corpo = document.getElementById('corpoParcelas');
    const linhas = corpo.querySelectorAll('div.grid');
    const total = calcularTotalProdutos();

    if (linhas.length === 0 || total === 0) return;

    const valorParcela = total / linhas.length;

    linhas.forEach(linha => {
      const inputValor = linha.querySelectorAll('input')[2];
      inputValor.value = formatarReal(valorParcela);
    });
  }

  //Filtro por status
  function criarFiltroPorStatus() {
    const container = document.getElementById('areaFiltros');
    if (!container) return;

    // Impede que o filtro seja adicionado mais de uma vez
    if (document.getElementById('filtroStatus')) return;

    const div = document.createElement('div');
    div.className = 'flex flex-col text-sm';

    const label = document.createElement('label');
    label.textContent = 'STATUS';
    label.className = 'font-semibold mb-1 text-white';

    const select = document.createElement('select');
    select.id = 'filtroStatus'; // <-- essa ID garante a verificação acima
    select.className = 'border rounded px-2 py-1 text-black';

    ['Todos', 'Pago', 'Pendente'].forEach(status => {
      const option = document.createElement('option');
      option.value = status.toLowerCase();
      option.textContent = status;
      select.appendChild(option);
    });

    select.addEventListener('change', () => {
      document.getElementById('btnLimparFiltros')?.classList.remove('hidden');
      aplicarFiltros();
    });

    div.appendChild(label);
    div.appendChild(select);
    container.appendChild(div);
  }

  //Filtro por data de vencimento
  function criarFiltroPorDataVencimento() {
    const container = document.getElementById('areaFiltros');
    if (!container) return;

    // Evita duplicação
    if (document.getElementById('filtroVencimentoInicial')) return;

    const div = document.createElement('div');
    div.className = 'flex flex-col text-sm text-white';

    const label = document.createElement('label');
    label.textContent = 'VENCIMENTO (De - Até)';
    label.className = 'font-semibold mb-1';

    const grupo = document.createElement('div');
    grupo.className = 'flex gap-2';

    const inputInicio = document.createElement('input');
    inputInicio.type = 'date';
    inputInicio.id = 'filtroVencimentoInicial';
    inputInicio.className = 'border rounded px-2 py-1 text-black';
    inputInicio.addEventListener('change', aplicarFiltros);

    const inputFim = document.createElement('input');
    inputFim.type = 'date';
    inputFim.id = 'filtroVencimentoFinal';
    inputFim.className = 'border rounded px-2 py-1 text-black';
    inputFim.addEventListener('change', aplicarFiltros);

    grupo.appendChild(inputInicio);
    grupo.appendChild(inputFim);
    div.appendChild(label);
    div.appendChild(grupo);
    container.appendChild(div);
  }
  
  //Compara as datas para aplicar no filtro
  function compararDatas(data1, data2) {
    const d1 = new Date(data1);
    const d2 = new Date(data2);

    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);

    return d1.getTime() - d2.getTime();
  }

  //Aplica os filtros selecionados
  function aplicarFiltros() {
    const statusSelecionado = document.getElementById('filtroStatus')?.value || 'todos';
    const inicio = document.getElementById('filtroVencimentoInicial')?.value;
    const fim = document.getElementById('filtroVencimentoFinal')?.value;

    registros = registrosOriginais.map(registro => {
      let parcelas = registro.finParcelas || [];

      // Filtro por status
      if (statusSelecionado !== 'todos') {
        parcelas = parcelas.filter(p => p.status.toLowerCase() === statusSelecionado);
      }

      // Filtro por intervalo de vencimento
      if (inicio) {
        parcelas = parcelas.filter(p => compararDatas(p.vencimento, inicio) >= 0);
      }
      if (fim) {
        parcelas = parcelas.filter(p => compararDatas(p.vencimento, fim) <= 0);
      }

      return { ...registro, finParcelas: parcelas };
    });

    renderizarTabela();
  }

  // Fecha o modal se pressionar Esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('formContainer');
      if (!modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
        document.getElementById('formConteudo').innerHTML = ''; // limpa conteúdo
      }
    }
  });

  // Carregamento inicial
  window.abrirFormulario = abrirFormulario;
  await carregarRegistros();
});

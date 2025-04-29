// js/financeiro.js
import { db } from './firebaseConfig.js';
import { mostrarAlerta } from './alerta.js';
import { collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

//Função para converter para a data brasileira
function formatarDataBR(dataInput) {
  const data = new Date(dataInput);
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = String(data.getFullYear());
  return `${dia}/${mes}/${ano}`;
}
  //Função para converter data brasileira para ISO
  function converterDataBRparaISO(dataBR) {
    if (!dataBR) return new Date(0);
    const [dia, mes, ano] = dataBR.split('/');
    return new Date(`${ano}-${mes}-${dia}`);
  }



document.addEventListener('DOMContentLoaded', () => {
  const produtosTabela = document.getElementById('produtosFinanceiro');
  const btnAddProduto = document.getElementById('addProduto');
  const pagamentosTabela = document.getElementById('pagamentosFinanceiro');
  const btnAddPagamento = document.getElementById('addPagamento');
  const totalGeralProdutos = document.getElementById('totalGeralProdutos');
  const formFinanceiro = document.getElementById('formFinanceiro');
  const tabelaFinanceiros = document.getElementById('tabelaFinanceiros');
  const listaFinanceiros = document.getElementById('listaFinanceiros');

  // Cache de listas para otimizar carregamento
  let cacheFornecedores = [];
  let cacheCategorias = [];
  let cacheSubcategorias = [];
  let cacheProdutos = [];

  // Variáveis de controle de paginação
  let registros = [];
  let paginaAtual = 1;
  let registrosPorPagina = 10;
  let registrosFiltrados = []; // Resultado do filtro


  // Função que busca na lista de lotes os que stiverem ativos no momento.
  async function buscarLotesAtivos() {
    const snapshot = await getDocs(collection(db, 'bdlotes'));
    return snapshot.docs
      .map(doc => doc.data())
      .filter(lote => lote.status.toLowerCase() === 'ativo')
      .map(lote => `${lote.galpao} (${lote.idlote})`);
  }

  // Função para buscar o último preço de um produto no bdFinanceiro
  async function buscarUltimoPrecoProduto(nomeProduto) {
    try {
      const snapshot = await getDocs(collection(db, 'bdFinanceiro'));
      let ultimoPreco = null;
      let dataMaisRecente = new Date(0); // Começa com a data mais antiga possível
  
      snapshot.forEach(doc => {
        const data = doc.data();
        const produtos = data.produtos || [];
        const dataRegistro = data.timestamp ? new Date(data.timestamp.seconds * 1000) : new Date(0); // Ajuste do timestamp salvo como objeto Firebase Timestamp
  
        produtos.forEach(prod => {
          if (prod.produto === nomeProduto && dataRegistro > dataMaisRecente) {
            ultimoPreco = prod.preco;
            dataMaisRecente = dataRegistro;
          }
        });
      });
  
      return ultimoPreco;
    } catch (error) {
      console.error('Erro ao buscar último preço do produto:', error);
      return null;
    }
  }
  

  // Salva novo valor e atualiza cache local
  async function salvarValorUnico(colecao, nome) {
    if (!nome.trim()) return;
  
    let cacheArray;
    switch (colecao) {
      case 'bdfornecedores': cacheArray = cacheFornecedores; break;
      case 'bdcategorias': cacheArray = cacheCategorias; break;
      case 'bdsubcategorias': cacheArray = cacheSubcategorias; break;
      case 'bdprodutos': cacheArray = cacheProdutos; break; // <<< Adicionado aqui
    }
  
    if (!cacheArray) {
      cacheArray = []; // Protege caso seja uma coleção sem cache pré-definido
    }
  
    if (!cacheArray.includes(nome)) {
      await addDoc(collection(db, colecao), { nome });
      cacheArray.push(nome);
  
      const lista = document.getElementById(`lista${colecao.slice(2)}`);
      if (lista) {
        const option = document.createElement('option');
        option.value = nome;
        lista.appendChild(option);
      }
    }
  }
  
  // Função para preencher datalist usando cache
  async function preencherDatalist(colecao, idDatalist, cacheArray) {
    const lista = document.getElementById(idDatalist);
    if (!lista) return;
    
    // Se o cache já tiver dados, usa ele
    if (cacheArray.length > 0) {
      lista.innerHTML = "";
      cacheArray.forEach(nome => {
        const option = document.createElement('option');
        option.value = nome;
        lista.appendChild(option);
      });
      return;
    }

    // Se cache vazio, busca do banco
    const snapshot = await getDocs(collection(db, colecao));
    cacheArray.length = 0; // Garante que está limpo
    lista.innerHTML = "";
    snapshot.forEach(doc => {
      const nome = doc.data().nome;
      cacheArray.push(nome); // Salva no cache
      const option = document.createElement('option');
      option.value = nome;
      lista.appendChild(option);
    });
  }

  // Carrega todas as listas usando cache
  async function carregarListasDinamicas() {
    await preencherDatalist('bdfornecedores', 'listaFornecedores', cacheFornecedores);
    await preencherDatalist('bdcategorias', 'listaCategorias', cacheCategorias);
    await preencherDatalist('bdsubcategorias', 'listaSubcategorias', cacheSubcategorias);
    await preencherDatalist('bdprodutos', 'listaProdutos', cacheProdutos);
  }

  // Função principal: buscar todos os registros financeiros
  async function listarCadastrosFinanceiros() {
    const lista = document.getElementById('listaFinanceiros');
    const tabelaDiv = document.getElementById('tabelaFinanceiros');
    lista.innerHTML = "";
  
    const q = query(collection(db, 'bdFinanceiro'), orderBy('timestamp', 'desc')); // Ordenado pela data de cadastro decrescente
    const snapshot = await getDocs(q);
  
    registros = []; // Zera registros para não acumular
    if (!snapshot.empty) {
      snapshot.forEach(doc => {
        registros.push(doc.data());
      });
  
      registrosFiltrados = registros.slice(); // Começamos com todos
      paginaAtual = 1; // Começamos sempre da primeira página
  
      exibirPagina(paginaAtual); // Exibe a primeira página carregada
    } else {
      tabelaDiv.classList.add('hidden');
    }
  }
  

  // Função para exibir os registros da página atual
  function exibirPagina(pagina) {
    listaFinanceiros.innerHTML = ""; // Limpa lista antes de mostrar
  
    const tabelaDiv = document.getElementById('tabelaFinanceiros');
    const registrosPorPagina = parseInt(document.getElementById('registrosPorPagina').value) || 10;
    const inicio = (pagina - 1) * registrosPorPagina;
    const fim = inicio + registrosPorPagina;
  
    const registrosPagina = registrosFiltrados.slice(inicio, fim); // Agora fatiamos registros filtrados
  
    if (registrosPagina.length === 0) {
      tabelaDiv.classList.remove('hidden');
      listaFinanceiros.innerHTML = `<div class="text-center text-red-400 font-semibold mt-6">Nenhum registro encontrado.</div>`;
      atualizarContagemRegistros();
      return;
    }
  
    registrosPagina.forEach(data => {
      // Filtro dos pagamentos visíveis, conforme filtro STATUS
      const { statusSelecionados } = capturarFiltros();
      const pagamentosFiltrados = statusSelecionados.length > 0
        ? data.pagamentos.filter(p => statusSelecionados.includes(p.status))
        : data.pagamentos;
  
      const produtosHtml = data.produtos.map(p => `
        <tr class="text-center">
          <td class="border p-1">${p.produto}</td>
          <td class="border p-1">${p.quantidade}</td>
          <td class="border p-1">${p.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
          <td class="border p-1">${p.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
        </tr>
      `).join('');
  
      const pagamentosHtml = pagamentosFiltrados.map(p => {
        let classeStatus = '';
        if (p.status === 'PAGO') classeStatus = 'status-pago';
        else if (p.status === 'PENDENTE') classeStatus = 'status-pendente';
        else if (p.status === 'AGENDADO') classeStatus = 'status-agendado';
  
        return `
          <tr class="text-center">
            <td class="border p-1">${p.parcela}</td>
            <td class="border p-1">${p.vencimento}</td>
            <td class="border p-1">${p.setorLote}</td>
            <td class="border p-1">${(p.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td class="border p-1 ${classeStatus}">${p.status || "-"}</td>
          </tr>
        `;
      }).join('');
  
      const card = `
        <div class="border rounded shadow p-5">
          <div class="flex justify-between font-bold mb-2">
            <span>${data.dataFormatada}</span>
            <span>${data.fornecedor} | ${data.nota || 'Sem Nota'}</span>
            <span class="text-blue-700">${data.produtos.reduce((acc, p) => acc + (p.total || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
  
          <h3 class="text-gray-700 font-semibold mt-4 mb-1">PRODUTOS</h3>
          <table class="w-full text-sm border mb-1">
            <thead class="bg-gray-200">
              <tr>
                <th class="border p-1">PRODUTO</th>
                <th class="border p-1">QUANT.</th>
                <th class="border p-1">PREÇO</th>
                <th class="border p-1">TOTAL</th>
              </tr>
            </thead>
            <tbody>${produtosHtml}</tbody>
          </table>
  
          <h3 class="text-gray-700 font-semibold mt-4 mb-1">PAGAMENTOS</h3>
          <table class="w-full text-sm border">
            <thead class="bg-gray-200">
              <tr>
                <th class="border p-1">PARCELA</th>
                <th class="border p-1">VENCIMENTO</th>
                <th class="border p-1">CENTRO DE CUSTO</th>
                <th class="border p-1">VALOR</th>
                <th class="border p-1">STATUS</th>
              </tr>
            </thead>
            <tbody>${pagamentosHtml}</tbody>
          </table>
        </div>
      `;
  
      listaFinanceiros.innerHTML += card;
    });
  
    tabelaDiv.classList.remove('hidden');
    atualizarContagemRegistros();
    atualizarControlesPaginacao();
  }
  

  // Atualiza botões e texto de paginação
  function atualizarControlesPaginacao() {
    const totalPaginas = Math.ceil(registros.length / registrosPorPagina);

    document.getElementById('btnAnterior').disabled = paginaAtual === 1;
    document.getElementById('btnProximo').disabled = paginaAtual === totalPaginas || totalPaginas === 0;

    // Atualiza o texto de página atual
    if (!document.getElementById('textoPaginacao')) {
      const texto = document.createElement('div');
      texto.id = 'textoPaginacao';
      texto.className = 'text-sm text-gray-700';
      document.getElementById('paginacaoFinanceiros').appendChild(texto);
    }

    document.getElementById('textoPaginacao').textContent = `Página ${paginaAtual} de ${totalPaginas}`;
  }

  // Botão Anterior
  document.getElementById('btnAnterior').addEventListener('click', () => {
    if (paginaAtual > 1) {
      paginaAtual--;
      exibirPagina(paginaAtual);
    }
  });

  // Botão Próximo
  document.getElementById('btnProximo').addEventListener('click', () => {
    const registrosPorPagina = parseInt(document.getElementById('registrosPorPagina').value) || 10;
    const totalPaginas = Math.ceil(registrosFiltrados.length / registrosPorPagina);
    if (paginaAtual < totalPaginas) {
      paginaAtual++;
      exibirPagina(paginaAtual);
    }
  });


  // Select de quantidade por página
  document.getElementById('registrosPorPagina').addEventListener('change', () => {
    registrosPorPagina = parseInt(document.getElementById('registrosPorPagina').value);
    paginaAtual = 1; // volta para a primeira página
    exibirPagina(paginaAtual);
  });

  //FILTRO: Botão "Aplicar Filtros"
  document.getElementById('btnAplicarFiltros').addEventListener('click', aplicarFiltrosEOrdenacao);

  //FILTRO: Botão "Limpar Filtros"
  document.getElementById('btnLimparFiltros').addEventListener('click', () => {
    // Desmarca todos os checkboxes de status
    document.querySelectorAll('.filtro-status').forEach(cb => cb.checked = false);
  
    // Limpa vencimentos
    document.getElementById('filtroVencimentoInicio').value = "";
    document.getElementById('filtroVencimentoFim').value = "";
  
    // Limpa textos de fornecedor e produto
    document.getElementById('filtroFornecedor').value = "";
    document.getElementById('filtroProduto').value = "";
  
    // Reseta ordenação para padrão
    document.getElementById('ordenacaoRegistros').value = "cadastro_desc";
  
    // Reaplica filtros
    aplicarFiltrosEOrdenacao();
    paginaAtual = 1;
    exibirPagina(paginaAtual);

  });
  

  async function salvarFinanceiro(dadosFinanceiro) {
    await addDoc(collection(db, 'bdFinanceiro'), dadosFinanceiro);
    await listarCadastrosFinanceiros();
  }

  carregarListasDinamicas();
  listarCadastrosFinanceiros();

  window.salvarFinanceiro = salvarFinanceiro;


  function atualizarTotalGeral() {
    let total = 0;
    produtosTabela.querySelectorAll('tr').forEach(tr => {
      const inputs = tr.querySelectorAll('input');
      if (inputs.length >= 3) {
        const quantidade = parseFloat(inputs[1].value) || 0;
        const preco = parseFloat(inputs[2].value) || 0;
        total += quantidade * preco;
      }
    });
    totalGeralProdutos.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  btnAddProduto.addEventListener('click', () => {
    const novaLinha = document.createElement('tr');
    novaLinha.innerHTML = `
      <td class="border p-2"><input type="text" list="listaProdutos" class="w-full border rounded px-2 py-1" required placeholder="Produto"></td>
      <td class="border p-2"><input type="number" class="w-full border rounded px-2 py-1" required placeholder="Quantidade" min="0" step="0.01"></td>
      <td class="border p-2"><input type="number" class="w-full border rounded px-2 py-1" required placeholder="Preço" min="0" step="0.01"></td>
      <td class="border p-2"><input type="text" class="w-full border rounded px-2 py-1 bg-gray-100" placeholder="Total" readonly></td>
      <td class="border p-2 text-center"><button type="button" class="text-red-600 removeProduto">🗑️</button></td>
    `;
    produtosTabela.appendChild(novaLinha);

    const inputs = novaLinha.querySelectorAll('input');
    inputs[1].addEventListener('input', atualizarTotal);
    inputs[2].addEventListener('input', atualizarTotal);

    function atualizarTotal() {
      const quantidade = parseFloat(inputs[1].value) || 0;
      const preco = parseFloat(inputs[2].value) || 0;
      const total = quantidade * preco;
      inputs[3].value = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      atualizarTotalGeral();
    }
  });

  btnAddPagamento.addEventListener('click', async () => {
    const lotes = await buscarLotesAtivos();
    const selectOptionsLotes = lotes.map(l => `<option value="${l}">${l}</option>`).join('');
  
    const valorTotalProdutos = calcularTotalProdutos();
  
    const novaLinha = document.createElement('tr');
    novaLinha.innerHTML = `
      <td class="border p-2"><input type="text" class="w-full border rounded px-2 py-1" placeholder="Parcela"></td>
      <td class="border p-2"><input type="date" class="w-full border rounded px-2 py-1"></td>
      <td class="border p-2">
        <select class="w-full border rounded px-2 py-1">
          ${selectOptionsLotes}
        </select>
      </td>
      <td class="border p-2">
        <input type="number" class="w-full border rounded px-2 py-1 valorParcela" placeholder="Valor" min="0" step="0.01" value="${valorTotalProdutos.toFixed(2)}">
      </td>
      <td class="border p-2">
        <select class="w-full border rounded px-2 py-1">
          <option value="PENDENTE">PENDENTE</option>
          <option value="AGENDADO">AGENDADO</option>
          <option value="PAGO">PAGO</option>
        </select>
      </td>
      <td class="border p-2 text-center">
        <button type="button" class="text-red-600 removePagamento">🗑️</button>
      </td>
    `;
    pagamentosTabela.appendChild(novaLinha);
  
    // Se houver mais de uma parcela, dividir valores igualmente
    ajustarValoresParcelas();
  });
  
    
  produtosTabela.addEventListener('click', (e) => {
    if (e.target.classList.contains('removeProduto')) {
      e.target.closest('tr').remove();
      atualizarTotalGeral();
    }
  });

  pagamentosTabela.addEventListener('click', (e) => {
    if (e.target.classList.contains('removePagamento')) {
      e.target.closest('tr').remove();
    }
  });

  formFinanceiro.addEventListener('submit', async (e) => {
    e.preventDefault(); // Impede o envio tradicional do formulário
  
    // Verifica se há ao menos um produto adicionado
    if (produtosTabela.querySelectorAll('tr').length === 0) {
      mostrarAlerta('Adicione pelo menos um produto ou serviço antes de salvar.', 'alerta');
      return;
    }
  
    try {
      // Captura os produtos
      const produtos = [];
      produtosTabela.querySelectorAll('tr').forEach(tr => {
        const inputs = tr.querySelectorAll('input');
        if (inputs.length >= 4) {
          const quantidade = parseFloat(inputs[1].value.replace(',', '.')) || 0;
          const preco = parseFloat(inputs[2].value.replace(',', '.')) || 0;
          const total = quantidade * preco;
          produtos.push({
            produto: inputs[0].value,
            quantidade: quantidade,
            preco: preco,
            total: total
          });
        }
      });
  
      // Captura as parcelas de pagamento
      const pagamentos = [];
      pagamentosTabela.querySelectorAll('tr').forEach(tr => {
        const inputs = tr.querySelectorAll('input, select');
        if (inputs.length >= 5) {
          pagamentos.push({
            parcela: inputs[0].value,
            vencimento: formatarDataBR(inputs[1].value),
            setorLote: inputs[2].value,
            valor: parseFloat(inputs[3].value.replace(',', '.')) || 0,
            status: inputs[4].value || ""
          });
        }
      });

      // Se nenhum pagamento foi adicionado, cria a parcela à vista automaticamente
      if (pagamentos.length === 0) {
        const hoje = new Date();
        const totalProdutos = produtos.reduce((acc, p) => acc + (p.total || 0), 0);

        pagamentos.push({
          parcela: "1",
          vencimento: formatarDataBR(hoje),
          setorLote: "GRANJA",
          valor: parseFloat(totalProdutos.toFixed(2)),
          status: "PAGO"
        });
        // Alerta informativo ao usuário
        mostrarAlerta("Nenhuma parcela foi informada. Pagamento à vista registrado automaticamente.", "informacao");
      }

      
  
      // Captura dados básicos do formulário
      const fornecedor = document.getElementById('fornecedor').value;
      const categoria = document.getElementById('categoria').value;
      const subcategoria = document.getElementById('subcategoria').value;
  
      // Verifica se a soma das parcelas bate com o valor total dos produtos
      const totalParcelas = pagamentos.reduce((acc, p) => acc + (p.valor || 0), 0);
      const totalProdutos = produtos.reduce((acc, p) => acc + (p.total || 0), 0);
  
      // Permite pequena margem de erro (ex: por arredondamentos)
      if (Math.abs(totalParcelas - totalProdutos) > 0.05) {
        mostrarAlerta(`A soma das parcelas (R$ ${totalParcelas.toFixed(2)}) não confere com o total dos produtos (R$ ${totalProdutos.toFixed(2)}). Ajuste para continuar.`, 'alerta');
        return;
      }
  
      // Salva os valores únicos nas respectivas coleções (se ainda não existirem)
      await salvarValorUnico('bdfornecedores', fornecedor);
      await salvarValorUnico('bdcategorias', categoria);
      await salvarValorUnico('bdsubcategorias', subcategoria);
      for (const produto of produtos) {
        await salvarValorUnico('bdprodutos', produto.produto);
      }
      
  
      // Monta o objeto com todos os dados para salvar
      const dadosFinanceiro = {
        dataFormatada: formatarDataBR(new Date()),
        timestamp: new Date(),
        tipo: document.getElementById('tipo').value,
        fornecedor,
        nota: document.getElementById('nota').value,
        categoria,
        subcategoria,
        observacao: document.getElementById('observacao').value,
        produtos,
        pagamentos,
      };
      
  
      // PRIMEIRO: salva o novo cadastro no banco
      await addDoc(collection(db, 'bdFinanceiro'), dadosFinanceiro);
  
      // DEPOIS: atualiza a lista de cadastros com o novo incluso
      paginaAtual = 1; // Opcional: volta para a página 1 após novo cadastro
      await listarCadastrosFinanceiros();
  
      // Exibe mensagem de sucesso
      mostrarAlerta('Cadastro financeiro salvo com sucesso!', 'feedback');
  
      // Limpa o formulário e reseta tudo
      formFinanceiro.reset();
      produtosTabela.innerHTML = "";
      pagamentosTabela.innerHTML = "";
      totalGeralProdutos.textContent = "R$ 0,00";
      carregarListasDinamicas();
  
    } catch (error) {
      console.error('Erro ao salvar financeiro:', error);
      mostrarAlerta('Erro ao salvar financeiro.', 'alerta');
    }
  });
  
  // Evento para sugerir o último preço ao selecionar um produto
  produtosTabela.addEventListener('input', async (e) => {
    if (e.target.tagName === 'INPUT' && e.target.getAttribute('list') === 'listaProdutos') {
      const produtoSelecionado = e.target.value;
      const linha = e.target.closest('tr');
      const inputPreco = linha.querySelectorAll('input')[2]; // Segundo input é o de preço

      if (produtoSelecionado && inputPreco && inputPreco.value === "") {
        const precoSugerido = await buscarUltimoPrecoProduto(produtoSelecionado);
        if (precoSugerido) {
          inputPreco.value = precoSugerido;
          // Opcional: também atualizar o campo de TOTAL da linha
          const quantidadeInput = linha.querySelectorAll('input')[1];
          const inputTotal = linha.querySelectorAll('input')[3];

          const quantidade = parseFloat(quantidadeInput.value) || 0;
          const preco = parseFloat(precoSugerido) || 0;
          const total = quantidade * preco;
          inputTotal.value = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

          // Atualizar o total geral também
          atualizarTotalGeral();
        }
      }
    }
  });

  // Adiciona uma linha inicial no formulário de produtos
  btnAddProduto.click();

  function calcularTotalProdutos() {
    let total = 0;
    produtosTabela.querySelectorAll('tr').forEach(tr => {
      const inputs = tr.querySelectorAll('input');
      if (inputs.length >= 3) {
        const quantidade = parseFloat(inputs[1].value) || 0;
        const preco = parseFloat(inputs[2].value) || 0;
        total += quantidade * preco;
      }
    });
    return total;
  }
  
  function ajustarValoresParcelas() {
    const parcelas = pagamentosTabela.querySelectorAll('tr');
    if (parcelas.length === 0) return;
  
    const valorTotal = calcularTotalProdutos();
    const valorDividido = valorTotal / parcelas.length;
  
    parcelas.forEach(tr => {
      const inputValor = tr.querySelector('.valorParcela');
      if (inputValor) {
        inputValor.value = valorDividido.toFixed(2);
      }
    });
  }
  
  //FILTRO: Função para capturar os filtros
  function capturarFiltros() {
    const statusSelecionados = Array.from(document.querySelectorAll('.filtro-status:checked')).map(cb => cb.value);
    const vencimentoInicio = document.getElementById('filtroVencimentoInicio').value;
    const vencimentoFim = document.getElementById('filtroVencimentoFim').value;
    const fornecedorFiltro = document.getElementById('filtroFornecedor').value.trim().toLowerCase();
    const produtoFiltro = document.getElementById('filtroProduto').value.trim().toLowerCase();
    const ordenacao = document.getElementById('ordenacaoRegistros').value;
  
    return {
      statusSelecionados,
      vencimentoInicio,
      vencimentoFim,
      fornecedorFiltro,
      produtoFiltro,
      ordenacao
    };
  }
  
  //FILTRO: Função para aplicar filtros e ordenação
  function aplicarFiltrosEOrdenacao() {
    const {
      statusSelecionados,
      vencimentoInicio,
      vencimentoFim,
      fornecedorFiltro,
      produtoFiltro,
      ordenacao
    } = capturarFiltros();
  
    registrosFiltrados = registros.filter(r => {
      let passaStatus = true;
      let passaVencimento = true;
      let passaFornecedor = true;
      let passaProduto = true;
  
      // Filtro por status
      if (statusSelecionados.length > 0) {
        passaStatus = r.pagamentos.some(p => statusSelecionados.includes(p.status));
      }
  
      // Filtro por vencimento
      if (vencimentoInicio || vencimentoFim) {
        passaVencimento = r.pagamentos.some(p => {
          const dataVenc = converterDataBRparaISO(p.vencimento);
          const dataInicio = vencimentoInicio ? new Date(vencimentoInicio) : null;
          const dataFim = vencimentoFim ? new Date(vencimentoFim) : null;
          return (!dataInicio || dataVenc >= dataInicio) && (!dataFim || dataVenc <= dataFim);
        });
      }
  
      // Filtro por fornecedor
      if (fornecedorFiltro) {
        passaFornecedor = r.fornecedor.toLowerCase().includes(fornecedorFiltro);
      }
  
      // Filtro por produto
      if (produtoFiltro) {
        passaProduto = r.produtos.some(p => p.produto.toLowerCase().includes(produtoFiltro));
      }
  
      return passaStatus && passaVencimento && passaFornecedor && passaProduto;
    });
  
    // Ordenação
    registrosFiltrados.sort((a, b) => {
      if (ordenacao === 'cadastro_desc') {
        return new Date(b.timestamp.seconds * 1000) - new Date(a.timestamp.seconds * 1000);
      } else if (ordenacao === 'cadastro_asc') {
        return new Date(a.timestamp.seconds * 1000) - new Date(b.timestamp.seconds * 1000);
      } else if (ordenacao === 'vencimento_desc') {
        const vencA = pegarMenorVencimento(a.pagamentos);
        const vencB = pegarMenorVencimento(b.pagamentos);
        return vencB - vencA;
      } else if (ordenacao === 'vencimento_asc') {
        const vencA = pegarMenorVencimento(a.pagamentos);
        const vencB = pegarMenorVencimento(b.pagamentos);
        return vencA - vencB;
      }
      return 0;
    });
  
    paginaAtual = 1; // Sempre volta para a primeira página após aplicar
    exibirPagina(paginaAtual);

  }

  //FILTRO: Função auxiliar para pegar menor vencimento de um registro
  function pegarMenorVencimento(pagamentos) {
    if (!pagamentos || pagamentos.length === 0) return new Date(0);
    const datas = pagamentos.map(p => converterDataBRparaISO(p.vencimento));
    return datas.sort((a, b) => a - b)[0];
  }
  
  //FILTRO: Atualiza a contagem de registros filtrados
  function atualizarContagemRegistros() {
    let contador = document.getElementById('contadorRegistros');
  
    if (!contador) {
      // Se ainda não existir o contador, criamos dinamicamente
      const tabelaDiv = document.getElementById('tabelaFinanceiros');
      contador = document.createElement('div');
      contador.id = 'contadorRegistros';
      contador.className = 'text-sm text-gray-500 text-center mb-2 mt-2';
      tabelaDiv.insertBefore(contador, tabelaDiv.children[1]); // Insere o contador logo depois do cabeçalho
    }
  
    const total = registrosFiltrados.length || 0;
  
    if (total > 0) {
      contador.innerHTML = `Mostrando <strong>${total}</strong> registros encontrados.`;
    } else {
      contador.innerHTML = `<span class="text-red-400">Nenhum registro encontrado.</span>`;
    }
  }

  //PÁGINAÇÃO: Atualiza os controles
  function atualizarControlesPaginacao() {
    const registrosPorPagina = parseInt(document.getElementById('registrosPorPagina').value) || 10;
    const totalPaginas = Math.ceil(registrosFiltrados.length / registrosPorPagina);
  
    document.getElementById('btnAnterior').disabled = paginaAtual <= 1;
    document.getElementById('btnProximo').disabled = paginaAtual >= totalPaginas;
  
    const contador = document.getElementById('contadorPagina');
    if (contador) {
      if (totalPaginas > 0) {
        contador.textContent = `${paginaAtual} de ${totalPaginas}`;
      } else {
        contador.textContent = "";
      }
    }
  }
  
  
  

});

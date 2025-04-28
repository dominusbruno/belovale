// js/financeiro.js
import { db } from './firebaseConfig.js';
import { mostrarAlerta } from './alerta.js';
import { collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

function formatarDataBR(dataInput) {
  const data = new Date(dataInput);
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = String(data.getFullYear());
  return `${dia}/${mes}/${ano}`;
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

  async function buscarLotesAtivos() {
    const snapshot = await getDocs(collection(db, 'bdlotes'));
    return snapshot.docs
      .map(doc => doc.data())
      .filter(lote => lote.status.toLowerCase() === 'ativo')
      .map(lote => `${lote.galpao} (${lote.idlote})`);
  }

  async function salvarValorUnico(colecao, nome) {
    if (!nome.trim()) return;
    const snapshot = await getDocs(collection(db, colecao));
    const valores = snapshot.docs.map(doc => doc.data().nome.toLowerCase());
    if (!valores.includes(nome.toLowerCase())) {
      await addDoc(collection(db, colecao), { nome });
    }
  }

  async function preencherDatalist(colecao, idDatalist) {
    const lista = document.getElementById(idDatalist);
    if (!lista) return;
    lista.innerHTML = "";
    const snapshot = await getDocs(collection(db, colecao));
    snapshot.forEach(doc => {
      const option = document.createElement('option');
      option.value = doc.data().nome;
      lista.appendChild(option);
    });
  }

  async function carregarListasDinamicas() {
    await preencherDatalist('bdfornecedores', 'listaFornecedores');
    await preencherDatalist('bdcategorias', 'listaCategorias');
    await preencherDatalist('bdsubcategorias', 'listaSubcategorias');
    await preencherDatalist('bdprodutos', 'listaProdutos');
  }

  async function listarCadastrosFinanceiros() {
    const lista = document.getElementById('listaFinanceiros');
    const tabelaDiv = document.getElementById('tabelaFinanceiros');
    lista.innerHTML = "";
    const q = query(collection(db, 'bdFinanceiro'), orderBy('data', 'desc'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      tabelaDiv.classList.remove('hidden');
      snapshot.forEach(doc => {
        const data = doc.data();
        const produtosHtml = data.produtos.map(p => `
          <tr class="text-center">
            <td class="border p-1">${p.produto}</td>
            <td class="border p-1">${p.quantidade}</td>
            <td class="border p-1">${p.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td class="border p-1">${p.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
          </tr>
        `).join('');
        const pagamentosHtml = data.pagamentos.map(p => `
          <tr class="text-center">
            <td class="border p-1">${p.parcela}</td>
            <td class="border p-1">${p.vencimento}</td>
            <td class="border p-1">${p.setorLote}</td>
            <td class="border p-1">-</td>
          </tr>
        `).join('');
        const card = `
          <div class="border rounded shadow p-4">
            <div class="flex justify-between font-bold mb-2">
              <span>${data.data}</span>
              <span>${data.fornecedor} | ${data.nota || 'Sem Nota'}</span>
              <span class="text-green-700">TOTAL: ${data.produtos.reduce((acc, p) => acc + (p.total || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            <h3 class="text-gray-700 font-semibold mt-4 mb-1">Produtos</h3>
            <table class="w-full text-sm border mb-4">
              <thead class="bg-gray-200">
                <tr>
                  <th class="border p-1">Produto</th>
                  <th class="border p-1">Qtd</th>
                  <th class="border p-1">Preço</th>
                  <th class="border p-1">Total</th>
                </tr>
              </thead>
              <tbody>${produtosHtml}</tbody>
            </table>
            <h3 class="text-gray-700 font-semibold mt-4 mb-1">Pagamentos</h3>
            <table class="w-full text-sm border">
              <thead class="bg-gray-200">
                <tr>
                  <th class="border p-1">Parcela</th>
                  <th class="border p-1">Vencimento</th>
                  <th class="border p-1">Setor/Lote</th>
                  <th class="border p-1">Status</th>
                </tr>
              </thead>
              <tbody>${pagamentosHtml}</tbody>
            </table>
          </div>
        `;
        lista.innerHTML += card;
      });
    } else {
      tabelaDiv.classList.add('hidden');
    }
  }

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
    const selectOptions = lotes.map(l => `<option value="${l}">${l}</option>`).join('');
    const novaLinha = document.createElement('tr');
    novaLinha.innerHTML = `
      <td class="border p-2"><input type="text" class="w-full border rounded px-2 py-1" placeholder="Parcela"></td>
      <td class="border p-2"><input type="date" class="w-full border rounded px-2 py-1"></td>
      <td class="border p-2"><select class="w-full border rounded px-2 py-1">${selectOptions}</select></td>
      <td class="border p-2 text-center"><button type="button" class="text-red-600 removePagamento">🗑️</button></td>
    `;
    pagamentosTabela.appendChild(novaLinha);
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
    e.preventDefault();

    if (produtosTabela.querySelectorAll('tr').length === 0) {
      mostrarAlerta('Adicione pelo menos um produto ou serviço antes de salvar.', 'alerta');
      return;
    }

    try {
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

      const pagamentos = [];
      pagamentosTabela.querySelectorAll('tr').forEach(tr => {
        const inputs = tr.querySelectorAll('input, select');
        if (inputs.length >= 3) {
          pagamentos.push({
            parcela: inputs[0].value,
            vencimento: formatarDataBR(inputs[1].value),
            setorLote: inputs[2].value,
          });
        }
      });

      const fornecedor = document.getElementById('fornecedor').value;
      const categoria = document.getElementById('categoria').value;
      const subcategoria = document.getElementById('subcategoria').value;

      await salvarValorUnico('bdfornecedores', fornecedor);
      await salvarValorUnico('bdcategorias', categoria);
      await salvarValorUnico('bdsubcategorias', subcategoria);

      const dadosFinanceiro = {
        data: formatarDataBR(new Date()), // salva a data no formato dd/mm/aaaa
        tipo: document.getElementById('tipo').value,
        fornecedor,
        nota: document.getElementById('nota').value,
        categoria,
        subcategoria,
        observacao: document.getElementById('observacao').value,
        produtos,
        pagamentos,
      };


      await listarCadastrosFinanceiros();
      await addDoc(collection(db, 'bdFinanceiro'), dadosFinanceiro);
      mostrarAlerta('Cadastro financeiro salvo com sucesso!', 'feedback');

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
});

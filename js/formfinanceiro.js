// js/financeiro.js
import { db } from './firebaseConfig.js';
import { mostrarAlerta } from './alerta.js';
import { collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  const produtosTabela = document.getElementById('produtosFinanceiro');
  const btnAddProduto = document.getElementById('addProduto');
  const pagamentosTabela = document.getElementById('pagamentosFinanceiro');
  const btnAddPagamento = document.getElementById('addPagamento');
  const totalGeralProdutos = document.getElementById('totalGeralProdutos');
  const formFinanceiro = document.getElementById('formFinanceiro');

  async function buscarLotesAtivos() {
    const snapshot = await getDocs(collection(db, 'bdlotes'));
    return snapshot.docs
      .map(doc => doc.data())
      .filter(lote => lote.status.toLowerCase() === 'ativo')
      .map(lote => `${lote.galpao} (${lote.idlote})`);
  }

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
      <td class="border p-2"><input type="text" class="w-full border rounded px-2 py-1" required placeholder="Produto"></td>
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
    try {
      const produtos = [];
      produtosTabela.querySelectorAll('tr').forEach(tr => {
        const inputs = tr.querySelectorAll('input');
        if (inputs.length >= 4) {
          produtos.push({
            produto: inputs[0].value,
            quantidade: parseFloat(inputs[1].value) || 0,
            preco: parseFloat(inputs[2].value) || 0,
            total: parseFloat(inputs[3].value.replace(/[^0-9,.-]+/g, '').replace(',', '.')) || 0,
          });
        }
      });

      const pagamentos = [];
      pagamentosTabela.querySelectorAll('tr').forEach(tr => {
        const inputs = tr.querySelectorAll('input, select');
        if (inputs.length >= 3) {
          pagamentos.push({
            parcela: inputs[0].value,
            vencimento: inputs[1].value,
            setorLote: inputs[2].value,
          });
        }
      });

      const dadosFinanceiro = {
        data: new Date().toISOString(),
        tipo: document.getElementById('tipo').value,
        fornecedor: document.getElementById('fornecedor').value,
        nota: document.getElementById('nota').value,
        categoria: document.getElementById('categoria').value,
        subcategoria: document.getElementById('subcategoria').value,
        observacao: document.getElementById('observacao').value,
        produtos,
        pagamentos,
      };

      await addDoc(collection(db, 'bdFinanceiro'), dadosFinanceiro);
      mostrarAlerta('Cadastro financeiro salvo com sucesso!', 'feedback');

      formFinanceiro.reset();
      produtosTabela.innerHTML = "";
      pagamentosTabela.innerHTML = "";
      totalGeralProdutos.textContent = "R$ 0,00";
    } catch (error) {
      console.error('Erro ao salvar financeiro:', error);
      mostrarAlerta('Erro ao salvar financeiro.', 'alerta');
    }
  });
});

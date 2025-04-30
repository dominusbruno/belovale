// js/teste.js
import { db } from './firebaseConfig.js';
import { collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Função para buscar lotes ativos
async function buscarLotesAtivos() {
  const snapshot = await getDocs(collection(db, 'bdlotes'));
  return snapshot.docs
    .map(doc => doc.data())
    .filter(lote => lote.status.toLowerCase() === 'ativo')
    .map(lote => `${lote.galpao} (${lote.idlote})`);
}

// Função para gerar data de vencimento (meses adiante)
function gerarDataVencimento(mesesAdiante) {
  const hoje = new Date();
  hoje.setMonth(hoje.getMonth() + mesesAdiante);
  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const ano = hoje.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

// Função para gerar uma data aleatória no passado
function gerarDataAleatoria() {
  const hoje = new Date();
  const diasAtras = Math.floor(Math.random() * 30); // até 30 dias atrás
  hoje.setDate(hoje.getDate() - diasAtras);
  return hoje; // Retorna objeto Date real
}

// Função para formatar data para padrão brasileiro
function formatarDataBR(data) {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

// Função para gerar cadastros financeiros falsos
async function gerarDadosFinanceirosFalsos(quantidade = 5) {
  const fornecedores = ["Fornecedor A", "Fornecedor B", "Fornecedor C"];
  const categorias = ["Categoria X", "Categoria Y", "Categoria Z"];
  const subcategorias = ["Subcategoria 1", "Subcategoria 2"];
  const produtos = ["Produto A", "Produto B", "Produto C", "Produto D"];
  const lotes = await buscarLotesAtivos();
  const tipos = ["Receita", "Despesa"];
  const statusOpcoes = ["PAGO", "PENDENTE", "AGENDADO"]; // Novos status possíveis

  for (let i = 0; i < quantidade; i++) {
    const produtosGerados = [];
    const numProdutos = Math.floor(Math.random() * 3) + 1; // de 1 a 3 produtos

    // Gera produtos
    for (let j = 0; j < numProdutos; j++) {
      const preco = (Math.random() * 500).toFixed(2);
      const quantidade = Math.floor(Math.random() * 10) + 1;
      produtosGerados.push({
        produto: produtos[Math.floor(Math.random() * produtos.length)],
        quantidade: quantidade,
        preco: parseFloat(preco),
        total: parseFloat((preco * quantidade).toFixed(2))
      });
    }

    // Calcula total dos produtos
    const totalProdutos = produtosGerados.reduce((acc, p) => acc + p.total, 0);

    const pagamentosGerados = [];
    const parcelas = Math.floor(Math.random() * 4) + 1; // de 1 a 4 parcelas
    const valorParcela = parseFloat((totalProdutos / parcelas).toFixed(2));

    // Gera pagamentos
    for (let k = 1; k <= parcelas; k++) {
      pagamentosGerados.push({
        parcela: `${k}/${parcelas}`,
        vencimento: gerarDataVencimento(k),
        setorLote: lotes.length ? lotes[Math.floor(Math.random() * lotes.length)] : "Sem Lote",
        valor: valorParcela,
        status: statusOpcoes[Math.floor(Math.random() * statusOpcoes.length)] // Escolhe um status aleatório
      });
    }

    // Data real de criação
    const dataReal = gerarDataAleatoria();

    // Monta o registro completo
    const dadosFinanceiro = {
      dataFormatada: formatarDataBR(dataReal),
      timestamp: dataReal,
      tipo: tipos[Math.floor(Math.random() * tipos.length)],
      fornecedor: fornecedores[Math.floor(Math.random() * fornecedores.length)],
      nota: "BR" + (Math.floor(Math.random() * 9000) + 1000),
      categoria: categorias[Math.floor(Math.random() * categorias.length)],
      subcategoria: subcategorias[Math.floor(Math.random() * subcategorias.length)],
      observacao: "Observação gerada automaticamente",
      produtos: produtosGerados,
      pagamentos: pagamentosGerados
    };

    // Salva no Firestore
    await addDoc(collection(db, 'bdFinanceiro'), dadosFinanceiro);
  }
}

// Disponibilizar no console para testes
window.gerarDadosFinanceirosFalsos = gerarDadosFinanceirosFalsos;

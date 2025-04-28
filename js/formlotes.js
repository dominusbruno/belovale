// lotes.js
import { db } from './firebaseConfig.js';
import { mostrarAlerta } from './alerta.js';
import { collection, getDocs, getDoc, addDoc, setDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  carregarLotes();

  const formLote = document.getElementById("formLote");

  if (formLote) {
    formLote.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = {
        idlote: formLote.idlote.value,
        status: formLote.status.value,
        galpao: formLote.galpao.value,
        proprietario: Array.from(formLote.proprietario.selectedOptions).map(opt => opt.value),
        linhagem: formLote.linhagem.value,
        nascimento: formLote.nascimento.value,
        chegada: formLote.chegada.value,
        quantidade: parseInt(formLote.quantidade.value)
      };

      try {
        const existe = await getDocs(collection(db, "bdlotes"));
        const duplicado = existe.docs.find(doc => doc.data().idlote === data.idlote && doc.id !== formLote.dataset.editingId);

        if (duplicado) {
          mostrarAlerta("Já existe um lote com este ID.", "alerta");
          return;
        }

        if (formLote.dataset.editingId) {
          const docRef = doc(db, "bdlotes", formLote.dataset.editingId);
          await setDoc(docRef, data);
          mostrarAlerta("Lote atualizado com sucesso!", "feedback");
          formLote.removeAttribute("data-editing-id");
        } else {
          await addDoc(collection(db, "bdlotes"), data);
          mostrarAlerta("Lote salvo com sucesso!", "feedback");
        }

        formLote.reset();
        carregarLotes();
      } catch (error) {
        console.error("Erro ao salvar lote:", error);
        mostrarAlerta("Erro ao salvar o lote. Verifique o console.", "alerta");
      }
    });
  }

  const filtroAtivos = document.getElementById("filtroAtivos");
  if (filtroAtivos) {
    filtroAtivos.addEventListener("change", (e) => {
      e.preventDefault();
      carregarLotes(e.target.checked);
    });
  }
});

async function carregarLotes(mostrarApenasAtivos = false) {
  const tabela = document.getElementById("corpoListaLotes");
  if (!tabela) return;
  tabela.innerHTML = "";

  const q = query(collection(db, "bdlotes"), orderBy("galpao"));
  const snapshot = await getDocs(q);

  let lotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  if (mostrarApenasAtivos) {
    lotes = lotes.filter(lote => lote.status.toLowerCase() === "ativo");
  }

  lotes.sort((a, b) => {
    if (a.status.toLowerCase() !== b.status.toLowerCase()) {
      return a.status.toLowerCase() === "ativo" ? -1 : 1;
    }
    if (a.galpao < b.galpao) return -1;
    if (a.galpao > b.galpao) return 1;
    return 0;
  });

  lotes.forEach((lote) => {
    const idadeSemanas = calcularIdadeAtual(lote.nascimento);
    const linha = document.createElement("tr");

    linha.classList.add(lote.status.toLowerCase() === "ativo" ? "bg-green-100" : "bg-red-100");

    linha.innerHTML = `
      <td class="border-t px-3 py-2 text-center">${lote.galpao}</td>
      <td class="border-t px-3 py-2 text-center">${lote.idlote}</td>
      <td class="border-t px-3 py-2 text-center">${idadeSemanas} sem</td>
      <td class="border-t px-3 py-2 text-center">${lote.linhagem}</td>
      <td class="border-t px-3 py-2 text-center">${lote.quantidade}</td>
      <td class="border-t px-3 py-2 text-center">${Array.isArray(lote.proprietario) ? lote.proprietario.join(", ") : lote.proprietario}</td>
      <td class="border-t px-3 py-2 text-center">${lote.status}</td>
      <td class="border-t px-3 py-2 text-center">
        <button onclick="editarLote('${lote.id}')" class="text-blue-800 hover:text-red-600">
          <i class="fas fa-edit text-xl"></i>
        </button>
      </td>
    `;

    tabela.appendChild(linha);
  });
}

function calcularIdadeAtual(dataNascimento) {
  const nascimento = new Date(dataNascimento);
  const hoje = new Date();
  const diferencaDias = Math.floor((hoje - nascimento) / (1000 * 60 * 60 * 24));
  const semanas = Math.floor((diferencaDias + 6) / 7);
  return semanas;
}

// Função global para editar lotes
window.editarLote = async function (id) {
  try {
    const docRef = doc(db, "bdlotes", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const dados = docSnap.data();
      const formLote = document.getElementById("formLote");

      formLote.dataset.editingId = id;
      formLote.idlote.value = dados.idlote;
      formLote.status.value = dados.status;
      formLote.galpao.value = dados.galpao;
      Array.from(formLote.proprietario.options).forEach(option => {
        option.selected = dados.proprietario.includes(option.value);
      });
      formLote.linhagem.value = dados.linhagem;
      formLote.nascimento.value = dados.nascimento;
      formLote.chegada.value = dados.chegada;
      formLote.quantidade.value = dados.quantidade;

      navigateTo('form-lotes');
    } else {
      mostrarAlerta("Lote não encontrado", "alerta");
    }
  } catch (error) {
    console.error("Erro ao carregar lote para edição:", error);
    mostrarAlerta("Erro ao carregar lote para edição.", "alerta");
  }
};

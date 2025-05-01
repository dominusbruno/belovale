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

  // Define os campos dinâmicos usados na tabela e formulário
  const estrutura = [
    { campo: 'loteStatus', label: 'Status' },
    { campo: 'loteIdentificador', label: 'Identificador' },
    { campo: 'loteLinhagem', label: 'Linhagem' },
    { campo: 'loteGalpao', label: 'Galpão', tipo: 'select', opcoes: ['Pinteiro', 'Recria', '01', '02', '03', '04', '05'] },
    { campo: 'loteProprietario', label: 'Proprietário' },
    { campo: 'loteDataNascimento', label: 'Nascimento', tipo: 'date' },
    { campo: 'loteDataChegada', label: 'Chegada', tipo: 'date' },
    { campo: 'loteQuantAves', label: 'Qtd Aves' }
  ];

  let registros = [];
  let idEditando = null;

  // Gera dinamicamente o cabeçalho da tabela com base na estrutura
  const renderizarCabecalho = () => {
    const tabelaCabecalho = document.getElementById('tabelaCabecalho');
    tabelaCabecalho.innerHTML = '';
    const tr = document.createElement('tr');
    estrutura.forEach(col => {
      const th = document.createElement('th');
      th.className = 'px-4 py-2';
      th.textContent = col.label;
      tr.appendChild(th);
    });
    const thAcoes = document.createElement('th');
    thAcoes.className = 'px-4 py-2';
    thAcoes.textContent = 'Ações';
    tr.appendChild(thAcoes);
    tabelaCabecalho.appendChild(tr);
  };

  // Busca os registros do Firebase e atualiza a tabela
  const carregarRegistros = async () => {
    registros = [];
    const snapshot = await getDocs(collection(db, 'bdlotes'));
    snapshot.forEach(doc => {
      registros.push({ id: doc.id, ...doc.data() });
    });
    renderizarCabecalho();
    renderizarTabela();
  };

  // Gera as linhas da tabela com os registros carregados
  const renderizarTabela = () => {
    tabelaCorpo.innerHTML = '';
    registros.forEach((item, index) => {
      const tr = document.createElement('tr');
      estrutura.forEach(col => {
        const td = document.createElement('td');
        td.className = 'px-4 py-2 border-t';
        let valor = item[col.campo];
        if (col.tipo === 'date' && valor) {
          const [ano, mes, dia] = valor.split('-');
          valor = `${dia}/${mes}/${ano}`;
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
    });
  };

  // Cria e exibe o formulário para novo registro ou edição
  const abrirFormulario = (index = null) => {
    formContainer.classList.remove('hidden');
    formConteudo.innerHTML = '';
    idEditando = index !== null ? registros[index].id : null;

    estrutura.forEach(col => {
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
    btnSalvar.className = 'bg-blue-500 text-white px-4 py-2 mt-4 rounded hover:bg-blue-600';
    btnSalvar.addEventListener('click', salvarRegistro);
    formConteudo.appendChild(btnSalvar);

    const btnExcluir = document.createElement('button');
    if (idEditando) {
      btnExcluir.textContent = 'Excluir';
      btnExcluir.className = 'ml-4 bg-red-500 text-white px-4 py-2 mt-4 rounded hover:bg-red-600';
      btnExcluir.addEventListener('click', async () => {
        const confirmacao = confirm('Tem certeza que deseja excluir este registro?');
        if (confirmacao) {
          try {
            await deleteDoc(doc(db, 'bdlotes', idEditando));
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
  await updateDoc(doc(db, 'bdlotes', idEditando), novoRegistro);
  mostrarAlerta('Registro atualizado com sucesso.', 'success');
} else {
  novoRegistro.criadoEm = now;
  novoRegistro.atualizadoEm = now;
  await addDoc(collection(db, 'bdlotes'), novoRegistro);
  mostrarAlerta('Registro criado com sucesso.', 'success');
}


    formContainer.classList.add('hidden');
    formConteudo.innerHTML = '';
    await carregarRegistros();
  };

  btnNovo?.addEventListener('click', () => abrirFormulario());
  btnFechar?.addEventListener('click', () => {
    formContainer.classList.add('hidden');
    formConteudo.innerHTML = '';
  });

  await carregarRegistros();


});

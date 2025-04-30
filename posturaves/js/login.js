import { db } from './firebaseConfig.js';
import { mostrarAlerta } from './alerta.js';

import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

const formLogin = document.getElementById('formLogin');

formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();

  const loginInput = document.getElementById('login').value.trim().toLowerCase();
  const senhaInput = document.getElementById('senha').value.trim();

  if (!loginInput || !senhaInput) {
    mostrarAlerta('Preencha todos os campos.', 'error');
    return;
  }

  try {
    const colabQuery = query(
      collection(db, 'bdcolaboradores'),
      where('colabLogin', '==', loginInput)
    );

    const snapshot = await getDocs(colabQuery);

    if (snapshot.empty) {
      mostrarAlerta('Usuário não encontrado.', 'error');
      return;
    }

    const colaborador = snapshot.docs[0].data();

    if (colaborador.colabSenha !== senhaInput) {
      mostrarAlerta('Senha incorreta.', 'error');
      return;
    }

    mostrarAlerta(`Bem-vindo, ${colaborador.colabNome}!`, 'success');

    // Redireciona após leve delay
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);

  } catch (error) {
    console.error('Erro ao verificar login:', error);
    mostrarAlerta('Erro ao tentar realizar login.', 'error');
  }
});

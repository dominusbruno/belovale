import { db } from './firebaseConfig.js';
import { mostrarAlerta } from './utils.js';
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
    
    // Salva dados no localStorage
    localStorage.setItem('colabNome', colaborador.colabNome);
    localStorage.setItem('colabLogin', colaborador.colabLogin);
    localStorage.setItem('colabTipo', colaborador.colabTipo);

    //Set de tempo da seção válida.
    const validade = Date.now() + 1 * 60 * 60 * 1000; // 8h depois da seção ele precisa se logar.
    localStorage.setItem('authValidade', validade);


    // Redireciona após leve delay
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);

  } catch (error) {
    console.error('Erro ao verificar login:', error);
    mostrarAlerta('Erro ao tentar realizar login.', 'error');
  }
});

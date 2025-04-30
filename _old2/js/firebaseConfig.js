// firebaseConfig.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Configurações do seu Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBptELfvnAhLjdvXqNm4HZjbkgn-gWrmSk",
  authDomain: "posturaves-spa.firebaseapp.com",
  projectId: "posturaves-spa",
  storageBucket: "posturaves-spa.firebasestorage.app",
  messagingSenderId: "224817282928",
  appId: "1:224817282928:web:91302d7c7fcd7eb32fd9b5"
};

// Inicializa o app
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Exporta o db para os outros arquivos
export { db };

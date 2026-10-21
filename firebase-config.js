// Configuração do Firebase para o projeto IFAN
const firebaseConfig = {
  apiKey: "AIzaSyCYWeI3_iJOsyQQK6MKKfFmq_J7DiVRJVw",
  authDomain: "ifan-f8f19.firebaseapp.com",
  databaseURL: "https://ifan-f8f19-default-rtdb.firebaseio.com",
  projectId: "ifan-f8f19",
  storageBucket: "ifan-f8f19.firebasestorage.app",
  messagingSenderId: "298503400012",
  appId: "1:298503400012:web:fb887ebec5fb62fb6622e9",
  measurementId: "G-K6L32CX584"
};

// Inicialização segura para a versão compat
if (typeof firebase !== "undefined" && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Configuração do Firebase do IFAN. A autenticação é obrigatória.
// Estas chaves identificam o projeto; a segurança dos dados também depende
// das regras do Realtime Database no Console do Firebase.
window.IFAN_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCYWeI3_iJOsyQQK6MKKfFmq_J7DiVRJVw",
  authDomain: "ifan-f8f19.firebaseapp.com",
  databaseURL: "https://ifan-f8f19-default-rtdb.firebaseio.com",
  projectId: "ifan-f8f19",
  storageBucket: "ifan-f8f19.firebasestorage.app",
  messagingSenderId: "298503400012",
  appId: "1:298503400012:web:fb887ebec5fb62fb6622e9"
};
// Compatibilidade com páginas antigas do projeto sem declarar const global.
window.firebaseConfig = window.IFAN_FIREBASE_CONFIG;
window.IFAN_EXIGIR_LOGIN = true;

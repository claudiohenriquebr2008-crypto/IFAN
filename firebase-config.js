
(function () {
  const config = {
    apiKey: "SUA_API_KEY",
    authDomain: "ifan-f8f19.firebaseapp.com",
    databaseURL: "https://ifan-f8f19-default-rtdb.firebaseio.com",
    projectId: "ifan-f8f19",
    storageBucket: "ifan-f8f19.firebasestorage.app",
    messagingSenderId: "298503400012",
    appId: "1:298503400012:web:fb887ebec5fb62fb6622e9",
    measurementId: "G-K6L32CX584"
  };

  if (typeof firebase === "undefined") {
    console.error("Firebase SDK não foi carregado.");
    return;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(config);
  }

  window.db = firebase.database();
  window.auth = firebase.auth();
})();

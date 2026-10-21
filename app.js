
 // app.js - Sistema IFAN
(function () {
  "use strict";

  if (window.__IFAN_APP_LOADED__) return;
  window.__IFAN_APP_LOADED__ = true;

  let fbOk = false;

  try {
    if (typeof firebase !== "undefined") {
      // O firebase-config.js deve ser carregado antes deste arquivo.
      if (
        !firebase.apps.length &&
        window.firebaseConfig
      ) {
        firebase.initializeApp(window.firebaseConfig);
      }

      fbOk =
        firebase.apps.length > 0 &&
        typeof firebase.database === "function" &&
        typeof firebase.auth === "function";
    }
  } catch (e) {
    console.error("Erro ao inicializar Firebase:", e);
  }

  // O restante do código original começa aqui.

((function () {
  "use strict";

  if (window.__IFAN_APP_LOADED__) return;
  window.__IFAN_APP_LOADED__ = true;
const TIPOS = [
  "Caixa", "Tarol", "Bumbo", "Surdo pequeno",
  "Surdo médio", "Surdo grande", "Treme terra",
  "Prato", "Lira", "Corneta", "Fuzil",
  "Repinique", "Tamborim", "Chocalho",
  "Pandeiro", "Agogô", "Triângulo", "Cuíca"
];

const administradoresAutorizados = [
    "administrativo945@gmail.com",
    "claudiohenriquebr2008@gmail.com"
];

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const idnovo = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const fmt = d => d ? d.split("-").reverse().join("/") : "";
const nomeInst = i => i ? `${i.tipo} nº ${i.numero}` : "Sem instrumento";
const porNome = (a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
const porSala = (a, b) => String(a || "").localeCompare(String(b || ""), "pt-BR", { numeric: true });

let currentUser = null;
let isAdmin = false;
let fbOk = false;

try {
  if (typeof firebase !== "undefined") {
    if (!firebase.apps.length && window.firebaseConfig) {
      firebase.initializeApp(window.firebaseConfig);
    }

    fbOk =
      firebase.apps.length > 0 &&
      typeof firebase.database === "function" &&
      typeof firebase.auth === "function";
  }
} catch (e) {
  console.error("Erro ao inicializar Firebase:", e);
}
})();

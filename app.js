// app.js - Sistema IFAN Limpo e Sem Erros de Escape
(function () {
    
let fbOk = false;

try {
  if (
    typeof firebase !== "undefined" &&
    window.firebaseConfig &&
    firebase.apps.length > 0
  ) {
    fbOk = true;
  }
} catch (e) {
  console.error("Erro ao verificar Firebase:", e);
}

"use strict";
if (window.__IFAN_APP_LOADED__) return;
window.__IFAN_APP_LOADED__ = true;

const TIPOS = ["Caixa","Tarol","Bumbo","Surdo pequeno","Surdo médio","Surdo grande","Treme terra","Prato","Lira","Corneta","Fuzil","Repinique","Tamborim","Chocalho","Pandeiro","Agogô","Triângulo","Cuíca"];
const ESTADOS = { bom: "Bom estado", mal: "Mal estado", desafinado: "Desafinado" };
const PAGINAS = [
    ["index.html","🏠 Início","inicio"],
    ["chamada.html","📋 Chamada","chamada"],
    ["alunos.html","👥 Alunos","alunos"],
    ["instrumentos.html","🥁 Instrumentos","instrumentos"],
    ["avisos.html","📣 Avisos","avisos"],
    ["eventos.html","📅 Eventos","eventos"],
    ["problemas.html","🔧 Problemas","problemas"]
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
    if (typeof firebase !== "undefined" && typeof firebaseConfig !== "undefined") {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        fbOk = !!firebase.database;
    }
} catch (e) { console.error("Firebase init:", e); }

const DB = {
    cloud: fbOk,
    erro: "",
    async list(c) {
        if (!this.cloud || !firebase.auth().currentUser) throw new Error("Sem conexão autenticada com o Firebase.");
        try {
            const snap = await firebase.database().ref(c).once("value");
            const m = snap.val() || {};
            return Object.entries(m).filter(([, v]) => v && typeof v === "object").map(([id, v]) => ({ ...v, id }));
        } catch (err) {
            this.erro = err.code || err.message || String(err);
            throw new Error("Não foi possível carregar os dados do Firebase: " + this.erro);
        }
    },
    async save(c, o) {
        if (!this.cloud || !firebase.auth().currentUser) throw new Error("É necessário estar conectado ao Firebase para salvar.");
        const id = o.id || idnovo(); const v = { ...o }; delete v.id;
        try { await firebase.database().ref(c + "/" + id).set(v); return { ...v, id }; }
        catch (err) { this.erro = err.code || err.message || String(err); throw new Error("Falha ao salvar no Firebase: " + this.erro); }
    },
    async del(c, id) {
        if (!this.cloud || !firebase.auth().currentUser) throw new Error("É necessário estar conectado ao Firebase para excluir.");
        try { await firebase.database().ref(c + "/" + id).remove(); }
        catch (err) { this.erro = err.code || err.message || String(err); throw new Error("Falha ao excluir no Firebase: " + this.erro); }
    }
};

function toast(msg, err = false) {
    const old = $("toast"); if (old) old.remove();
    const e = document.createElement("div");
    e.id = "toast"; if (err) e.className = "err";
    e.textContent = msg; document.body.append(e);
    setTimeout(() => e.remove(), 3500);
}

function header(page) {
    const status = DB.cloud ? "🟢 Conectado: " + (isAdmin ? "Administrador" : "Aluno") : "🔴 Firebase desconectado";
    const links = isAdmin ? PAGINAS : PAGINAS.filter(p => ["avisos","eventos","problemas"].includes(p[2]));
    const topEl = $("top");
    if (!topEl) return;
    topEl.innerHTML = `
        <h1>🎺 FANFARRA</h1>
        <nav>` + links.map(p => `<a href="${p[0]}" class="${p[2] === page ? "on" : ""}">${p[1]}</a>`).join("") + `
            ` + (isAdmin ? `<a href="cadastrar-aluno.html" class="${page === "cadastro-aluno" ? "on" : ""}">➕ Aluno</a><a href="cadastrar-instrumento.html" class="${page === "cadastro-instrumento" ? "on" : ""}">➕ Instrumento</a>` : "") + `
        </nav><div class="status">${status}<span> · ${esc(currentUser?.email || "")}</span><button type="button" class="sec" id="logoutBtn">Sair</button></div>`;
    
    const logoutBtn = $("logoutBtn");
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            try { await firebase.auth().signOut(); } catch (e) {}
            location.href = "login.html";
        };
    }
}

const badge = e => `<span class="b ${esc(e)}">${esc(ESTADOS[e] || e)}</span>`;
const opt = (val, label, sel) => `<option value="${esc(val)}"${sel ? " selected" : ""}>${esc(label)}</option>`;
const layout = (title, body) => { const c = $("conteudo"); if (c) c.innerHTML = `<h2>${title}</h2>` + (DB.erro ? `<div class="warnbox"><b>Erro de conexão.</b></div>` : "") + body; };

let dataSel = hoje(), salaSel = "";

async function render() {
    const page = document.body.dataset.page || "inicio";
    try {
        if (!isAdmin && !["inicio","avisos","eventos","problemas","cadastro-aluno"].includes(page)) { location.replace("avisos.html"); return; }
        
        // Carrega dados de forma segura
        let al = [], ins = [], avisos = [], eventos = [], problemas = [], presencas = [], solicitacoesEventos = [], solicitacoesProblemas = [], cadastrosAlunos = [];
        if (isAdmin) {
            al = await DB.list("alunos").catch(()=>[]);
            ins = await DB.list("instrumentos").catch(()=>[]);
            avisos = await DB.list("avisos").catch(()=>[]);
            eventos = await DB.list("eventos").catch(()=>[]);
            problemas = await DB.list("problemas").catch(()=>[]);
            presencas = await DB.list("presencas").catch(()=>[]);
            solicitacoesEventos = await DB.list("solicitacoesEventos").catch(()=>[]);
            solicitacoesProblemas = await DB.list("solicitacoesProblemas").catch(()=>[]);
            cadastrosAlunos = await DB.list("cadastrosAlunos").catch(()=>[]);
        } else {
            avisos = await DB.list("avisos").catch(()=>[]);
            eventos = await DB.list("eventos").catch(()=>[]);
        }

        header(page);
        const dono = i => al.find(a => a.instrumentoId === i.id);
        const instDe = a => ins.find(i => i.id === a.instrumentoId);

        if (page === "inicio") {
            if (!isAdmin) {
                layout("Bem-vindo à Fanfarra", `<p>Você está conectado como aluno.</p>`);
            } else {
                layout("Painel da Fanfarra", `<div class="stats"><div class="stat"><b>${al.length}</b>Alunos</div><div class="stat"><b>${ins.length}</b>Instrumentos</div></div>`);
            }
        }
    } catch (e) {
        console.error(e);
    }
}

if (fbOk) {
    firebase.auth().onAuthStateChanged(user => {
        currentUser = user;
        if (!user) {
            if (!location.pathname.endsWith("login.html")) {
                location.replace("login.html");
            }
            return;
        }
        const emailUser = (user.email || "").trim().toLowerCase();
        isAdmin = administradoresAutorizados.some(e => e.toLowerCase() === emailUser);

        if (location.pathname.endsWith("login.html")) {
            location.replace("index.html");
            return;
        }
        render();
    });
} else {
    currentUser = { email: "offline@local" };
    isAdmin = true;
    render();
}
})();

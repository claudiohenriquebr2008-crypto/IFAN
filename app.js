// app.js - Sistema IFAN Completo e Corrigido
(function () {
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

// Lista oficial de administradores autorizados (ignorando maiúsculas/minúsculas)
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

/* ---------- Firebase / armazenamento ---------- */
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
            throw new Error(/permission/i.test(this.erro) ? "Acesso negado pelas regras do Firebase. Confira as regras e o e-mail de administrador." : "Não foi possível carregar os dados do Firebase: " + this.erro);
        }
    },
    async save(c, o) {
        if (!this.cloud || !firebase.auth().currentUser) throw new Error("É necessário estar conectado ao Firebase para salvar.");
        const id = o.id || idnovo(); const v = { ...o }; delete v.id;
        try { await firebase.database().ref(`${c}/${id}`).set(v); return { ...v, id }; }
        catch (err) { this.erro = err.code || err.message || String(err); throw new Error(/permission/i.test(this.erro) ? "Você não tem permissão para realizar esta ação." : "Falha ao salvar no Firebase: " + this.erro); }
    },
    async del(c, id) {
        if (!this.cloud || !firebase.auth().currentUser) throw new Error("É necessário estar conectado ao Firebase para excluir.");
        try { await firebase.database().ref(`${c}/${id}`).remove(); }
        catch (err) { this.erro = err.code || err.message || String(err); throw new Error(/permission/i.test(this.erro) ? "Você não tem permissão para excluir este registro." : "Falha ao excluir no Firebase: " + this.erro); }
    }
};

/* ---------- Interface base ---------- */
function toast(msg, err = false) {
    const old = $("toast"); if (old) old.remove();
    const e = document.createElement("div");
    e.id = "toast"; if (err) e.className = "err";
    e.textContent = msg; document.body.append(e);
    setTimeout(() => e.remove(), 3500);
}

function header(page) {
    const status = DB.cloud ? `🟢 Conectado: ${isAdmin ? "Administrador" : "Aluno"}` : "🔴 Firebase desconectado";
    const links = isAdmin ? PAGINAS : PAGINAS.filter(p => ["avisos","eventos","problemas"].includes(p[2]));
    const topEl = $("top");
    if (!topEl) return;
    topEl.innerHTML = `
        <h1>🎺 FANFARRA</h1>
        <nav>${links.map(p => `<a href="${p[0]}" class="${p[2] === page ? "on" : ""}">${p[1]}</a>`).join("")}
            ${isAdmin ? `<a href="cadastrar-aluno.html" class="${page === "cadastro-aluno" ? "on" : ""}">➕ Aluno</a><a href="cadastrar-instrumento.html" class="${page === "cadastro-instrumento" ? "on" : ""}">➕ Instrumento</a>` : ""}
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
const layout = (title, body) => { const c = $("conteudo"); if (c) c.innerHTML = `<h2>${title}</h2>${DB.erro ? avisoErro() : ""}${body}`; };

function avisoErro() {
    return `<div class="warnbox"><b>Não foi possível falar com o banco online (${esc(DB.erro)}).</b><br>Confira a internet e as regras do Firebase.</div>`;
}

async function all() {
    if (!isAdmin) {
        const [avisos, eventos] = await Promise.all([DB.list("avisos"), DB.list("eventos")]);
        return { alunos: [], instrumentos: [], avisos, eventos, problemas: [], presencas: [], solicitacoesEventos: [], solicitacoesProblemas: [], cadastrosAlunos: [] };
    }
    const cols = ["alunos","instrumentos","avisos","eventos","problemas","presencas","solicitacoesEventos","solicitacoesProblemas","cadastrosAlunos"];
    const r = await Promise.all(cols.map(c => DB.list(c)));
    return Object.fromEntries(cols.map((c, i) => [c, r[i]]));
}

let dataSel = hoje(), salaSel = "";

async function render() {
    const page = document.body.dataset.page || "inicio";
    try {
        if (!isAdmin && !["inicio","avisos","eventos","problemas","cadastro-aluno"].includes(page)) { location.replace("avisos.html"); return; }
        const d = await all();
        header(page);
        const al = d.alunos, ins = d.instrumentos;
        const dono = i => al.find(a => a.instrumentoId === i.id);
        const instDe = a => ins.find(i => i.id === a.instrumentoId);

        if (page === "inicio") {
            if (!isAdmin) {
                layout("Bem-vindo à Fanfarra", `<p>Você está conectado como aluno. Aqui você vê os avisos, eventos e pode relatar problemas.</p><div class="menu"><a href="avisos.html"><b>📣 Avisos</b><small>Consultar comunicados</small></a><a href="eventos.html"><b>📅 Eventos</b><small>Ver os próximos eventos</small></a><a href="problemas.html"><b>🔧 Relatar problema</b><small>Enviar relato privado</small></a></div>${d.avisos.slice(-3).reverse().map(a => `<div class="item"><div><b>${esc(a.nome)}</b><br><small>${esc(a.descricao || "")}</small></div></div>`).join("")}`);
            } else {
                const livres = ins.filter(i => !dono(i)).length;
                const abertos = d.problemas.filter(p => p.status !== "resolvido").length + d.solicitacoesProblemas.filter(p => p.status !== "resolvido").length;
                layout("Painel da Fanfarra", `<div class="stats">${[[al.length,"Alunos"],[ins.length,"Instrumentos"],[livres,"Disponíveis"],[abertos,"Problemas abertos"],[d.solicitacoesEventos.length,"Sugestões de eventos"]].map(x => `<div class="stat"><b>${x[0]}</b>${x[1]}</div>`).join("")}</div><div class="menu">${PAGINAS.slice(1).map(p => `<a href="${p[0]}"><b>${p[1]}</b><small>Abrir seção</small></a>`).join("")}</div><h3>Próximos eventos</h3>${d.eventos.filter(e => (e.data || "") >= hoje()).sort((a,b)=>(a.data||"").localeCompare(b.data||"")).slice(0,5).map(e=>`<div class="item"><div><b>${esc(e.nome)}</b><br><small>${fmt(e.data)}${esc(e.extra||"")}</small></div></div>`).join("") || '<div class="empty">Nenhum evento cadastrado.</div>'}<h3>Avisos recentes</h3>${d.avisos.slice(-3).reverse().map(a=>`<div class="item"><div><b>${esc(a.nome)}</b><br><small>${esc(a.descricao||"")}</small></div></div>`).join("") || '<div class="empty">Nenhum aviso.</div>'}`);
            }
        } else if (page === "cadastro-aluno" && !isAdmin) {
            const meu = (await firebase.database().ref("cadastrosAlunos/" + currentUser.uid).once("value")).val();
            layout("Cadastrar", meu
                ? `<div class="card"><b>Cadastro enviado.</b><p>${esc(meu.nome)} · Sala ${esc(meu.sala)}. O administrador vai confirmar seus dados.</p></div>`
                : `<p>Preencha seus dados de aluno. O administrador confirma depois.</p><div class="card"><form id="formCadastroAluno"><label>Nome completo</label><input name="nome" required maxlength="120"><label>Sala</label><input name="sala" required maxlength="20" placeholder="Ex.: 7A"><label>Nº do aluno (opcional)</label><input name="numero" type="number" min="1"><p><button type="submit">Enviar cadastro</button></p></form></div>`);
        } else if (page === "alunos" || page === "cadastro-aluno") {
            layout("Alunos", `
                <div class="card"><h3 style="margin-top:0">Cadastrar aluno</h3>
                    <form id="formAluno">
                        <div class="row">
                            <div><label>Nome completo</label><input name="nome" required></div>
                            <div><label>Sala</label><input name="sala" placeholder="Ex.: 7A ou 12" required></div>
                            <div><label>Nº do aluno</label><input name="numero" type="number" min="1"></div>
                            <div><label>Instrumento</label>
                                <select name="instrumentoId"><option value="">Sem instrumento</option>
                                    ${ins.filter(i => !dono(i)).map(i => opt(i.id, nomeInst(i))).join("")}</select></div>
                        </div>
                        <p><button type="submit">Salvar aluno</button></p>
                    </form></div>
                ${d.cadastrosAlunos.length ? `<h3>Cadastros recebidos</h3>${d.cadastrosAlunos.map(c => `<div class="item"><div class="main"><b>${esc(c.nome)}</b><br><small>Sala ${esc(c.sala)} · ${esc(c.email || "")}</small></div><div><button type="button" data-aprovar-aluno="${esc(c.id)}">Aprovar</button><button type="button" class="del" data-del="cadastrosAlunos" data-id="${esc(c.id)}">Excluir</button></div></div>`).join("")}` : ""}
                <div id="lista">${[...al].sort((a, b) => porSala(a.sala || a.turma, b.sala || b.turma) || porNome(a, b)).map(a => `
                    <div class="item">
                        <div class="main"><b>${esc(a.nome)}</b>${a.numero ? ` <span class="num">${esc(a.numero)}</span>` : ""}<br>
                            <small>Sala ${esc(a.sala \vert{}\vert{} a.turma \vert{}\vert{} "—")} · ${esc(nomeInst(instDe(a)))}</small></div>
                        <div>
                            <select

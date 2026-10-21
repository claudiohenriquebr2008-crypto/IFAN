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
const REGRAS = '{ "rules": { ".read": true, ".write": true } }';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const idnovo = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const fmt = d => d ? d.split("-").reverse().join("/") : "";
const nomeInst = i => i ? `${i.tipo} nº ${i.numero}` : "Sem instrumento";
const porNome = (a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
const porSala = (a, b) => String(a || "").localeCompare(String(b || ""), "pt-BR", { numeric: true });

const EXIGIR_LOGIN = typeof EXIGIR_LOGIN_CFG !== "undefined" ? EXIGIR_LOGIN_CFG : false;

/* ---------- Firebase / armazenamento ---------- */
let fbOk = false;
try {
  if (typeof firebase !== "undefined" && typeof firebaseConfig !== "undefined") {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    fbOk = !!firebase.database;
  }
} catch (e) { console.error("Firebase init:", e); }

const localKey = c => "ifan_fix_" + c;
function localList(c) { try { return JSON.parse(localStorage.getItem(localKey(c)) || "{}"); } catch { return {}; } }
function localSet(c, m) { localStorage.setItem(localKey(c), JSON.stringify(m)); }

const DB = {
  cloud: fbOk,
  erro: "",
  falhou(err) {
    this.cloud = false;
    this.erro = (err && (err.code || err.message)) || String(err);
    console.error("Firebase:", err);
  },
  async list(c) {
    let m;
    if (this.cloud) {
      try { m = (await firebase.database().ref(c).once("value")).val() || {}; }
      catch (err) { this.falhou(err); m = localList(c); }
    } else m = localList(c);
    return Object.entries(m).filter(([, v]) => v && typeof v === "object").map(([id, v]) => ({ ...v, id }));
  },
  async save(c, o) {
    const id = o.id || idnovo();
    const v = { ...o }; delete v.id;
    if (this.cloud) {
      try { await firebase.database().ref(`${c}/${id}`).set(v); return { ...v, id }; }
      catch (err) { this.falhou(err); }
    }
    const m = localList(c); m[id] = v; localSet(c, m);
    return { ...v, id };
  },
  async del(c, id) {
    if (this.cloud) {
      try { await firebase.database().ref(`${c}/${id}`).remove(); return; }
      catch (err) { this.falhou(err); }
    }
    const m = localList(c); delete m[id]; localSet(c, m);
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
  const status = DB.cloud
    ? "🟢 Banco compartilhado conectado"
    : "⚠️ Salvando só neste aparelho (sem conexão com o banco)";
  $("top").innerHTML = `
    <h1>🎺 FANFARRA</h1>
    <nav>
      ${PAGINAS.map(p => `<a href="${p[0]}" class="${p[2] === page ? "on" : ""}">${p[1]}</a>`).join("")}
      <a href="cadastrar-aluno.html" class="${page === "cadastro-aluno" ? "on" : ""}">➕ Aluno</a>
      <a href="cadastrar-instrumento.html" class="${page === "cadastro-instrumento" ? "on" : ""}">➕ Instrumento</a>
    </nav>
    <div class="status">${status}
      ${EXIGIR_LOGIN ? '<button type="button" class="sec" id="logoutBtn">Sair</button>' : ""}
    </div>`;
}

const badge = e => `<span class="b ${esc(e)}">${esc(ESTADOS[e] || e)}</span>`;
const opt = (val, label, sel) => `<option value="${esc(val)}"${sel ? " selected" : ""}>${esc(label)}</option>`;
const layout = (title, body) => { $("conteudo").innerHTML = `<h2>${title}</h2>${DB.erro ? avisoErro() : ""}${body}`; };

function avisoErro() {
  const permissao = /permission/i.test(DB.erro);
  return `<div class="warnbox"><b>O banco online não respondeu (${esc(DB.erro)}).</b> Os dados estão sendo guardados só neste aparelho.
    ${permissao ? `<br>No Firebase Console → Realtime Database → Regras, cole e clique em Publicar:<pre>${esc(REGRAS)}</pre>` : "<br>Confira a internet e o databaseURL em firebase-config.js."}</div>`;
}

/* Não redesenha a tela enquanto a pessoa está digitando */
function emEdicao() {
  const a = document.activeElement;
  if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && $("conteudo")?.contains(a)) return true;
  return [...document.querySelectorAll("#conteudo form")].some(f =>
    [...f.elements].some(el => /^(text|number|textarea|search)$/.test(el.type) && el.value));
}

async function all() {
  const cols = ["alunos","instrumentos","avisos","eventos","problemas","presencas"];
  const r = await Promise.all(cols.map(c => DB.list(c)));
  return Object.fromEntries(cols.map((c, i) => [c, r[i]]));
}

/* estado da tela de chamada (sobrevive aos redesenhos) */
let dataSel = hoje(), salaSel = "";

async function render() {
  const page = document.body.dataset.page || "inicio";
  try {
    const d = await all();
    header(page);
    const al = d.alunos, ins = d.instrumentos;
    const dono = i => al.find(a => a.instrumentoId === i.id);
    const instDe = a => ins.find(i => i.id === a.instrumentoId);

    if (page === "inicio") {
      const livres = ins.filter(i => !dono(i)).length;
      const abertos = d.problemas.filter(p => p.status !== "resolvido").length;
      layout("Painel da Fanfarra", `
        <div class="stats">${[[al.length,"Alunos"],[ins.length,"Instrumentos"],[livres,"Disponíveis"],[abertos,"Problemas abertos"]]
          .map(x => `<div class="stat"><b>${x[0]}</b>${x[1]}</div>`).join("")}</div>
        <div class="menu">${PAGINAS.slice(1).map(p => `<a href="${p[0]}"><b>${p[1]}</b><small>Abrir seção</small></a>`).join("")}</div>
        <h3>Próximos eventos</h3>
        ${d.eventos.filter(e => (e.data || "") >= hoje()).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 5)
          .map(e => `<div class="item"><div><b>${esc(e.nome)}</b><br><small>${fmt(e.data)} ${esc(e.extra || "")}</small></div></div>`).join("")
          || '<div class="empty">Nenhum evento cadastrado.</div>'}
        <h3>Avisos recentes</h3>
        ${d.avisos.slice(-3).reverse().map(a => `<div class="item"><div><b>${esc(a.nome)}</b><br><small>${esc(a.descricao || "")}</small></div></div>`).join("")
          || '<div class="empty">Nenhum aviso.</div>'}`);

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
        <div id="lista">${[...al].sort((a, b) => porSala(a.sala || a.turma, b.sala || b.turma) || porNome(a, b)).map(a => `
          <div class="item">
            <div class="main"><b>${esc(a.nome)}</b>${a.numero ? ` <span class="num">${esc(a.numero)}</span>` : ""}<br>
              <small>Sala ${esc(a.sala || a.turma || "—")} · ${esc(nomeInst(instDe(a)))}</small></div>
            <div>
              <select data-aluno-inst="${esc(a.id)}" aria-label="Instrumento do aluno">
                <option value="">Sem instrumento</option>
                ${ins.filter(i => !dono(i) || i.id === a.instrumentoId).map(i => opt(i.id, nomeInst(i), i.id === a.instrumentoId)).join("")}
              </select>
              <button type="button" class="del" data-del="alunos" data-id="${esc(a.id)}">Excluir</button>
            </div>
          </div>`).join("") || '<div class="empty">Nenhum aluno cadastrado.</div>'}</div>`);

    } else if (page === "instrumentos" || page === "cadastro-instrumento") {
      layout("Instrumentos", `
        <div class="card"><h3 style="margin-top:0">Cadastrar instrumento</h3>
          <form id="formInst">
            <div class="row">
              <div><label>Tipo</label>
                <select name="tipo" id="tipoInst">${TIPOS.map(t => opt(t, t)).join("")}<option value="Outro">Outro...</option></select>
                <input name="outroTipo" id="outroTipo" class="hide" placeholder="Nome do instrumento"></div>
              <div><label>Número</label><input name="numero" type="number" min="1" required></div>
              <div><label>Estado</label>
                <select name="condicao">${Object.entries(ESTADOS).map(([k, v]) => opt(k, v)).join("")}</select></div>
            </div>
            <p><button type="submit">Salvar instrumento</button></p>
          </form></div>
        <div id="lista">${[...ins].sort((a, b) => (Number(a.numero) || 0) - (Number(b.numero) || 0) || String(a.tipo).localeCompare(String(b.tipo), "pt-BR")).map(i => {
          const o = dono(i);
          return `<div class="item">
            <div class="main"><span class="num">${esc(i.numero)}</span><b>${esc(i.tipo)}</b> ${badge(i.condicao || "bom")}<br>
              <small>${o ? `Aluno: ${esc(o.nome)} · Sala ${esc(o.sala || o.turma || "—")}` : "Disponível"}</small></div>
            <div>
              <select data-state="${esc(i.id)}" aria-label="Estado do instrumento">
                ${Object.entries(ESTADOS).map(([k, v]) => opt(k, v, (i.condicao || "bom") === k)).join("")}</select>
              ${!o ? `<button type="button" class="del" data-del="instrumentos" data-id="${esc(i.id)}">Excluir</button>` : ""}
            </div></div>`;
        }).join("") || '<div class="empty">Nenhum instrumento cadastrado.</div>'}</div>`);

    } else if (page === "chamada") {
      const salas = [...new Set(al.map(a => String(a.sala || a.turma || "").trim()).filter(Boolean))].sort(porSala);
      if (salaSel && !salas.includes(salaSel)) salaSel = "";
      const lista = al.filter(a => !salaSel || String(a.sala || a.turma || "").trim() === salaSel).sort((a, b) => (a.numero || 9999) - (b.numero || 9999) || porNome(a, b));
      const reg = d.presencas.filter(p => p.data === dataSel);
      layout("Chamada", `
        <div class="card filtro">
          <div><label>Data do ensaio</label><input id="dataChamada" type="date" value="${esc(dataSel)}"></div>
          <div><label>Sala</label><select id="salaChamada"><option value="">Todas as salas</option>${salas.map(s => opt(s, "Sala " + s, s === salaSel)).join("")}</select></div>
        </div>
        <div class="stats" id="contadores"></div>
        <div id="lista">${lista.map(a => {
          const p = reg.find(x => x.alunoId === a.id);
          return `<div class="item">
            <div class="main"><b>${esc(a.nome)}</b>${a.numero ? ` <span class="num">${esc(a.numero)}</span>` : ""}<br>
              <small>Sala ${esc(a.sala || a.turma || "—")} · ${esc(nomeInst(instDe(a)))}</small>
              <input type="text" class="obs" data-obs="${esc(a.id)}" placeholder="Observação (opcional)" value="${esc(p?.observacao || "")}"></div>
            <div class="pf">
              <button type="button" class="p ${p?.status === "presente" ? "on" : ""}" data-pres="${esc(a.id)}" data-status="presente">Presente</button>
              <button type="button" class="f ${p?.status === "falta" ? "on" : ""}" data-pres="${esc(a.id)}" data-status="falta">Faltou</button>
            </div></div>`;
        }).join("") || '<div class="empty">Nenhum aluno nesta sala. Cadastre alunos antes da chamada.</div>'}</div>`);
      const ids = new Set(lista.map(a => a.id));
      const rr = reg.filter(p => ids.has(p.alunoId));
      const pr = rr.filter(x => x.status === "presente").length, fl = rr.filter(x => x.status === "falta").length;
      $("contadores").innerHTML = [[lista.length,"Alunos"],[pr,"Presentes"],[fl,"Faltas"],[Math.max(0, lista.length - pr - fl),"Sem marcar"]]
        .map(x => `<div class="stat"><b>${x[0]}</b>${x[1]}</div>`).join("");

    } else if (page === "avisos" || page === "eventos") {
      const isEv = page === "eventos", arr = d[page];
      layout(isEv ? "Eventos" : "Avisos", `
        <div class="card"><form id="formRec">
          <div class="row">
            <div><label>${isEv ? "Nome do evento" : "Título do aviso"}</label><input name="nome" required></div>
            <div><label>${isEv ? "Data" : "Data (opcional)"}</label><input name="data" type="date" ${isEv ? "required" : ""}></div>
            <div><label>${isEv ? "Local" : "Tipo"}</label><input name="extra" placeholder="${isEv ? "Local do evento" : "Comunicado"}"></div>
          </div>
          <label>Descrição</label><textarea name="descricao" required></textarea>
          <p><button type="submit">Salvar</button></p></form></div>
        <div id="lista">${[...arr].sort((a, b) => (b.data || "").localeCompare(a.data || "")).map(a => `
          <div class="item"><div class="main"><b>${esc(a.nome)}</b> ${a.data ? "· " + fmt(a.data) : ""}<br>
            <small>${esc(a.extra || "")}</small><p>${esc(a.descricao || "")}</p></div>
            <button type="button" class="del" data-del="${page}" data-id="${esc(a.id)}">Excluir</button></div>`).join("")
          || '<div class="empty">Nada cadastrado ainda.</div>'}</div>`);

    } else if (page === "problemas") {
      layout("Problemas", `
        <div class="card"><form id="formProblema">
          <label>Descrição do problema</label><textarea name="descricao" required placeholder="Descreva o problema encontrado"></textarea>
          <label>Instrumento</label>
          <select name="instrumentoId"><option value="">Nenhum instrumento específico</option>${ins.map(i => opt(i.id, nomeInst(i))).join("")}</select>
          <p><button type="submit">Registrar problema</button></p></form></div>
        <div id="lista">${d.problemas.map(p => {
          const i = ins.find(x => x.id === p.instrumentoId);
          return `<div class="item"><div class="main"><b>${esc(p.descricao)}</b><br>
            <small>${esc(i ? nomeInst(i) : "Sem instrumento")} · ${p.status === "resolvido" ? "Resolvido" : "Em aberto"}</small></div>
            <div>${p.status !== "resolvido" ? `<button type="button" data-resolve="${esc(p.id)}">Marcar resolvido</button> ` : ""}
            <button type="button" class="del" data-del="problemas" data-id="${esc(p.id)}">Excluir</button></div></div>`;
        }).join("") || '<div class="empty">Nenhum problema registrado.</div>'}</div>`);
    }
    bind(page, d);
  } catch (e) {
    console.error(e);
    header(page);
    layout("Não foi possível carregar", `<div class="errbox">${esc(e.message || e)}</div>`);
  }
}

/* ---------- Ações ---------- */
const dados = f => Object.fromEntries(new FormData(f).entries());
async function acao(fn, okMsg) {
  try { await fn(); if (okMsg) toast(okMsg); } catch (e) { toast(e.message || String(e), true); }
  render();
}

function bind(page, d) {
  const onSubmit = (id, fn) => { const f = $(id); if (f) f.onsubmit = async e => {
    e.preventDefault();
    const btn = f.querySelector("button[type=submit]"); if (btn) btn.disabled = true;
    try { await fn(dados(f)); f.reset(); } catch (err) { toast(err.message || String(err), true); }
    if (btn) btn.disabled = false;
    render();
  }; };

  onSubmit("formAluno", async v => {
    v.nome = v.nome.trim(); v.sala = v.sala.trim();
    if (!v.nome) throw Error("Informe o nome do aluno.");
    if (v.numero) v.numero = Number(v.numero); else delete v.numero;
    if (!v.instrumentoId) delete v.instrumentoId;
    await DB.save("alunos", v); toast("Aluno cadastrado!");
  });

  const tipo = $("tipoInst");
  if (tipo) tipo.onchange = () => $("outroTipo").classList.toggle("hide", tipo.value !== "Outro");

  onSubmit("formInst", async v => {
    v.numero = Number(v.numero);
    if (v.tipo === "Outro") v.tipo = (v.outroTipo || "").trim();
    delete v.outroTipo;
    if (!v.tipo) throw Error("Informe o nome do instrumento.");
    if (d.instrumentos.some(i => i.tipo === v.tipo && Number(i.numero) === v.numero))
      throw Error(`Já existe ${v.tipo} nº ${v.numero}.`);
    await DB.save("instrumentos", v); toast("Instrumento cadastrado!");
  });

  onSubmit("formRec", async v => { await DB.save(page, v); toast("Salvo com sucesso!"); });

  onSubmit("formProblema", async v => {
    v.status = "aberto"; v.criadoEm = hoje();
    if (!v.instrumentoId) delete v.instrumentoId;
    else {
      const i = d.instrumentos.find(x => x.id === v.instrumentoId);
      if (i) await DB.save("instrumentos", { ...i, condicao: "mal" });
    }
    await DB.save("problemas", v); toast("Problema registrado!");
  });

  const dc = $("dataChamada"); if (dc) dc.onchange = () => { dataSel = dc.value || hoje(); render(); };
  const sc = $("salaChamada"); if (sc) sc.onchange = () => { salaSel = sc.value; render(); };

  const salvarPres = async (alunoId, status) => {
    const campo = document.querySelector(`[data-obs="${alunoId}"]`);
    const old = d.presencas.find(p => p.data === dataSel && p.alunoId === alunoId);
    await DB.save("presencas", { id: `${dataSel}_${alunoId}`, data: dataSel, alunoId,
      status: status || old?.status || "", observacao: campo ? campo.value : (old?.observacao || "") });
  };
  document.querySelectorAll("[data-pres]").forEach(b => b.onclick = () =>
    acao(() => salvarPres(b.dataset.pres, b.dataset.status), b.dataset.status === "presente" ? "Presença marcada" : "Falta marcada"));
  document.querySelectorAll("[data-obs]").forEach(i => i.onchange = () =>
    acao(() => salvarPres(i.dataset.obs, null), "Observação salva"));

  document.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
    if (!confirm("Deseja excluir este registro?")) return;
    acao(() => DB.del(b.dataset.del, b.dataset.id), "Registro excluído");
  });

  document.querySelectorAll("[data-state]").forEach(s => s.onchange = () => acao(async () => {
    const i = d.instrumentos.find(x => x.id === s.dataset.state);
    if (i) await DB.save("instrumentos", { ...i, condicao: s.value });
  }, "Estado atualizado"));

  document.querySelectorAll("[data-aluno-inst]").forEach(s => s.onchange = () => acao(async () => {
    const a = d.alunos.find(x => x.id === s.dataset.alunoInst); if (!a) return;
    const n = { ...a }; if (s.value) n.instrumentoId = s.value; else delete n.instrumentoId;
    await DB.save("alunos", n);
  }, "Instrumento atualizado"));

  document.querySelectorAll("[data-resolve]").forEach(b => b.onclick = () => acao(async () => {
    const p = d.problemas.find(x => x.id === b.dataset.resolve);
    if (p) await DB.save("problemas", { ...p, status: "resolvido" });
  }, "Problema resolvido"));
}

/* ---------- Início ---------- */
function iniciar() {
  if (!$("top")) document.body.insertAdjacentHTML("afterbegin", '<header id="top"></header>');
  render();
  setInterval(() => { if (!document.hidden && !emEdicao()) render(); }, 10000);
  document.addEventListener("click", e => {
    if (e.target && e.target.id === "logoutBtn") firebase.auth().signOut().then(() => location.replace("login.html"));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (EXIGIR_LOGIN) {
    if (!fbOk) { location.replace("login.html"); return; }
    firebase.auth().onAuthStateChanged(u => { if (!u) location.replace("login.html"); else iniciar(); });
    return;
  }
  // Sem login: se as regras exigirem auth, tenta entrada anônima (se ativada); senão segue normal.
  if (fbOk && firebase.auth) {
    firebase.auth().onAuthStateChanged(u => {
      if (window.__ifanStarted) return;
      if (u) { window.__ifanStarted = true; iniciar(); }
    });
    firebase.auth().signInAnonymously().catch(() => {
      if (!window.__ifanStarted) { window.__ifanStarted = true; iniciar(); }
    });
  } else iniciar();
});
})();
(function () {
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

const ESTADOS = {
  bom: "Bom estado",
  mal: "Mal estado",
  desafinado: "Desafinado"
};

const PAGINAS = [
  ["index.html", "🏠 Início", "inicio"],
  ["chamada.html", "📋 Chamada", "chamada"],
  ["alunos.html", "👥 Alunos", "alunos"],
  ["instrumentos.html", "🥁 Instrumentos", "instrumentos"],
  ["avisos.html", "📣 Avisos", "avisos"],
  ["eventos.html", "📅 Eventos", "eventos"],
  ["problemas.html", "🔧 Problemas", "problemas"]
];

const $ = id => document.getElementById(id);

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[c]));

const idnovo = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const fmt = d => d ? d.split("-").reverse().join("/") : "";
const localKey = c => "ifan_fix_" + c;

function localList(c) {
  try {
    return JSON.parse(localStorage.getItem(localKey(c)) || "{}");
  } catch {
    return {};
  }
}

const DB = {
  cloud: typeof firebase !== "undefined" && !!firebase.database,
  cloudError: false,

  localFallback() {
    this.cloud = false;
    this.cloudError = true;

    const status = document.querySelector("#top .status");

    if (status) {
      status.firstChild.textContent =
        "⚠️ Firebase sem acesso — salvando localmente neste aparelho. ";
    }
  },

  async list(c) {
    let m;

    if (this.cloud) {
      try {
        const snap = await firebase.database().ref(c).once("value");
        m = snap.val() || {};
      } catch (err) {
        this.localFallback();
        m = localList(c);
      }
    } else {
      m = localList(c);
    }

    return Object.entries(m)
      .filter(([, v]) => v && typeof v === "object")
      .map(([id, v]) => ({ ...v, id }));
  },

  async save(c, o) {
    const id = o.id || idnovo();
    const v = { ...o };
    delete v.id;

    if (this.cloud) {
      try {
        await firebase.database().ref(`${c}/${id}`).set(v);
      } catch (err) {
        this.localFallback();

        const m = localList(c);
        m[id] = v;

        localStorage.setItem(localKey(c), JSON.stringify(m));
      }
    } else {
      const m = localList(c);
      m[id] = v;

      localStorage.setItem(localKey(c), JSON.stringify(m));
    }

    return { ...v, id };
  },

  async del(c, id) {
    if (this.cloud) {
      try {
        await firebase.database().ref(`${c}/${id}`).remove();
      } catch (err) {
        this.localFallback();

        const m = localList(c);
        delete m[id];

        localStorage.setItem(localKey(c), JSON.stringify(m));
      }
    } else {
      const m = localList(c);
      delete m[id];

      localStorage.setItem(localKey(c), JSON.stringify(m));
    }
  }
};

function toast(msg, err = false) {
  const old = $("toast");
  if (old) old.remove();

  const e = document.createElement("div");
  e.id = "toast";

  if (err) e.className = "err";

  e.textContent = msg;
  document.body.append(e);

  setTimeout(() => e.remove(), 3500);
}

function header(page) {
  $("top").innerHTML = `
    <h1>🎺 FANFARRA</h1>

    <nav>
      ${PAGINAS.map(p => `
        <a href="${p[0]}" class="${p[2] === page ? "on" : ""}">
          ${p[1]}
        </a>
      `).join("")}

      <a href="cadastrar-aluno.html">➕ Cadastrar aluno</a>
      <a href="cadastrar-instrumento.html">➕ Cadastrar instrumento</a>
    </nav>

    <div class="status">
      ${DB.cloud
        ? "🟢 Banco compartilhado conectado"
        : "⚠️ Salvamento local neste aparelho."}

      <button type="button" class="sec" id="logoutBtn">Sair</button>
    </div>
  `;
}

const badge = e =>
  `<span class="b ${e}">${esc(ESTADOS[e] || e)}</span>`;

async function all() {
  const [
    alunos,
    instrumentos,
    avisos,
    eventos,
    problemas,
    presencas
  ] = await Promise.all([
    "alunos",
    "instrumentos",
    "avisos",
    "eventos",
    "problemas",
    "presencas"
  ].map(DB.list.bind(DB)));

  return {
    alunos,
    instrumentos,
    avisos,
    eventos,
    problemas,
    presencas
  };
}

function opt(arr, val, label) {
  return `<option value="${esc(val)}">${esc(label)}</option>`;
}

function layout(title, body) {
  $("conteudo").innerHTML = `<h2>${title}</h2>${body}`;
}

async function render() {
  const page = document.body.dataset.page || "inicio";
  header(page);

  try {
    const d = await all();
    const al = d.alunos;
    const ins = d.instrumentos;

    const dono = i => al.find(a => a.instrumentoId === i.id);

    if (page === "inicio") {
      const livres = ins.filter(i => !dono(i)).length;
      const abertos = d.problemas.filter(
        p => p.status !== "resolvido"
      ).length;

      layout("Painel da Fanfarra", `
        <div class="stats">
          ${[
            [al.length, "Alunos"],
            [ins.length, "Instrumentos"],
            [livres, "Disponíveis"],
            [abertos, "Problemas abertos"]
          ].map(x => `
            <div class="stat">
              <b>${x[0]}</b>${x[1]}
            </div>
          `).join("")}
        </div>

        <div class="menu">
          ${PAGINAS.slice(1).map(p => `
            <a href="${p[0]}">
              <b>${p[1]}</b>
              <small>Abrir seção</small>
            </a>
          `).join("")}
        </div>

        <h3>Próximos eventos</h3>

        ${d.eventos
          .filter(e => e.data >= hoje())
          .sort((a, b) => a.data.localeCompare(b.data))
          .slice(0, 5)
          .map(e => `
            <div class="item">
              <div>
                <b>${esc(e.nome)}</b><br>
                <small>${fmt(e.data)} ${esc(e.local || "")}</small>
              </div>
            </div>
          `).join("") ||
          '<div class="empty">Nenhum evento cadastrado.</div>'}
      `);

    } else if (page === "alunos" || page === "cadastro-aluno") {
      layout("Alunos", `
        <div class="card">
          <h3>Cadastrar aluno</h3>

          <form id="formAluno">
            <div class="row">
              <div>
                <label>Nome completo</label>
                <input name="nome" required>
              </div>

              <div>
                <label>Turma</label>
                <input name="turma" placeholder="Ex.: 7º A" required>
              </div>

              <div>
                <label>Instrumento</label>
                <select name="instrumentoId">
                  <option value="">Sem instrumento</option>

                  ${ins.filter(i => !dono(i)).map(i =>
                    opt(ins, i.id, `${i.tipo} nº ${i.numero}`)
                  ).join("")}
                </select>
              </div>
            </div>

            <button>Salvar aluno</button>
          </form>
        </div>

        <div id="lista">
          ${al.sort((a, b) => a.nome.localeCompare(b.nome))
            .map(a => `
              <div class="item">
                <div class="main">
                  <b>${esc(a.nome)}</b><br>

                  <small>
                    Turma ${esc(a.turma)} ·
                    ${esc(ins.find(i => i.id === a.instrumentoId)
                      ? `${ins.find(i => i.id === a.instrumentoId).tipo} nº ${ins.find(i => i.id === a.instrumentoId).numero}`
                      : "Sem instrumento")}
                  </small>
                </div>

                <button class="del"
                  data-del="alunos"
                  data-id="${a.id}">
                  Excluir
                </button>
              </div>
            `).join("") ||
            '<div class="empty">Nenhum aluno cadastrado.</div>'}
        </div>
      `);

    } else if (page === "instrumentos" || page === "cadastro-instrumento") {
      layout("Instrumentos", `
        <div class="card">
          <h3>Cadastrar instrumento</h3>

          <form id="formInst">
            <div class="row">
              <div>
                <label>Tipo</label>

                <select name="tipo">
                  ${TIPOS.map(t => opt([], t, t)).join("")}
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label>Número</label>
                <input name="numero" type="number" min="1" required>
              </div>

              <div>
                <label>Estado</label>
                <select name="condicao">
                  ${Object.entries(ESTADOS)
                    .map(([k, v]) => opt([], k, v)).join("")}
                </select>
              </div>
            </div>

            <button>Salvar instrumento</button>
          </form>
        </div>

        <div id="lista">
          ${ins.sort((a, b) =>
            (Number(a.numero) || 0) - (Number(b.numero) || 0) ||
            String(a.tipo || "").localeCompare(String(b.tipo || ""), "pt-BR")
          ).map(i => `
            <div class="item">
              <div class="main">
                <span class="num">${esc(i.numero)}</span>
                <b>${esc(i.tipo)}</b>
                ${badge(i.condicao || "bom")}<br>

                <small>
                  ${dono(i)
                    ? `Aluno: ${esc(dono(i).nome)} · ${esc(dono(i).turma)}`
                    : "Disponível"}
                </small>
              </div>

              <div>
                <select data-state="${i.id}" aria-label="Estado do instrumento">
                  ${Object.entries(ESTADOS).map(([k, v]) => `
                    <option value="${k}"
                      ${(i.condicao || "bom") === k ? "selected" : ""}>
                      ${v}
                    </option>
                  `).join("")}
                </select>

                ${!dono(i) ? `
                  <button class="del"
                    data-del="instrumentos"
                    data-id="${i.id}">
                    Excluir
                  </button>
                ` : ""}
              </div>
            </div>
          `).join("") ||
          '<div class="empty">Nenhum instrumento cadastrado.</div>'}
        </div>
      `);

    } else if (page === "chamada") {
      const data = $("dataChamada")?.value || hoje();
      const reg = d.presencas.filter(p => p.data === data);

      layout("Chamada", `
        <div class="card">
          <label>Data do ensaio</label>
          <input id="dataChamada" type="date" value="${data}">
          <div class="stats" id="contadores"></div>
        </div>

        <div id="lista">
          ${al.sort((a, b) => a.nome.localeCompare(b.nome))
            .map(a => {
              const p = reg.find(x => x.alunoId === a.id);

              return `
                <div class="item">
                  <div class="main">
                    <b>${esc(a.nome)}</b><br>

                    <small>
                      Turma ${esc(a.turma)} ·
                      ${esc(ins.find(i => i.id === a.instrumentoId)
                        ? `${ins.find(i => i.id === a.instrumentoId).tipo} nº ${ins.find(i => i.id === a.instrumentoId).numero}`
                        : "Sem instrumento")}
                    </small>

                    <input class="obs"
                      data-obs="${a.id}"
                      placeholder="Observação (opcional)"
                      value="${esc(p?.observacao || "")}">
                  </div>

                  <div class="pf">
                    <button class="p ${p?.status === "presente" ? "on" : ""}"
                      data-pres="${a.id}"
                      data-status="presente">
                      Presente
                    </button>

                    <button class="f ${p?.status === "falta" ? "on" : ""}"
                      data-pres="${a.id}"
                      data-status="falta">
                      Faltou
                    </button>
                  </div>
                </div>
              `;
            }).join("") ||
            '<div class="empty">Cadastre alunos antes de fazer a chamada.</div>'}
        </div>
      `);

      atualizarContadores(reg, al.length);

    } else if (page === "avisos" || page === "eventos") {
      const col = page;
      const arr = d[col];
      const isEv = page === "eventos";

      layout(isEv ? "Eventos" : "Avisos", `
        <div class="card">
          <form id="formRec">
            <div class="row">
              <div>
                <label>${isEv ? "Nome do evento" : "Título do aviso"}</label>
                <input name="nome" required>
              </div>

              <div>
                <label>${isEv ? "Data" : "Data (opcional)"}</label>
                <input name="data" type="date" ${isEv ? "required" : ""}>
              </div>

              <div>
                <label>${isEv ? "Local" : "Tipo"}</label>
                <input name="extra"
                  placeholder="${isEv ? "Local do evento" : "Comunicado"}">
              </div>
            </div>

            <label>Descrição</label>
            <textarea name="descricao" required></textarea>
            <button>Salvar</button>
          </form>
        </div>

        <div id="lista">
          ${arr.sort((a, b) =>
            (a.data || "").localeCompare(b.data || "")
          ).map(a => `
            <div class="item">
              <div class="main">
                <b>${esc(a.nome)}</b>
                ${a.data ? `· ${fmt(a.data)}` : ""}<br>

                <small>${esc(a.extra || "")}</small>
                <p>${esc(a.descricao || "")}</p>
              </div>

              <button class="del"
                data-del="${col}"
                data-id="${a.id}">
                Excluir
              </button>
            </div>
          `).join("") ||
          '<div class="empty">Nada cadastrado ainda.</div>'}
        </div>
      `);

    } else if (page === "problemas") {
      layout("Problemas", `
        <div class="card">
          <form id="formProblema">
            <label>Descrição do problema</label>

            <textarea name="descricao" required
              placeholder="Descreva o problema encontrado"></textarea>

            <label>Instrumento</label>

            <select name="instrumentoId">
              <option value="">Nenhum instrumento específico</option>

              ${ins.map(i =>
                opt([], i.id, `${i.tipo} nº ${i.numero}`)
              ).join("")}
            </select>

            <button>Registrar problema</button>
          </form>
        </div>

        <div id="lista">
          ${d.problemas.map(p => {
            const i = ins.find(x => x.id === p.instrumentoId);

            return `
              <div class="item">
                <div class="main">
                  <b>${esc(p.descricao)}</b><br>

                  <small>
                    ${i ? esc(`${i.tipo} nº ${i.numero}`) : "Sem instrumento"}
                    · ${p.status === "resolvido" ? "Resolvido" : "Em aberto"}
                  </small>
                </div>

                ${p.status !== "resolvido" ? `
                  <button data-resolve="${p.id}">
                    Marcar resolvido
                  </button>
                ` : ""}

                <button class="del"
                  data-del="problemas"
                  data-id="${p.id}">
                  Excluir
                </button>
              </div>
            `;
          }).join("") ||
          '<div class="empty">Nenhum problema registrado.</div>'}
        </div>
      `);
    }

    bindForms(page);

  } catch (e) {
    if (DB.cloud) {
      DB.localFallback();

      layout("Não foi possível carregar", `
        <div class="errbox">${esc(e.message || e)}</div>
        <p>Confira a conexão com o Firebase e as regras do banco.</p>
      `);
      return;
    }

    layout("Não foi possível carregar", `
      <div class="errbox">${esc(e.message || e)}</div>
      <p>Confira as configurações do Firebase.</p>
    `);
  }
}

function atualizarContadores(reg, total) {
  const el = $("contadores");
  if (!el) return;

  const p = reg.filter(x => x.status === "presente").length;
  const f = reg.filter(x => x.status === "falta").length;

  el.innerHTML = [
    [total, "Alunos"],
    [p, "Presentes"],
    [f, "Faltas"],
    [Math.max(0, total - p - f), "Sem marcar"]
  ].map(x => `
    <div class="stat"><b>${x[0]}</b>${x[1]}</div>
  `).join("");
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function bindForms(page) {
  const fa = $("formAluno");

  if (fa) {
    fa.onsubmit = async e => {
      e.preventDefault();

      try {
        const v = formData(fa);
        await DB.save("alunos", v);
        toast("Aluno cadastrado!");
        render();
      } catch (e) {
        toast(e.message, true);
      }
    };
  }

  const fi = $("formInst");

  if (fi) {
    fi.onsubmit = async e => {
      e.preventDefault();

      try {
        const v = formData(fi);
        v.numero = Number(v.numero);

        if (v.tipo === "Outro") {
          v.tipo = prompt("Nome do instrumento:") || "";
        }

        if (!v.tipo) throw Error("Informe o instrumento.");

        await DB.save("instrumentos", v);
        toast("Instrumento cadastrado!");
        render();
      } catch (e) {
        toast(e.message, true);
      }
    };
  }

  const fr = $("formRec");

  if (fr) {
    fr.onsubmit = async e => {
      e.preventDefault();

      try {
        const v = formData(fr);
        await DB.save(page, v);
        toast("Salvo com sucesso!");
        render();
      } catch (e) {
        toast(e.message, true);
      }
    };
  }

  const fp = $("formProblema");

  if (fp) {
    fp.onsubmit = async e => {
      e.preventDefault();

      try {
        const v = formData(fp);
        v.status = "aberto";
        v.criadoEm = hoje();

        if (v.instrumentoId) {
          const instrumentos = await DB.list("instrumentos");
          const i = instrumentos.find(x => x.id === v.instrumentoId);

          if (i) {
            await DB.save("instrumentos", {
              ...i,
              condicao: "mal"
            });
          }
        }

        await DB.save("problemas", v);
        toast("Problema registrado!");
        render();
      } catch (e) {
        toast(e.message, true);
      }
    };
  }

  const dc = $("dataChamada");
  if (dc) dc.onchange = render;

  document.querySelectorAll("[data-pres]").forEach(b => {
    b.onclick = async () => {
      try {
        const data = $("dataChamada").value;
        const alunoId = b.dataset.pres;
        const status = b.dataset.status;
        const obs = $(`[data-obs="${alunoId}"]`)?.value || "";

        const registros = await DB.list("presencas");
        const old = registros.find(
          p => p.data === data && p.alunoId === alunoId
        );

        await DB.save("presencas", {
          ...(old || {}),
          data,
          alunoId,
          status,
          observacao: obs
        });

        toast(status === "presente"
          ? "Presença marcada"
          : "Falta marcada");

        render();
      } catch (e) {
        toast(e.message, true);
      }
    };
  });

  document.querySelectorAll("[data-del]").forEach(b => {
    b.onclick = async () => {
      if (!confirm("Deseja excluir este registro?")) return;

      try {
        await DB.del(b.dataset.del, b.dataset.id);
        toast("Registro excluído");
        render();
      } catch (e) {
        toast(e.message, true);
      }
    };
  });

  document.querySelectorAll("[data-state]").forEach(s => {
    s.onchange = async () => {
      try {
        const instrumentos = await DB.list("instrumentos");
        const i = instrumentos.find(x => x.id === s.dataset.state);

        if (i) {
          await DB.save("instrumentos", {
            ...i,
            condicao: s.value
          });
        }

        toast("Estado atualizado");
        render();
      } catch (e) {
        toast(e.message, true);
      }
    };
  });

  document.querySelectorAll("[data-resolve]").forEach(b => {
    b.onclick = async () => {
      try {
        const problemas = await DB.list("problemas");
        const p = problemas.find(x => x.id === b.dataset.resolve);

        if (p) {
          await DB.save("problemas", {
            ...p,
            status: "resolvido"
          });
        }

        toast("Problema resolvido");
        render();
      } catch (e) {
        toast(e.message, true);
      }
    };
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (!window.firebase || !firebase.auth) {
    location.href = "login.html";
    return;
  }

  firebase.auth().onAuthStateChanged(user => {
    if (!user) {
      location.replace("login.html");
      return;
    }

    if (!$("top")) {
      document.body.insertAdjacentHTML(
        "afterbegin",
        '<header id="top"></header>'
      );
    }

    if (!$("conteudo")) {
      document.querySelector("main")?.setAttribute("id", "conteudo");
    }

    render();

    if (DB.cloud && !window.ifanPolling) {
      window.ifanPolling = true;
      setInterval(render, 8000);
    }

    document.addEventListener("click", e => {
      if (e.target && e.target.id === "logoutBtn") {
        firebase.auth().signOut().then(() => {
          location.replace("login.html");
        });
      }
    });
  });
});

})();

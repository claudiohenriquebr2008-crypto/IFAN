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

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const idnovo = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const fmt = d => d ? d.split("-").reverse().join("/") : "";
const nomeInst = i => i ? `${i.tipo} nº ${i.numero}` : "Sem instrumento";
const porNome = (a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
const porSala = (a, b) => String(a || "").localeCompare(String(b || ""), "pt-BR", { numeric: true });

const EXIGIR_LOGIN = true;
let currentUser = null;
let isAdmin = false;
let papel = null;

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
  $("top").innerHTML = `
    <h1>🎺 FANFARRA</h1>
    <nav>${links.map(p => `<a href="${p[0]}" class="${p[2] === page ? "on" : ""}">${p[1]}</a>`).join("")}
      ${isAdmin ? `<a href="cadastrar-aluno.html" class="${page === "cadastro-aluno" ? "on" : ""}">➕ Aluno</a><a href="cadastrar-instrumento.html" class="${page === "cadastro-instrumento" ? "on" : ""}">➕ Instrumento</a>` : ""}
    </nav><div class="status">${status}<span> · ${esc(currentUser?.email || "")}</span><button type="button" class="sec" id="logoutBtn">Sair</button></div>`;
}

const badge = e => `<span class="b ${esc(e)}">${esc(ESTADOS[e] || e)}</span>`;
const opt = (val, label, sel) => `<option value="${esc(val)}"${sel ? " selected" : ""}>${esc(label)}</option>`;
const layout = (title, body) => { $("conteudo").innerHTML = `<h2>${title}</h2>${DB.erro ? avisoErro() : ""}${body}`; };

function avisoErro() {
  return `<div class="warnbox"><b>Não foi possível falar com o banco online (${esc(DB.erro)}).</b><br>Confira a internet e as regras do Firebase (arquivo firebase-rules.json).</div>`;
}

/* Não redesenha a tela enquanto a pessoa está digitando */
function emEdicao() {
  const a = document.activeElement;
  if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && $("conteudo")?.contains(a)) return true;
  return [...document.querySelectorAll("#conteudo form")].some(f =>
    [...f.elements].some(el => /^(text|number|textarea|search)$/.test(el.type) && el.value));
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

/* estado da tela de chamada (sobrevive aos redesenhos) */
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
        layout("Bem-vindo à Fanfarra", `<p>Você está conectado como usuário. Aqui você vê os avisos e os eventos e pode relatar problemas.</p><div class="menu"><a href="avisos.html"><b>📣 Avisos</b><small>Consultar comunicados</small></a><a href="eventos.html"><b>📅 Eventos</b><small>Ver os próximos eventos</small></a><a href="problemas.html"><b>🔧 Relatar problema</b><small>Enviar relato privado ao administrador</small></a></div>${d.avisos.slice(-3).reverse().map(a => `<div class="item"><div><b>${esc(a.nome)}</b><br><small>${esc(a.descricao || "")}</small></div></div>`).join("")}`);
      } else {
        const livres = ins.filter(i => !dono(i)).length;
        const abertos = d.problemas.filter(p => p.status !== "resolvido").length + d.solicitacoesProblemas.filter(p => p.status !== "resolvido").length;
        layout("Painel da Fanfarra", `<div class="stats">${[[al.length,"Alunos"],[ins.length,"Instrumentos"],[livres,"Disponíveis"],[abertos,"Problemas abertos"],[d.solicitacoesEventos.length,"Sugestões de eventos"]].map(x => `<div class="stat"><b>${x[0]}</b>${x[1]}</div>`).join("")}</div><div class="menu">${PAGINAS.slice(1).map(p => `<a href="${p[0]}"><b>${p[1]}</b><small>Abrir seção</small></a>`).join("")}</div><h3>Próximos eventos</h3>${d.eventos.filter(e => (e.data || "") >= hoje()).sort((a,b)=>(a.data||"").localeCompare(b.data||"")).slice(0,5).map(e=>`<div class="item"><div><b>${esc(e.nome)}</b><br><small>${fmt(e.data)} ${esc(e.extra||"")}</small></div></div>`).join("") || '<div class="empty">Nenhum evento cadastrado.</div>'}<h3>Avisos recentes</h3>${d.avisos.slice(-3).reverse().map(a=>`<div class="item"><div><b>${esc(a.nome)}</b><br><small>${esc(a.descricao||"")}</small></div></div>`).join("") || '<div class="empty">Nenhum aviso.</div>'}`);
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
        <div id="lista">${[...ins].sort((a, b) => String(a.tipo).localeCompare(String(b.tipo), "pt-BR") || a.numero - b.numero).map(i => {
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

    } else if (page === "avisos") {
      layout("Avisos", `${isAdmin ? `<div class="card"><form id="formRec"><label>Título do aviso</label><input name="nome" required><label>Data (opcional)</label><input name="data" type="date"><label>Tipo</label><input name="extra" placeholder="Comunicado"><label>Descrição</label><textarea name="descricao" required></textarea><p><button type="submit">Publicar aviso</button></p></form></div>` : `<p>Confira os comunicados publicados pelo administrador.</p>`}<div id="lista">${[...d.avisos].sort((a,b)=>(b.data||"").localeCompare(a.data||"")).map(a=>`<div class="item"><div class="main"><b>${esc(a.nome)}</b> ${a.data ? "· "+fmt(a.data):""}<br><small>${esc(a.extra||"")}</small><p>${esc(a.descricao||"")}</p></div>${isAdmin ? `<button type="button" class="del" data-del="avisos" data-id="${esc(a.id)}">Excluir</button>` : ""}</div>`).join("") || '<div class="empty">Nenhum aviso publicado.</div>'}</div>`);

    } else if (page === "eventos") {
      if (!isAdmin) {
        layout("Eventos", `<div id="lista">${[...d.eventos].sort((x,y)=>(x.data||"").localeCompare(y.data||"")).map(a=>`<div class="item"><div class="main"><b>${esc(a.nome)}</b> · ${fmt(a.data)}<br><small>${esc(a.extra||"")}</small><p>${esc(a.descricao||"")}</p></div></div>`).join("") || '<div class="empty">Nenhum evento publicado.</div>'}</div>`);
      } else {
        layout("Eventos", `<div class="card"><form id="formRec"><label>Nome do evento</label><input name="nome" required><label>Data</label><input name="data" type="date" required><label>Local</label><input name="extra"><label>Descrição</label><textarea name="descricao" required></textarea><p><button type="submit">Salvar evento</button></p></form></div><h3>Sugestões recebidas (visíveis somente ao administrador)</h3><div id="solicitacoesEventos">${d.solicitacoesEventos.map(a=>`<div class="item"><div class="main"><b>${esc(a.nome)}</b> ${a.data?"· "+fmt(a.data):""}<br><small>${esc(a.extra||"")} · enviado por ${esc(a.email||"usuário")}</small><p>${esc(a.descricao||"")}</p></div><button type="button" data-aprovar-evento="${esc(a.id)}">Criar evento</button><button type="button" class="del" data-del="solicitacoesEventos" data-id="${esc(a.id)}">Excluir</button></div>`).join("") || '<div class="empty">Nenhuma sugestão recebida.</div>'}</div><h3>Eventos publicados</h3><div id="lista">${[...d.eventos].sort((a,b)=>(a.data||"").localeCompare(b.data||"")).map(a=>`<div class="item"><div class="main"><b>${esc(a.nome)}</b> · ${fmt(a.data)}<br><small>${esc(a.extra||"")}</small><p>${esc(a.descricao||"")}</p></div><button type="button" class="del" data-del="eventos" data-id="${esc(a.id)}">Excluir</button></div>`).join("") || '<div class="empty">Nenhum evento publicado.</div>'}</div>`);
      }

    } else if (page === "problemas") {
      if (!isAdmin) {
        layout("Relatar problema", `<p>O relato será privado e somente o administrador poderá visualizá-lo.</p><div class="card"><form id="formProblema"><label>Descrição do problema</label><textarea name="descricao" required maxlength="2000" placeholder="Descreva o problema encontrado"></textarea><label>Instrumento (opcional)</label><input name="instrumentoNome" maxlength="120" placeholder="Ex.: caixa nº 3"><button type="submit">Enviar relato privado</button></form></div>`);
      } else {
        layout("Problemas recebidos", `<p>Somente o administrador pode ver e gerenciar estes relatos.</p><h3>Relatos enviados pelos usuários</h3><div id="lista">${d.solicitacoesProblemas.map(p=>`<div class="item"><div class="main"><b>${esc(p.descricao)}</b><br><small>${esc(p.instrumentoNome||"Sem instrumento indicado")} · ${esc(p.email||"usuário")} · ${esc(p.criadoEm||"")} · ${p.status==="resolvido"?"Resolvido":"Em aberto"}</small></div><div>${p.status!=="resolvido"?`<button type="button" data-resolve-relato="${esc(p.id)}">Marcar resolvido</button>`:""}<button type="button" class="del" data-del="solicitacoesProblemas" data-id="${esc(p.id)}">Excluir</button></div></div>`).join("") || '<div class="empty">Nenhum relato recebido.</div>'}</div><h3>Registros antigos</h3>${d.problemas.map(p=>`<div class="item"><div><b>${esc(p.descricao)}</b><br><small>${esc(p.status||"aberto")}</small></div><button type="button" class="del" data-del="problemas" data-id="${esc(p.id)}">Excluir</button></div>`).join("") || '<div class="empty">Nenhum registro antigo.</div>'}`);
      }
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

  onSubmit("formRec", async v => { if (!isAdmin) throw Error("Somente o administrador pode publicar avisos ou eventos."); await DB.save(page, v); toast("Publicado com sucesso!"); });

  onSubmit("formSolicEvento", async v => {
    if (isAdmin) throw Error("Use o formulário de eventos do administrador.");
    v.uid = currentUser.uid; v.email = currentUser.email || ""; v.criadoEm = new Date().toISOString(); v.status = "pendente";
    await DB.save("solicitacoesEventos", v); toast("Sugestão enviada ao administrador!");
  });

  onSubmit("formProblema", async v => {
    if (!isAdmin) {
      v.uid = currentUser.uid; v.email = currentUser.email || ""; v.criadoEm = hoje(); v.status = "aberto";
      await DB.save("solicitacoesProblemas", v); toast("Relato enviado em privado ao administrador!"); return;
    }
    v.status = "aberto"; v.criadoEm = hoje();
    await DB.save("problemas", v); toast("Problema registrado!");
  });

  onSubmit("formCadastroAluno", async v => {
    if (isAdmin) throw Error("Use o cadastro de alunos do administrador.");
    v.nome = v.nome.trim(); v.sala = v.sala.trim();
    if (v.numero) v.numero = Number(v.numero); else delete v.numero;
    v.uid = currentUser.uid; v.email = currentUser.email || ""; v.criadoEm = hoje();
    await DB.save("cadastrosAlunos", { ...v, id: currentUser.uid });
    toast("Cadastro enviado ao administrador!");
  });

  document.querySelectorAll("[data-aprovar-aluno]").forEach(b => b.onclick = () => acao(async () => {
    if (!isAdmin) throw Error("Somente o administrador pode aprovar cadastros.");
    const c = d.cadastrosAlunos.find(x => x.id === b.dataset.aprovarAluno); if (!c) return;
    const novo = { nome: c.nome, sala: c.sala, uid: c.uid }; if (c.numero) novo.numero = c.numero;
    await DB.save("alunos", novo); await DB.del("cadastrosAlunos", c.id);
  }, "Aluno cadastrado"));

  const dc = $("dataChamada"); if (dc) dc.onchange = () => { dataSel = dc.value || hoje(); render(); };
  const sc = $("salaChamada"); if (sc) sc.onchange = () => { salaSel = sc.value; render(); };

  const salvarPres = async (alunoId, status) => {
    const campo = document.querySelector(`[data-obs="${alunoId}"]`);
    const old = d.presencas.find(p => p.data === dataSel && p.alunoId === alunoId);
    await DB.save("presencas", { id: `${dataSel}_${alunoId}`, data: dataSel, alunoId,
      status: status || old?.status || "", observacao: campo ? campo.value : (old?.observacao || "") });
  };
  document.querySelectorAll("[data-pres]").forEach(b => b.onclick = () => { if (!isAdmin) { toast("Somente o administrador pode fazer a chamada.", true); return; } return acao(() => salvarPres(b.dataset.pres, b.dataset.status), b.dataset.status === "presente" ? "Presença marcada" : "Falta marcada"); });
  document.querySelectorAll("[data-obs]").forEach(i => i.onchange = () => { if (!isAdmin) { toast("Somente o administrador pode editar a chamada.", true); return; } acao(() => salvarPres(i.dataset.obs, null), "Observação salva"); });

  document.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
    if (!isAdmin) { toast("Somente o administrador pode excluir registros.", true); return; }
    if (!confirm("Deseja excluir este registro?")) return;
    acao(() => DB.del(b.dataset.del, b.dataset.id), "Registro excluído");
  });

  document.querySelectorAll("[data-state]").forEach(s => s.onchange = () => { if (!isAdmin) { toast("Somente o administrador pode alterar instrumentos.", true); return; } return acao(async () => {
    const i = d.instrumentos.find(x => x.id === s.dataset.state);
    if (i) await DB.save("instrumentos", { ...i, condicao: s.value });
  }, "Estado atualizado"); });

  document.querySelectorAll("[data-aluno-inst]").forEach(s => s.onchange = () => { if (!isAdmin) { toast("Somente o administrador pode alterar alunos.", true); return; } return acao(async () => {
    const a = d.alunos.find(x => x.id === s.dataset.alunoInst); if (!a) return;
    const n = { ...a }; if (s.value) n.instrumentoId = s.value; else delete n.instrumentoId;
    await DB.save("alunos", n);
  }, "Instrumento atualizado"); });

  document.querySelectorAll("[data-aprovar-evento]").forEach(b => b.onclick = () => acao(async () => {
    if (!isAdmin) throw Error("Somente o administrador pode aprovar sugestões.");
    const req = d.solicitacoesEventos.find(x => x.id === b.dataset.aprovarEvento); if (!req) return;
    await DB.save("eventos", { nome: req.nome, data: req.data || "", extra: req.extra || "", descricao: req.descricao || "" });
    await DB.del("solicitacoesEventos", req.id);
  }, "Sugestão convertida em evento"));

  document.querySelectorAll("[data-resolve-relato]").forEach(b => b.onclick = () => acao(async () => {
    if (!isAdmin) throw Error("Somente o administrador pode alterar relatos.");
    const p = d.solicitacoesProblemas.find(x => x.id === b.dataset.resolveRelato); if (p) await DB.save("solicitacoesProblemas", { ...p, status: "resolvido" });
  }, "Relato marcado como resolvido"));

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
  if (!fbOk || !firebase.auth) { location.replace("login.html"); return; }
  firebase.auth().onAuthStateChanged(async user => {
    if (!user) { location.replace("login.html"); return; }
    currentUser = user;
    try { papel = (await firebase.database().ref("papeis/" + user.uid).once("value")).val(); } catch (e) { papel = null; }
    if (papel !== "admin" && papel !== "aluno") { await firebase.auth().signOut(); location.replace("login.html?negado=1"); return; }
    isAdmin = papel === "admin";
    if (!$("top")) document.body.insertAdjacentHTML("afterbegin", '<header id="top"></header>');
    iniciar();
  });
});
})();

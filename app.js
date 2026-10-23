"use strict";
/* IFAN / Fanfarra — Firebase Auth + Realtime Database
   Regras: .read / .write exigem auth != null */

const COLS = ["alunos", "instrumentos", "chamadas", "avisos", "eventos", "problemas"];
const TIPOS = [
  "Caixa", "Tarol", "Bumbo", "Surdo pequeno", "Surdo médio", "Surdo grande",
  "Treme terra", "Prato", "Lira", "Corneta", "Fuzil",
  "Repinique", "Tamborim", "Chocalho", "Pandeiro", "Agogô", "Triângulo", "Cuíca"
];
const NAV = [
  ["index", "🏠 Início"],
  ["chamada", "📋 Chamada"],
  ["alunos", "👥 Alunos"],
  ["instrumentos", "🥁 Instrumentos"],
  ["avisos", "📢 Avisos"],
  ["eventos", "📅 Eventos"],
  ["problemas", "🔧 Problemas"]
];
const ADMINS = [
  "administrativo945@gmail.com",
  "claudiohenriquebr2008@gmail.com"
];

const S = {};
COLS.forEach(c => (S[c] = []));
const OK = new Set();

const $ = id => document.getElementById(id);
const qs = s => document.querySelector(s);
const esc = t =>
  String(t ?? "").replace(/[&<>"']/g, m =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])
  );
const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fmtData = d => (d ? d.split("-").reverse().join("/") : "");
const byId = (c, id) => S[c].find(x => x.id === id);
const alunoDe = i => S.alunos.find(a => a.instrumentoId === i.id);
const instNome = id => {
  const i = byId("instrumentos", id);
  return i ? `${esc(i.tipo)} nº ${esc(i.numero)}` : "—";
};
/* Tipo A→Z, depois número 1, 2, 10… (ordem numérica, não alfabética) */
const numInst = n => {
  const x = parseInt(String(n ?? "").replace(/\D/g, ""), 10);
  return Number.isFinite(x) ? x : 0;
};
const ordInst = (a, b) =>
  String(a.tipo || "").localeCompare(String(b.tipo || ""), "pt") ||
  numInst(a.numero) - numInst(b.numero) ||
  String(a.numero).localeCompare(String(b.numero), "pt", { numeric: true });
const badge = (cls, t) => `<span class="b ${cls}">${t}</span>`;
const idnovo = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

let currentUser = null;
let isAdmin = false;
let fb = null;
let erroInit = "";

try {
  if (typeof firebase !== "undefined" && window.firebaseConfig) {
    if (!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);
    fb = firebase.database();
  }
} catch (e) {
  console.error(e);
  erroInit = e.message;
}

/* ---------- DB (só com usuário logado) — tempo real via .on("value") ---------- */
const DB = {
  watch(c, cb) {
    if (!fb || !currentUser) return;
    fb.ref(c).on(
      "value",
      s => {
        const v = s.val() || {};
        cb(Object.entries(v).map(([id, o]) => ({ ...o, id })));
      },
      e => banner("mal", "Firebase recusou o acesso. Confira as Regras (auth != null) e se você está logado.")
    );
  },
  async put(c, itens) {
    if (!fb || !currentUser) throw new Error("Não autenticado");
    const u = {};
    itens.forEach(o => {
      const { id, ...d } = o;
      u[id || fb.ref(c).push().key] = d;
    });
    return fb.ref(c).update(u);
  },
  /** Grava 1 registro na hora (chamada em tempo real) */
  async set(c, id, data) {
    if (!fb || !currentUser) throw new Error("Não autenticado");
    return fb.ref(c + "/" + id).set(data);
  },
  async del(c, id) {
    if (!fb || !currentUser) throw new Error("Não autenticado");
    return fb.ref(c + "/" + id).remove();
  }
};

function banner(tipo, m) {
  const b = $("status");
  if (!b) return;
  const cls = tipo === "ok" ? "ok" : tipo === "warn" ? "warn" : "mal";
  b.innerHTML = `<div class="alert ${cls}">${m}</div>`;
}
function flash(m) {
  let el = $("flash");
  if (!el) {
    el = document.createElement("div");
    el.id = "flash";
    document.body.appendChild(el);
  }
  el.innerHTML = `<div class="flash-ok">${m}</div>`;
  setTimeout(() => (el.innerHTML = ""), 2200);
}
function falha(e) {
  const msg = /permission|PERMISSION/i.test(e.message || "")
    ? "O Firebase negou a permissão. Confira as Regras (auth != null) e se o e-mail/senha estão corretos."
    : e.message || String(e);
  alert("Não foi possível salvar: " + msg);
}

/* ---------- Auth ---------- */
function exigeLogin() {
  if (location.pathname.endsWith("login.html") || location.pathname.endsWith("/login")) return;
  firebase.auth().onAuthStateChanged(user => {
    if (!user) {
      location.replace("login.html");
      return;
    }
    currentUser = user;
    isAdmin = ADMINS.includes((user.email || "").toLowerCase());
    iniciarApp();
  });
}

function sair() {
  firebase.auth().signOut().then(() => location.replace("login.html"));
}

/* ---------- Páginas ---------- */
const statusOpts = [
  ["aberto", "🔴 Aberto"],
  ["resolvido", "🟢 Resolvido"]
];
const instOpts = (r, soLivres) => [
  ["", soLivres ? "Sem instrumento" : "Nenhum instrumento"],
  ...[...S.instrumentos]
    .sort(ordInst)
    .filter(i => !soLivres || (i.condicao !== "defeito" && (!alunoDe(i) || i.id === r.instrumentoId)))
    .map(i => [i.id, `${i.tipo} nº ${i.numero}`])
];

const P = {
  index: {
    t: "🎺 Sistema da Fanfarra",
    s: "Alunos, instrumentos, chamadas, avisos e eventos.",
    render() {
      const prox = S.eventos.filter(e => e.data >= hoje()).sort((a, b) => a.data.localeCompare(b.data))[0];
      const abertos = S.problemas.filter(x => x.status === "aberto").length;
      const livres = S.instrumentos.filter(i => i.condicao !== "defeito" && !alunoDe(i)).length;
      const card = (h, t, n) =>
        `<a class="stat" href="${h}.html"><small>${t}</small><b>${n}</b></a>`;
      $("conteudo").innerHTML = `
        <div class="stats">
          ${card("alunos", "👥 Alunos", S.alunos.length)}
          ${card("instrumentos", "🟢 Instr. livres", livres)}
          ${card("problemas", "🔧 Problemas", abertos)}
          ${card("eventos", "📅 Próximo", prox ? fmtData(prox.data).slice(0, 5) : "—")}
        </div>
        ${
          prox
            ? `<div class="card"><strong>📅 ${esc(prox.nome)}</strong> — ${fmtData(prox.data)}${
                prox.local ? " · " + esc(prox.local) : ""
              }</div>`
            : ""
        }
        <div class="row" style="margin-top:12px">
          ${NAV.slice(1)
            .map(([f, l]) => `<a href="${f}.html"><button type="button" class="sec">${l}</button></a>`)
            .join("")}
        </div>`;
    }
  },

  chamada: {
    t: "📋 Chamada",
    s: "Presença em tempo real — cada clique já grava no Firebase.",
    render() {
      if (!$("cTab")) {
        $("conteudo").innerHTML = `
          <div class="row" style="margin-bottom:12px">
            <div><label for="data">Data</label><input type="date" id="data" value="${hoje()}"></div>
            <div style="align-self:end"><span id="chamStatus" class="login-help">● ao vivo</span></div>
          </div>
          <div class="stats">
            <div class="stat"><small>👥 Total</small><b id="nT">0</b></div>
            <div class="stat"><small>🟢 Presentes</small><b id="nP">0</b></div>
            <div class="stat"><small>🔴 Faltas</small><b id="nF">0</b></div>
          </div>
          <div id="cTab"></div>`;
        $("data").onchange = () => {
          dr = { data: "", m: {}, local: {} };
          P.chamada.render();
        };
        $("cTab").onclick = e => {
          const b = e.target.closest("[data-p]");
          if (!b) return;
          const id = b.dataset.p;
          const d = dr.m[id] || (dr.m[id] = { p: false, o: "" });
          d.p = !d.p;
          dr.local[id] = Date.now();
          pintaBtn(b, d.p);
          contar();
          salvarAlunoChamada(id); // tempo real
        };
        $("cTab").oninput = e => {
          const a = e.target.dataset.o;
          if (!a) return;
          (dr.m[a] || (dr.m[a] = { p: false, o: "" })).o = e.target.value;
          dr.local[a] = Date.now();
          agendarObs(a); // debounced
        };
      }
      const data = $("data").value || ($("data").value = hoje());
      const focused = document.activeElement?.dataset?.o;

      // Mescla dados do Firebase; não sobrescreve o que o usuário acabou de editar
      if (dr.data !== data) {
        dr = { data, m: {}, local: {} };
      }
      S.chamadas.filter(c => c.data === data).forEach(c => {
        const recent = dr.local[c.alunoId] && Date.now() - dr.local[c.alunoId] < 2500;
        if (recent) return; // mantém edição local recente
        dr.m[c.alunoId] = { p: !!c.presente, o: c.observacao || "" };
      });

      const al = [...S.alunos].sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
      const idsAgora = al.map(a => a.id).join(",");
      const precisaRebuild = $("cTab").dataset.ids !== idsAgora || !$("cTab").dataset.built;

      if (precisaRebuild) {
        $("cTab").innerHTML =
          al
            .map(a => {
              const d = dr.m[a.id] || { p: false, o: "" };
              return `<div class="item" data-aluno="${a.id}">
              <div class="main"><strong>${esc(a.nome)}</strong><br><small>${esc(a.turma)} · ${instNome(a.instrumentoId)}</small></div>
              <button type="button" class="presenca-btn ${d.p ? "ok" : "del"}" data-p="${a.id}">${d.p ? "🟢 Presente" : "🔴 Falta"}</button>
              <input class="obs" data-o="${a.id}" value="${esc(d.o)}" placeholder="Obs." style="flex:1 1 120px;max-width:200px">
            </div>`;
            })
            .join("") || `<p class="empty">Nenhum aluno. Cadastre em <a href="alunos.html">Alunos</a>.</p>`;
        $("cTab").dataset.built = "1";
        $("cTab").dataset.ids = idsAgora;
      } else {
        // Só sincroniza botões/obs (tempo real sem piscar a lista)
        al.forEach(a => {
          const row = $("cTab").querySelector(`[data-aluno="${a.id}"]`);
          if (!row) return;
          const d = dr.m[a.id] || { p: false, o: "" };
          const btn = row.querySelector("[data-p]");
          if (btn) pintaBtn(btn, d.p);
          const inp = row.querySelector("[data-o]");
          if (inp && document.activeElement !== inp) inp.value = d.o || "";
        });
      }
      if (focused) {
        const el = $("cTab").querySelector(`[data-o="${focused}"]`);
        if (el) {
          el.focus();
          try {
            el.selectionStart = el.selectionEnd = el.value.length;
          } catch (_) {}
        }
      }
      contar();
      setChamStatus("● tempo real", true);
    }
  },

  alunos: {
    col: "alunos",
    item: "aluno",
    t: "👥 Alunos",
    s: "Cadastre os integrantes da fanfarra.",
    novo: "Novo aluno",
    campos: [
      { k: "nome", l: "Nome", req: 1 },
      { k: "turma", l: "Turma", req: 1, ph: "Ex.: 8º A" },
      { k: "instrumentoId", l: "Instrumento (opcional)", t: "select", opts: r => instOpts(r, true) }
    ],
    cab: ["Aluno", "Turma", "Instrumento"],
    lin: a => [`<strong>${esc(a.nome)}</strong>`, esc(a.turma), instNome(a.instrumentoId)],
    ordem: (a, b) => a.nome.localeCompare(b.nome, "pt")
  },

  instrumentos: {
    col: "instrumentos",
    item: "instrumento",
    t: "🥁 Instrumentos",
    s: "Controle a situação dos instrumentos.",
    novo: "Novo instrumento",
    campos: [
      { k: "tipo", l: "Tipo", t: "select", opts: () => TIPOS.map(x => [x, x]) },
      { k: "numero", l: "Número", t: "number", req: 1 },
      {
        k: "condicao",
        l: "Condição",
        t: "select",
        opts: () => [
          ["bom", "🟢 Bom"],
          ["defeito", "🔴 Com defeito"]
        ]
      }
    ],
    valida: o => {
      o.numero = numInst(o.numero) || o.numero;
      return S.instrumentos.some(
        x => x.id !== o.id && x.tipo === o.tipo && numInst(x.numero) === numInst(o.numero)
      )
        ? "Esse instrumento já está cadastrado."
        : "";
    },
    antes: o => {
      const n = numInst(o.numero);
      if (n) o.numero = n;
    },
    podeExcluir: r =>
      alunoDe(r) ? `Em uso por ${alunoDe(r).nome}. Retire do aluno antes de excluir.` : "",
    filtros: [
      ["todos", "Todos", () => 1],
      ["livre", "🟢 Livres", i => !alunoDe(i)],
      ["uso", "🔵 Em uso", i => alunoDe(i)],
      ["defeito", "🔴 Com defeito", i => i.condicao === "defeito"]
    ],
    cab: ["Instrumento", "Nº", "Condição", "Situação"],
    lin: r => [
      `<strong>🥁 ${esc(r.tipo)}</strong>`,
      esc(r.numero),
      r.condicao === "defeito" ? badge("mal", "Com defeito") : badge("bom", "Bom"),
      alunoDe(r) ? badge("uso", esc(alunoDe(r).nome)) : badge("livre", "Livre")
    ],
    ordem: ordInst
  },

  avisos: {
    col: "avisos",
    item: "aviso",
    t: "📢 Avisos",
    s: "Publique informações para toda a fanfarra.",
    novo: "Novo aviso",
    campos: [{ k: "texto", l: "Aviso", t: "textarea", req: 1 }],
    antes: o => {
      o.data = o.data || hoje();
      o.criado = o.criado || Date.now();
    },
    cab: ["Data", "Aviso"],
    lin: a => [fmtData(a.data), `<span style="white-space:pre-wrap">${esc(a.texto)}</span>`],
    ordem: (a, b) => (b.criado || 0) - (a.criado || 0)
  },

  eventos: {
    col: "eventos",
    item: "evento",
    t: "📅 Eventos",
    s: "Ensaios, apresentações e outros eventos.",
    novo: "Novo evento",
    campos: [
      { k: "nome", l: "Nome do evento", req: 1 },
      { k: "data", l: "Data", t: "date", req: 1, def: hoje() },
      { k: "local", l: "Local" }
    ],
    cab: ["Data", "Evento", "Local"],
    lin: e => [fmtData(e.data), `<strong>${esc(e.nome)}</strong>`, esc(e.local || "—")],
    ordem: (a, b) => a.data.localeCompare(b.data)
  },

  problemas: {
    col: "problemas",
    item: "problema",
    t: "🔧 Problemas",
    s: "Registre e acompanhe problemas nos instrumentos.",
    novo: "Registrar problema",
    campos: [
      { k: "descricao", l: "Descrição", t: "textarea", req: 1 },
      { k: "instrumentoId", l: "Instrumento", t: "select", opts: r => instOpts(r, false) },
      { k: "status", l: "Situação", t: "select", opts: () => statusOpts }
    ],
    antes: o => {
      o.data = o.data || hoje();
      o.criado = o.criado || Date.now();
    },
    async depois(o) {
      const i = byId("instrumentos", o.instrumentoId);
      if (!i) return;
      const outros = S.problemas.some(
        x => x.id !== o.id && x.instrumentoId === i.id && x.status === "aberto"
      );
      const c = o.status === "aberto" ? "defeito" : outros ? "defeito" : "bom";
      if (i.condicao !== c) await DB.put("instrumentos", [{ ...i, condicao: c }]);
    },
    filtros: [
      ["aberto", "🔴 Abertos", x => x.status === "aberto"],
      ["resolvido", "🟢 Resolvidos", x => x.status === "resolvido"],
      ["todos", "Todos", () => 1]
    ],
    cab: ["Situação", "Problema", "Instrumento", "Data"],
    lin: x => [
      x.status === "aberto" ? badge("mal", "Aberto") : badge("bom", "Resolvido"),
      `<span style="white-space:pre-wrap">${esc(x.descricao)}</span>`,
      instNome(x.instrumentoId),
      fmtData(x.data)
    ],
    ordem: (a, b) => (b.criado || 0) - (a.criado || 0)
  }
};

/* map data-page */
P.inicio = P.index;

/* ---------- Chamada helpers (tempo real) ---------- */
let dr = { data: "", m: {}, local: {} };
const obsTimers = {};

function pintaBtn(b, p) {
  b.className = "presenca-btn " + (p ? "ok" : "del");
  b.textContent = p ? "🟢 Presente" : "🔴 Falta";
}
function contar() {
  const t = S.alunos.length;
  const p = S.alunos.filter(a => dr.m[a.id]?.p).length;
  if ($("nT")) $("nT").textContent = t;
  if ($("nP")) $("nP").textContent = p;
  if ($("nF")) $("nF").textContent = t - p;
}
function setChamStatus(txt, ok) {
  const el = $("chamStatus");
  if (!el) return;
  el.textContent = txt;
  el.style.color = ok === false ? "var(--bad)" : ok ? "var(--ok)" : "var(--muted)";
}

async function salvarAlunoChamada(alunoId) {
  const data = $("data")?.value;
  if (!data || !alunoId) return;
  const d = dr.m[alunoId] || { p: false, o: "" };
  const id = `${data}_${alunoId}`;
  const payload = {
    data,
    alunoId,
    presente: !!d.p,
    observacao: (d.o || "").trim(),
    atualizado: Date.now(),
    por: (currentUser && currentUser.email) || ""
  };
  setChamStatus("☁ salvando…");
  try {
    // .set grava na hora e o .on("value") dos outros aparelhos dispara na sequência
    await DB.set("chamadas", id, payload);
    setChamStatus("● tempo real", true);
  } catch (e) {
    setChamStatus("✗ erro ao salvar", false);
    console.error(e);
    falha(e);
  }
}

function agendarObs(alunoId) {
  clearTimeout(obsTimers[alunoId]);
  setChamStatus("digitando…");
  obsTimers[alunoId] = setTimeout(() => salvarAlunoChamada(alunoId), 350);
}

/* ---------- Lista genérica ---------- */
let page = "",
  p = null,
  filtro = "",
  editId = "";

function renderLista() {
  let a = [...S[p.col]];
  if (p.filtros) a = a.filter(p.filtros.find(f => f[0] === filtro)[2]);
  a.sort(p.ordem);
  const fl = p.filtros
    ? `<div class="row" style="margin-bottom:12px">${p.filtros
        .map(
          f =>
            `<button type="button" class="sec ${f[0] === filtro ? "on" : ""}" data-f="${f[0]}">${f[1]}</button>`
        )
        .join("")}</div>`
    : "";
  const rows =
    a
      .map(
        r => `<div class="item">
      <div class="main">${p.lin(r).join(" · ")}</div>
      <div>
        <button type="button" class="sec" data-ed="${r.id}">✏️</button>
        <button type="button" class="del" data-del="${r.id}">🗑️</button>
      </div>
    </div>`
      )
      .join("") || `<p class="empty">Nada por aqui ainda.</p>`;
  $("conteudo").innerHTML = fl + rows;
}

function abrir(id) {
  const r = id ? byId(p.col, id) : {};
  editId = id || "";
  const body = p.campos
    .map(f => {
      const v = r[f.k] ?? f.def ?? "";
      const i = "f_" + f.k;
      let inp;
      if (f.t === "select") {
        inp = `<select id="${i}">${f
          .opts(r)
          .map(
            ([val, lab]) =>
              `<option value="${esc(val)}" ${String(val) === String(v) ? "selected" : ""}>${esc(lab)}</option>`
          )
          .join("")}</select>`;
      } else if (f.t === "textarea") {
        inp = `<textarea id="${i}" rows="3">${esc(v)}</textarea>`;
      } else {
        inp = `<input id="${i}" type="${f.t || "text"}" value="${esc(v)}" ${
          f.t === "number" ? 'min="1"' : ""
        } placeholder="${esc(f.ph || "")}">`;
      }
      return `<label for="${i}">${f.l}</label>${inp}`;
    })
    .join("");
  $("mTitulo").textContent = (id ? "Editar " : "Novo ") + p.item;
  $("mCorpo").innerHTML = body;
  $("modal").classList.remove("hide");
}

async function salvar() {
  const o = { ...(editId ? byId(p.col, editId) : {}) };
  for (const f of p.campos) {
    o[f.k] = ($("f_" + f.k).value || "").trim();
    if (f.req && !o[f.k]) return alert("Preencha: " + f.l + ".");
  }
  p.antes?.(o);
  const m = p.valida?.(o);
  if (m) return alert(m);
  try {
    if (!editId) o.id = idnovo();
    await DB.put(p.col, [o]);
    if (p.depois) await p.depois(o);
    fecharModal();
    flash("✅ Salvo!");
  } catch (e) {
    falha(e);
  }
}

async function excluir(id) {
  const m = p.podeExcluir?.(byId(p.col, id));
  if (m) return alert(m);
  if (!confirm("Excluir este registro?")) return;
  try {
    await DB.del(p.col, id);
  } catch (e) {
    falha(e);
  }
}

function fecharModal() {
  $("modal")?.classList.add("hide");
}

/* ---------- Shell ---------- */
function shell() {
  const top = $("top");
  if (top) {
    top.innerHTML = `
      <h1>🎺 FANFARRA <small style="font-weight:400;color:var(--muted);font-size:.75rem">${
        currentUser ? esc(currentUser.email) : ""
      }</small></h1>
      <nav>
        ${NAV.map(
          ([f, l]) =>
            `<a href="${f === "index" ? "index" : f}.html" class="${
              (page === f || (page === "inicio" && f === "index") ? "on" : "")
            }">${l}</a>`
        ).join("")}
        <a href="#" id="btnSair" style="margin-left:auto">Sair</a>
      </nav>`;
    $("btnSair").onclick = e => {
      e.preventDefault();
      sair();
    };
  }

  const main = $("conteudo");
  if (!main) return;

  /* header da página */
  let header = document.querySelector(".page-head");
  if (!header) {
    header = document.createElement("div");
    header.className = "page-head";
    main.parentNode.insertBefore(header, main);
  }
  header.innerHTML = `
    <div>
      <h2>${p.t}</h2>
      <p class="login-help">${p.s}</p>
    </div>
    ${p.novo ? `<button type="button" id="bNovo">➕ ${p.novo}</button>` : ""}`;

  if (!$("status")) {
    const st = document.createElement("div");
    st.id = "status";
    header.after(st);
  }

  if (!$("modal")) {
    const m = document.createElement("div");
    m.id = "modal";
    m.className = "modal-bg hide";
    m.innerHTML = `
      <div class="modal-card">
        <h3 id="mTitulo"></h3>
        <div id="mCorpo"></div>
        <div class="row" style="margin-top:14px">
          <button type="button" class="sec" id="bCancel">Cancelar</button>
          <button type="button" id="bSalvar">💾 Salvar</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    $("bCancel").onclick = fecharModal;
    $("bSalvar").onclick = salvar;
    m.onclick = e => {
      if (e.target === m) fecharModal();
    };
  }

  if (p.novo) $("bNovo").onclick = () => abrir();

  main.onclick = e => {
    const b = e.target.closest("button");
    if (!b || !p.col) return;
    if (b.dataset.ed) abrir(b.dataset.ed);
    else if (b.dataset.del) excluir(b.dataset.del);
    else if (b.dataset.f) {
      filtro = b.dataset.f;
      renderLista();
    }
  };

  banner("ok", "🟢 Conectado · " + (isAdmin ? "Administrador" : "Usuário") + " · " + esc(currentUser.email));
}

function iniciarApp() {
  page = document.body.dataset.page || "inicio";
  p = P[page] || P.index;
  if (p.filtros) filtro = p.filtros[0][0];
  shell();
  let pronto = false;
  function redesenhar(origem) {
    if (!pronto && OK.size < COLS.length) return;
    pronto = true;
    // Qualquer mudança no Firebase redesenha a tela atual (tempo real)
    if (p.render) p.render();
    else renderLista();
  }
  COLS.forEach(c =>
    DB.watch(c, a => {
      S[c] = a;
      OK.add(c);
      redesenhar(c);
    })
  );
}

/* ---------- Login page ---------- */
function setupLogin() {
  if (!location.pathname.endsWith("login.html") && !location.pathname.endsWith("/login")) return false;

  firebase.auth().onAuthStateChanged(u => {
    if (u) location.replace("index.html");
  });

  const form = $("loginForm");
  if (!form) return true;

  const msg = t => {
    const el = $("mensagem");
    if (el) el.textContent = t || "";
  };

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const email = ($("email").value || "").trim().toLowerCase();
    const senha = $("senha").value;
    if (!email || !senha) return msg("Digite e-mail e senha.");
    $("entrar").disabled = true;
    msg("");
    try {
      await firebase.auth().signInWithEmailAndPassword(email, senha);
      location.replace("index.html");
    } catch (err) {
      const code = err.code || "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found")
        msg("E-mail ou senha incorretos.");
      else if (code === "auth/too-many-requests") msg("Muitas tentativas. Aguarde um pouco.");
      else msg(err.message || "Erro ao entrar.");
      $("entrar").disabled = false;
    }
  });

  const btnCad = $("cadastrar");
  if (btnCad) {
    btnCad.onclick = async () => {
      const email = ($("email").value || "").trim().toLowerCase();
      const senha = $("senha").value;
      if (!email || !senha) return msg("Digite e-mail e senha para cadastrar.");
      if (senha.length < 6) return msg("A senha precisa ter no mínimo 6 caracteres.");
      btnCad.disabled = true;
      $("entrar").disabled = true;
      msg("");
      try {
        await firebase.auth().createUserWithEmailAndPassword(email, senha);
        location.replace("index.html");
      } catch (err) {
        if (err.code === "auth/email-already-in-use") msg("Este e-mail já está cadastrado. Use Entrar.");
        else if (err.code === "auth/weak-password") msg("Senha fraca (mín. 6 caracteres).");
        else if (err.code === "auth/invalid-email") msg("E-mail inválido.");
        else msg(err.message || "Erro ao cadastrar.");
        btnCad.disabled = false;
        $("entrar").disabled = false;
      }
    };
  }
  return true;
}

/* ---------- boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  if (typeof firebase === "undefined") {
    document.body.innerHTML =
      '<main class="login-wrap"><div class="login-card"><h2>Firebase não carregou</h2><p>Verifique a conexão e os scripts.</p></div></main>';
    return;
  }
  if (!setupLogin()) exigeLogin();
});

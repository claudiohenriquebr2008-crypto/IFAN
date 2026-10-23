"use strict";
/* IFAN — Fanfarra
   Admin: tudo (chamada, alunos, instrumentos, avisos, eventos, problemas)
   Aluno: só avisos + eventos (leitura) e registrar/ver problemas */

const COLS = ["alunos", "instrumentos", "chamadas", "avisos", "eventos", "problemas"];
const TIPOS = [
  "Caixa", "Tarol", "Bumbo", "Surdo pequeno", "Surdo médio", "Surdo grande",
  "Treme terra", "Prato", "Lira", "Corneta", "Fuzil",
  "Repinique", "Tamborim", "Chocalho", "Pandeiro", "Agogô", "Triângulo", "Cuíca"
];
const NAV_ADMIN = [
  ["index", "🏠 Início"],
  ["chamada", "📋 Chamada"],
  ["alunos", "👥 Alunos"],
  ["instrumentos", "🥁 Instrumentos"],
  ["avisos", "📢 Avisos"],
  ["eventos", "📅 Eventos"],
  ["problemas", "🔧 Problemas"]
];
const NAV_ALUNO = [
  ["index", "🏠 Início"],
  ["avisos", "📢 Avisos"],
  ["eventos", "📅 Eventos"],
  ["problemas", "🔧 Meus problemas"]
];
/* E-mails que sempre são admin (além de papeis/{uid}=admin no Firebase) */
const ADMINS = [
  "administrativo945@gmail.com",
  "claudiohenriquebr2008@gmail.com"
];
const PAGINAS_SO_ADMIN = new Set(["chamada", "alunos", "instrumentos"]);

const S = {};
COLS.forEach(c => (S[c] = []));
const OK = new Set();

const $ = id => document.getElementById(id);
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
const numInst = n => {
  const x = parseInt(String(n ?? "").replace(/\D/g, ""), 10);
  return Number.isFinite(x) ? x : 0;
};
const ordInst = (a, b) =>
  numInst(a.numero) - numInst(b.numero) ||
  String(a.tipo || "").localeCompare(String(b.tipo || ""), "pt");
const badge = (cls, t) => `<span class="b ${cls}">${t}</span>`;
const idnovo = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

let currentUser = null;
let isAdmin = false;
let papel = "aluno";
let fb = null;

try {
  if (typeof firebase !== "undefined" && window.firebaseConfig) {
    if (!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);
    fb = firebase.database();
  }
} catch (e) {
  console.error(e);
}

const DB = {
  watch(c, cb) {
    if (!fb || !currentUser) return;
    fb.ref(c).on(
      "value",
      s => {
        const v = s.val() || {};
        cb(Object.entries(v).map(([id, o]) => ({ ...o, id })));
      },
      () => banner("mal", "Firebase recusou o acesso. Confira as Regras e o login.")
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
  b.innerHTML = `<div class="alert ${tipo === "ok" ? "ok" : tipo === "warn" ? "warn" : "mal"}">${m}</div>`;
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
  alert(
    "Não foi possível salvar: " +
      (/permission/i.test(e.message || "")
        ? "permissão negada no Firebase."
        : e.message || String(e))
  );
}

function navAtual() {
  return isAdmin ? NAV_ADMIN : NAV_ALUNO;
}

async function carregarPapel(user) {
  const email = (user.email || "").toLowerCase();
  if (ADMINS.includes(email)) {
    isAdmin = true;
    papel = "admin";
    return;
  }
  try {
    const snap = await fb.ref("papeis/" + user.uid).once("value");
    const v = snap.val();
    if (v === "admin") {
      isAdmin = true;
      papel = "admin";
    } else {
      isAdmin = false;
      papel = "aluno";
      /* garante nó de papel aluno se não existir */
      if (!v) await fb.ref("papeis/" + user.uid).set("aluno");
    }
  } catch {
    isAdmin = false;
    papel = "aluno";
  }
}

function exigeLogin() {
  if (location.pathname.endsWith("login.html")) return;
  firebase.auth().onAuthStateChanged(async user => {
    if (!user) {
      location.replace("login.html");
      return;
    }
    currentUser = user;
    await carregarPapel(user);
    const page = document.body.dataset.page || "inicio";
    if (!isAdmin && PAGINAS_SO_ADMIN.has(page)) {
      location.replace("index.html");
      return;
    }
    iniciarApp();
  });
}

function sair() {
  firebase.auth().signOut().then(() => location.replace("login.html"));
}

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

/* ---------- Páginas ---------- */
const P = {
  index: {
    t: "🎺 Sistema da Fanfarra",
    s: "Painel principal",
    render() {
      if (isAdmin) return renderIndexAdmin();
      return renderIndexAluno();
    }
  },

  chamada: {
    t: "📋 Chamada",
    s: "Presença em tempo real — cada clique já grava.",
    render() {
      if (!isAdmin) return;
      if (!$("cTab")) {
        $("conteudo").innerHTML = `
          <div class="row" style="margin-bottom:12px;align-items:flex-end">
            <div><label for="data">Data</label><input type="date" id="data" value="${hoje()}"></div>
            <div class="relogio-box">
              <div class="relogio-hora" id="relogioHora">--:--:--</div>
              <div class="relogio-sub">⏱ Tempo da chamada: <strong id="relogioDecorrido">00:00:00</strong></div>
              <div><span id="chamStatus" class="login-help">● tempo real</span></div>
            </div>
          </div>
          <div class="stats">
            <div class="stat"><small>👥 Total</small><b id="nT">0</b></div>
            <div class="stat"><small>🟢 Presentes</small><b id="nP">0</b></div>
            <div class="stat"><small>🔴 Faltas</small><b id="nF">0</b></div>
          </div>
          <div id="cTab"></div>`;
        $("data").onchange = () => {
          dr = { data: "", m: {}, local: {} };
          inicioChamada = Date.now();
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
          salvarAlunoChamada(id);
        };
        $("cTab").oninput = e => {
          const a = e.target.dataset.o;
          if (!a) return;
          (dr.m[a] || (dr.m[a] = { p: false, o: "" })).o = e.target.value;
          dr.local[a] = Date.now();
          agendarObs(a);
        };
        iniciarRelogioChamada();
      }
      const data = $("data").value || ($("data").value = hoje());
      const focused = document.activeElement?.dataset?.o;
      if (dr.data !== data) dr = { data, m: {}, local: {} };
      S.chamadas.filter(c => c.data === data).forEach(c => {
        const recent = dr.local[c.alunoId] && Date.now() - dr.local[c.alunoId] < 2500;
        if (recent) return;
        dr.m[c.alunoId] = { p: !!c.presente, o: c.observacao || "" };
      });
      const al = [...S.alunos].sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
      const idsAgora = al.map(a => a.id).join(",");
      if ($("cTab").dataset.ids !== idsAgora || !$("cTab").dataset.built) {
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
            .join("") || `<p class="empty">Nenhum aluno cadastrado.</p>`;
        $("cTab").dataset.built = "1";
        $("cTab").dataset.ids = idsAgora;
      } else {
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
    soAdmin: true,
    campos: [
      { k: "nome", l: "Nome", req: 1 },
      { k: "turma", l: "Turma", req: 1, ph: "Ex.: 8º A" },
      { k: "instrumentoId", l: "Instrumento (opcional)", t: "select", opts: r => instOpts(r, true) }
    ],
    lin: a => [`<strong>${esc(a.nome)}</strong>`, esc(a.turma), instNome(a.instrumentoId)],
    ordem: (a, b) => a.nome.localeCompare(b.nome, "pt")
  },

  instrumentos: {
    col: "instrumentos",
    item: "instrumento",
    t: "🥁 Instrumentos",
    s: "Ordenados do nº 1 ao 46.",
    novo: "Novo instrumento",
    soAdmin: true,
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
      alunoDe(r) ? `Em uso por ${alunoDe(r).nome}. Retire do aluno antes.` : "",
    filtros: [
      ["todos", "Todos", () => 1],
      ["livre", "🟢 Livres", i => !alunoDe(i)],
      ["uso", "🔵 Em uso", i => alunoDe(i)],
      ["defeito", "🔴 Defeito", i => i.condicao === "defeito"]
    ],
    lin: r => [
      `<strong>🥁 ${esc(r.tipo)}</strong>`,
      `nº ${esc(r.numero)}`,
      r.condicao === "defeito" ? badge("mal", "Defeito") : badge("bom", "Bom"),
      alunoDe(r) ? badge("uso", esc(alunoDe(r).nome)) : badge("livre", "Livre")
    ],
    ordem: ordInst
  },

  avisos: {
    col: "avisos",
    item: "aviso",
    t: "📢 Avisos",
    s: isAdmin ? "Publique avisos para a fanfarra." : "Avisos da fanfarra (somente leitura).",
    get novo() {
      return isAdmin ? "Novo aviso" : null;
    },
    somenteLeitura: () => !isAdmin,
    campos: [{ k: "texto", l: "Aviso", t: "textarea", req: 1 }],
    antes: o => {
      o.data = o.data || hoje();
      o.criado = o.criado || Date.now();
      o.autor = (currentUser && currentUser.email) || "";
    },
    lin: a => [
      fmtData(a.data),
      `<span style="white-space:pre-wrap">${esc(a.texto)}</span>`
    ],
    ordem: (a, b) => (b.criado || 0) - (a.criado || 0)
  },

  eventos: {
    col: "eventos",
    item: "evento",
    t: "📅 Eventos",
    s: isAdmin ? "Ensaios e apresentações." : "Próximos ensaios e apresentações.",
    get novo() {
      return isAdmin ? "Novo evento" : null;
    },
    somenteLeitura: () => !isAdmin,
    campos: [
      { k: "nome", l: "Nome do evento", req: 1 },
      { k: "data", l: "Data", t: "date", req: 1, def: hoje() },
      { k: "local", l: "Local" },
      { k: "obs", l: "Observação", t: "textarea" }
    ],
    lin: e => [
      fmtData(e.data),
      `<strong>${esc(e.nome)}</strong>`,
      esc(e.local || "—"),
      e.obs ? `<small>${esc(e.obs)}</small>` : ""
    ],
    ordem: (a, b) => a.data.localeCompare(b.data)
  },

  problemas: {
    col: "problemas",
    item: "problema",
    t: "🔧 Problemas",
    s: isAdmin
      ? "Veja e resolva os problemas relatados pelos alunos."
      : "Relate problemas nos instrumentos. O admin resolve.",
    get novo() {
      return "Reportar problema";
    },
    camposAluno: [
      { k: "descricao", l: "Descreva o problema", t: "textarea", req: 1 },
      { k: "instrumentoId", l: "Instrumento (se souber)", t: "select", opts: r => instOpts(r, false) }
    ],
    camposAdmin: [
      { k: "descricao", l: "Descrição", t: "textarea", req: 1 },
      { k: "instrumentoId", l: "Instrumento", t: "select", opts: r => instOpts(r, false) },
      { k: "status", l: "Situação", t: "select", opts: () => statusOpts }
    ],
    get campos() {
      return isAdmin ? this.camposAdmin : this.camposAluno;
    },
    antes: o => {
      o.data = o.data || hoje();
      o.criado = o.criado || Date.now();
      if (!o.status) o.status = "aberto";
      if (!o.autorUid) o.autorUid = currentUser.uid;
      if (!o.autorEmail) o.autorEmail = currentUser.email || "";
    },
    async depois(o) {
      if (!isAdmin) return;
      const i = byId("instrumentos", o.instrumentoId);
      if (!i) return;
      const outros = S.problemas.some(
        x => x.id !== o.id && x.instrumentoId === i.id && x.status === "aberto"
      );
      const c = o.status === "aberto" ? "defeito" : outros ? "defeito" : "bom";
      if (i.condicao !== c) await DB.put("instrumentos", [{ ...i, condicao: c }]);
    },
    filtros: isAdmin
      ? [
          ["aberto", "🔴 Abertos", x => x.status === "aberto"],
          ["resolvido", "🟢 Resolvidos", x => x.status === "resolvido"],
          ["todos", "Todos", () => 1]
        ]
      : [
          ["meus", "Meus relatos", x => x.autorUid === currentUser.uid],
          ["aberto", "🔴 Abertos", x => x.status === "aberto"],
          ["todos", "Todos", () => 1]
        ],
    lin: x => {
      const base = [
        x.status === "aberto" ? badge("mal", "Aberto") : badge("bom", "Resolvido"),
        `<span style="white-space:pre-wrap">${esc(x.descricao)}</span>`,
        instNome(x.instrumentoId),
        fmtData(x.data)
      ];
      if (isAdmin) base.push(`<small>${esc(x.autorEmail || "—")}</small>`);
      return base;
    },
    ordem: (a, b) => (b.criado || 0) - (a.criado || 0),
    /* aluno não edita nem exclui; admin resolve */
    podeEditar: () => isAdmin,
    podeExcluir: () => (isAdmin ? "" : "Só o administrador pode excluir.")
  }
};
P.inicio = P.index;

function renderIndexAdmin() {
  const prox = S.eventos.filter(e => e.data >= hoje()).sort((a, b) => a.data.localeCompare(b.data))[0];
  const abertos = S.problemas.filter(x => x.status === "aberto").length;
  const livres = S.instrumentos.filter(i => i.condicao !== "defeito" && !alunoDe(i)).length;
  const card = (h, ic, t, n, sub) =>
    `<a class="stat-card" href="${h}.html"><span class="stat-ic">${ic}</span><div><small>${t}</small><b>${n}</b>${sub ? `<em>${sub}</em>` : ""}</div></a>`;
  const mods = [
    ["chamada", "📋", "Chamada", "Presença em tempo real"],
    ["alunos", "👥", "Alunos", "Cadastro e turmas"],
    ["instrumentos", "🥁", "Instrumentos", "Números 1–46"],
    ["avisos", "📢", "Avisos", "Comunicados"],
    ["eventos", "📅", "Eventos", "Ensaios e shows"],
    ["problemas", "🔧", "Problemas", abertos ? abertos + " abertos" : "Tudo ok"]
  ];
  $("conteudo").innerHTML = `
    <section class="dash-hero">
      <div>
        <p class="dash-kicker">Painel do administrador</p>
        <h2 class="dash-title">Controle da fanfarra</h2>
        <p class="dash-sub">Chamada, instrumentos, avisos e problemas em um só lugar — sincronizado em tempo real.</p>
      </div>
      ${prox ? `<div class="dash-next"><span>Próximo evento</span><strong>${esc(prox.nome)}</strong><small>${fmtData(prox.data)}${prox.local ? " · " + esc(prox.local) : ""}</small></div>` : `<div class="dash-next muted"><span>Próximo evento</span><strong>Nenhum agendado</strong></div>`}
    </section>
    <div class="stats stats-rich">
      ${card("alunos", "👥", "Alunos", S.alunos.length, "cadastrados")}
      ${card("instrumentos", "🟢", "Livres", livres, "instrumentos")}
      ${card("problemas", "🔧", "Problemas", abertos, "abertos")}
      ${card("eventos", "📅", "Eventos", S.eventos.length, "no total")}
    </div>
    ${abertos ? `<div class="card destaque-alerta"><strong>${abertos} problema(s) aguardando</strong> — <a href="problemas.html">Resolver agora →</a></div>` : ""}
    <h3 class="sec-title">Atalhos</h3>
    <div class="mod-grid">
      ${mods.map(([f, ic, t, d]) => `<a class="mod-card" href="${f}.html"><span>${ic}</span><strong>${t}</strong><small>${d}</small></a>`).join("")}
    </div>`;
}

function renderIndexAluno() {
  const prox = S.eventos
    .filter(e => e.data >= hoje())
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 4);
  const avisos = [...S.avisos].sort((a, b) => (b.criado || 0) - (a.criado || 0)).slice(0, 4);
  const meus = S.problemas.filter(x => x.autorUid === currentUser.uid);
  const meusAbertos = meus.filter(x => x.status === "aberto").length;

  $("conteudo").innerHTML = `
    <section class="dash-hero aluno">
      <div>
        <p class="dash-kicker">Área do aluno</p>
        <h2 class="dash-title">Olá! Bem-vindo à fanfarra</h2>
        <p class="dash-sub">Veja avisos e eventos. Se algo no instrumento estiver errado, reporte um problema.</p>
      </div>
      <a class="dash-cta" href="problemas.html">➕ Reportar problema</a>
    </section>
    <div class="stats stats-rich">
      <a class="stat-card" href="avisos.html"><span class="stat-ic">📢</span><div><small>Avisos</small><b>${S.avisos.length}</b></div></a>
      <a class="stat-card" href="eventos.html"><span class="stat-ic">📅</span><div><small>Eventos</small><b>${S.eventos.length}</b></div></a>
      <a class="stat-card" href="problemas.html"><span class="stat-ic">🔧</span><div><small>Meus abertos</small><b>${meusAbertos}</b></div></a>
    </div>
    <div class="two-col">
      <div class="card panel">
        <div class="panel-head"><h3>📅 Próximos eventos</h3><a href="eventos.html">Ver todos</a></div>
        ${prox.length ? prox.map(e => `<div class="timeline-item"><div class="tl-date">${fmtData(e.data)}</div><div><strong>${esc(e.nome)}</strong><small>${e.local ? esc(e.local) : "Local a definir"}${e.obs ? " · " + esc(e.obs) : ""}</small></div></div>`).join("") : `<p class="empty">Nenhum evento futuro.</p>`}
      </div>
      <div class="card panel">
        <div class="panel-head"><h3>📢 Últimos avisos</h3><a href="avisos.html">Ver todos</a></div>
        ${avisos.length ? avisos.map(a => `<div class="aviso-item"><small>${fmtData(a.data)}</small><p>${esc(a.texto)}</p></div>`).join("") : `<p class="empty">Nenhum aviso ainda.</p>`}
      </div>
    </div>`;
}

/* ---------- Chamada helpers ---------- */
let dr = { data: "", m: {}, local: {} };
const obsTimers = {};
let inicioChamada = Date.now();
let relogioTimer = null;

function pad2(n) {
  return String(n).padStart(2, "0");
}
function fmtHora(d) {
  return pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds());
}
function fmtDecorrido(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return pad2(Math.floor(s / 3600)) + ":" + pad2(Math.floor((s % 3600) / 60)) + ":" + pad2(s % 60);
}
function tickRelogio() {
  const agora = new Date();
  if ($("relogioHora")) $("relogioHora").textContent = fmtHora(agora);
  if ($("relogioDecorrido")) $("relogioDecorrido").textContent = fmtDecorrido(agora - inicioChamada);
}
function iniciarRelogioChamada() {
  inicioChamada = inicioChamada || Date.now();
  tickRelogio();
  if (relogioTimer) clearInterval(relogioTimer);
  relogioTimer = setInterval(tickRelogio, 1000);
}
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
  setChamStatus("☁ salvando…");
  try {
    await DB.set("chamadas", `${data}_${alunoId}`, {
      data,
      alunoId,
      presente: !!d.p,
      observacao: (d.o || "").trim(),
      atualizado: Date.now(),
      por: currentUser.email || ""
    });
    setChamStatus("● tempo real", true);
  } catch (e) {
    setChamStatus("✗ erro", false);
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
  if (p.filtros) {
    const f = p.filtros.find(x => x[0] === filtro) || p.filtros[0];
    a = a.filter(f[2]);
  }
  a.sort(p.ordem);
  const soLeitura = p.somenteLeitura && p.somenteLeitura();
  const podeEd = p.podeEditar ? p.podeEditar() : !soLeitura;
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
      .map(r => {
        const acoes = [];
        if (podeEd && isAdmin) {
          acoes.push(`<button type="button" class="sec" data-ed="${r.id}">✏️</button>`);
          if (p.col === "problemas" && r.status === "aberto") {
            acoes.push(
              `<button type="button" class="ok" data-res="${r.id}">✅ Resolver</button>`
            );
          }
          acoes.push(`<button type="button" class="del" data-del="${r.id}">🗑️</button>`);
        }
        return `<div class="item">
      <div class="main">${p.lin(r).filter(Boolean).join(" · ")}</div>
      <div class="acoes">${acoes.join(" ")}</div>
    </div>`;
      })
      .join("") || `<p class="empty">Nada por aqui ainda.</p>`;
  $("conteudo").innerHTML = fl + rows;
}

function abrir(id) {
  if (p.somenteLeitura && p.somenteLeitura() && !id) return;
  if (p.podeEditar && id && !p.podeEditar()) return alert("Sem permissão para editar.");
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
              `<option value="${esc(val)}" ${String(val) === String(v) ? "selected" : ""}>${esc(
                lab
              )}</option>`
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
    flash(isAdmin ? "✅ Salvo!" : "✅ Problema enviado! O admin vai analisar.");
  } catch (e) {
    falha(e);
  }
}

async function excluir(id) {
  const msg = typeof p.podeExcluir === "function" ? p.podeExcluir(byId(p.col, id)) : "";
  if (msg) return alert(msg);
  if (!isAdmin && p.col !== "problemas") return alert("Sem permissão.");
  if (!confirm("Excluir este registro?")) return;
  try {
    await DB.del(p.col, id);
  } catch (e) {
    falha(e);
  }
}

async function resolverProblema(id) {
  if (!isAdmin) return;
  const o = byId("problemas", id);
  if (!o) return;
  if (!confirm("Marcar este problema como resolvido?")) return;
  try {
    const novo = { ...o, status: "resolvido" };
    await DB.put("problemas", [novo]);
    if (P.problemas.depois) await P.problemas.depois(novo);
    flash("✅ Problema resolvido!");
  } catch (e) {
    falha(e);
  }
}

function fecharModal() {
  $("modal")?.classList.add("hide");
}

function shell() {
  const top = $("top");
  if (top) {
    top.innerHTML = `
      <h1><img class="logo-mini" src="logo-fanfarra.png" alt=""> FANFARRA IFMT <small>${esc(
        currentUser.email || ""
      )} · ${isAdmin ? "Admin" : "Aluno"}</small></h1>
      <nav>
        ${navAtual()
          .map(([f, l]) => {
            const href = f === "index" ? "index.html" : f + ".html";
            const on =
              page === f || (page === "inicio" && f === "index") ? "on" : "";
            return `<a href="${href}" class="${on}">${l}</a>`;
          })
          .join("")}
        <a href="#" id="btnSair" style="margin-left:auto">Sair</a>
      </nav>`;
    $("btnSair").onclick = e => {
      e.preventDefault();
      sair();
    };
  }

  const main = $("conteudo");
  if (!main) return;

  let header = document.querySelector(".page-head");
  if (!header) {
    header = document.createElement("div");
    header.className = "page-head";
    main.parentNode.insertBefore(header, main);
  }
  const novoBtn = p.novo ? `<button type="button" id="bNovo">➕ ${p.novo}</button>` : "";
  header.innerHTML = `
    <div>
      <h2>${typeof p.t === "function" ? p.t() : p.t}</h2>
      <p class="login-help">${typeof p.s === "function" ? p.s() : p.s}</p>
    </div>
    ${novoBtn}`;

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

  if (p.novo && $("bNovo")) $("bNovo").onclick = () => abrir();

  main.onclick = e => {
    const b = e.target.closest("button");
    if (!b || !p.col) return;
    if (b.dataset.ed) abrir(b.dataset.ed);
    else if (b.dataset.del) excluir(b.dataset.del);
    else if (b.dataset.res) resolverProblema(b.dataset.res);
    else if (b.dataset.f) {
      filtro = b.dataset.f;
      renderLista();
    }
  };

  banner(
    "ok",
    (isAdmin ? "🟢 Admin" : "🔵 Aluno") + " · " + esc(currentUser.email) + " · dados em tempo real"
  );
}

function iniciarApp() {
  page = document.body.dataset.page || "inicio";
  p = P[page] || P.index;
  /* atualiza textos dinâmicos de papel */
  if (page === "avisos") {
    p.s = isAdmin ? "Publique avisos para a fanfarra." : "Avisos da fanfarra (somente leitura).";
  }
  if (page === "eventos") {
    p.s = isAdmin ? "Ensaios e apresentações." : "Próximos ensaios e apresentações.";
  }
  if (page === "problemas") {
    p.t = isAdmin ? "🔧 Problemas" : "🔧 Meus problemas";
    p.s = isAdmin
      ? "Veja e resolva os problemas relatados."
      : "Relate problemas. O admin analisa e resolve.";
    p.filtros = isAdmin
      ? [
          ["aberto", "🔴 Abertos", x => x.status === "aberto"],
          ["resolvido", "🟢 Resolvidos", x => x.status === "resolvido"],
          ["todos", "Todos", () => 1]
        ]
      : [
          ["meus", "Meus relatos", x => x.autorUid === currentUser.uid],
          ["aberto", "🔴 Abertos", x => x.status === "aberto"],
          ["todos", "Todos", () => 1]
        ];
  }
  if (p.filtros) filtro = p.filtros[0][0];
  shell();
  let pronto = false;
  function redesenhar() {
    if (!pronto && OK.size < COLS.length) return;
    pronto = true;
    if (p.render) p.render();
    else renderLista();
  }
  COLS.forEach(c =>
    DB.watch(c, a => {
      S[c] = a;
      OK.add(c);
      redesenhar();
    })
  );
}

function setupLogin() {
  if (!location.pathname.endsWith("login.html") && !location.pathname.endsWith("/login"))
    return false;

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
      if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found"
      )
        msg("E-mail ou senha incorretos.");
      else if (code === "auth/too-many-requests") msg("Muitas tentativas. Aguarde.");
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
      if (senha.length < 6) return msg("Senha com no mínimo 6 caracteres.");
      btnCad.disabled = true;
      $("entrar").disabled = true;
      msg("");
      try {
        const cred = await firebase.auth().createUserWithEmailAndPassword(email, senha);
        /* novo usuário = aluno por padrão */
        try {
          await firebase.database().ref("papeis/" + cred.user.uid).set("aluno");
        } catch (_) {}
        location.replace("index.html");
      } catch (err) {
        if (err.code === "auth/email-already-in-use") msg("E-mail já cadastrado. Use Entrar.");
        else if (err.code === "auth/weak-password") msg("Senha fraca.");
        else if (err.code === "auth/invalid-email") msg("E-mail inválido.");
        else msg(err.message || "Erro ao cadastrar.");
        btnCad.disabled = false;
        $("entrar").disabled = false;
      }
    };
  }
  return true;
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof firebase === "undefined") {
    document.body.innerHTML =
      '<main class="login-wrap"><div class="login-card"><h2>Firebase não carregou</h2></div></main>';
    return;
  }
  if (!setupLogin()) exigeLogin();
});

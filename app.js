"use strict";
/* FANFARRA — funciona com o Firebase (firebase-config.js) ou, sem ele, só neste aparelho. */
const TIPOS = ["Caixa","Tarol","Bumbo","Surdo pequeno","Surdo médio","Surdo grande","Treme terra","Prato","Lira","Corneta","Fuzil","Repinique","Tamborim","Chocalho","Pandeiro","Agogô","Triângulo","Cuíca"];
const ESTADOS = {bom:"Bom estado", mal:"Mal estado", desafinado:"Desafinado"};
const PAGINAS = [["index.html","Início","inicio"],["chamada.html","Chamada","chamada"],["instrumentos.html","Instrumentos","instrumentos"],["avisos.html","Avisos e eventos","avisos"],["problemas.html","Problemas","problemas"],["cadastrar-aluno.html","Cadastrar aluno","aluno"],["cadastrar-instrumento.html","Cadastrar instrumento","cadinst"]];

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const fmtData = d => d ? String(d).split("-").reverse().join("/") : "";
const ordem = (a,b) => String(a ?? "").localeCompare(String(b ?? ""), "pt", {numeric:true});
const cond = i => i.condicao === "defeito" ? "mal" : (ESTADOS[i.condicao] ? i.condicao : "bom"); // "defeito" é o valor antigo
const badge = e => `<span class="b ${e}">${ESTADOS[e]}</span>`;
const nome = i => `${i.tipo} nº ${i.numero}`;
const ordInst = (a,b) => ordem(a.tipo,b.tipo) || (a.numero - b.numero);

function toast(msg, erro){
  const velho = $("toast"); if(velho) velho.remove();
  const t = document.createElement("div"); t.id = "toast"; if(erro) t.className = "err"; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), erro ? 5000 : 2400);
}
/* roda uma ação; qualquer erro aparece na tela (nada falha em silêncio) */
async function run(fn, okMsg){
  try{ await fn(); if(okMsg) toast(okMsg); }
  catch(e){ console.error(e); toast(e.message || String(e), true); }
}
function erroCarga(id, e){ console.error(e); $(id).innerHTML = `<div class="errbox">⚠️ ${esc(e.message || e)}</div>`; }
function delegar(el, tipo, mapa){
  el.addEventListener(tipo, e => {
    const b = e.target.closest("[data-a]"); if(!b || !el.contains(b)) return;
    const f = mapa[b.dataset.a]; if(f) f(b.dataset.id, b, e);
  });
}

/* ---------- Dados ---------- */
const CFG = (typeof firebaseConfig !== "undefined" && firebaseConfig.databaseURL) ? firebaseConfig.databaseURL.replace(/\/$/,"") : "";
async function http(url, opt){
  let r;
  try{ r = await fetch(url, opt); }catch(e){ throw new Error("Sem conexão com o Firebase. Confira a internet."); }
  if(r.status === 401 || r.status === 403) throw new Error("O Firebase negou o acesso. Em Realtime Database → Regras, permita leitura e escrita (veja o README).");
  if(!r.ok) throw new Error("Erro do Firebase (" + r.status + ").");
  return r.json();
}
const lsMap = c => { try{ return JSON.parse(localStorage.getItem("fanfarra3_" + c)) || {}; }catch{ return {}; } };
const lsSave = (c, m) => localStorage.setItem("fanfarra3_" + c, JSON.stringify(m));
const semId = o => { const d = {...o}; delete d.id; return d; };

const DB = {
  cloud: !!CFG,
  async list(col){
    const m = this.cloud ? ((await http(`${CFG}/${col}.json`)) || {}) : lsMap(col);
    return Object.entries(m).filter(([,o]) => o && typeof o === "object").map(([id,o]) => ({...o, id}));
  },
  async put(col, obj){
    const id = obj.id || novoId(), d = semId(obj);
    if(this.cloud) await http(`${CFG}/${col}/${id}.json`, {method:"PUT", body:JSON.stringify(d)});
    else { const m = lsMap(col); m[id] = d; lsSave(col, m); }
    return {...d, id};
  },
  async putMany(col, objs){
    const corpo = {}; objs.forEach(o => corpo[o.id] = semId(o));
    if(this.cloud) await http(`${CFG}/${col}.json`, {method:"PATCH", body:JSON.stringify(corpo)});
    else { const m = lsMap(col); Object.assign(m, corpo); lsSave(col, m); }
  },
  async del(col, id){
    if(this.cloud) await http(`${CFG}/${col}/${id}.json`, {method:"DELETE"});
    else { const m = lsMap(col); delete m[id]; lsSave(col, m); }
  }
};

function renderHeader(ativa){
  $("top").innerHTML = `<h1>🎺 Fanfarra</h1><nav>${PAGINAS.map(p => `<a href="${p[0]}" class="${p[2]===ativa?"on":""}">${p[1]}</a>`).join("")}</nav>
  <div class="status">${DB.cloud ? "🟢 Firebase conectado — dados compartilhados" : "⚠️ Modo local — dados salvos só neste aparelho (configure o firebase-config.js)"}</div>`;
}

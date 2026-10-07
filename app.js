let alunos=JSON.parse(localStorage.getItem("fanfarra_alunos"))||[];
let instrumentos=JSON.parse(localStorage.getItem("fanfarra_instrumentos"))||[];
let chamadas=JSON.parse(localStorage.getItem("fanfarra_chamadas"))||[];
let filtroAtual="todos";

function salvarDados(){
localStorage.setItem("fanfarra_alunos",JSON.stringify(alunos));
localStorage.setItem("fanfarra_instrumentos",JSON.stringify(instrumentos));
localStorage.setItem("fanfarra_chamadas",JSON.stringify(chamadas));
}
function gerarId(){return Date.now().toString()+Math.floor(Math.random()*1000)}
function dataHoje(){
const d=new Date(),m=String(d.getMonth()+1).padStart(2,"0"),dia=String(d.getDate()).padStart(2,"0");
return `${d.getFullYear()}-${m}-${dia}`;
}
function escapar(texto){
return String(texto??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

function carregarSelectInstrumentos(){
const select=document.getElementById("instrumentoAluno"); if(!select)return;
select.innerHTML='<option value="">Selecione</option>';
["Caixa","Bumbo","Surdo","Prato","Lira","Corneta"].forEach(tipo=>{
const op=document.createElement("option");op.value=tipo;op.textContent=tipo;select.appendChild(op);
});
}

function abrirModalAluno(){
carregarSelectInstrumentos();
["alunoId","nomeAluno","turmaAluno","numeroInstrumento"].forEach(id=>document.getElementById(id).value="");
document.getElementById("instrumentoAluno").value="";
new bootstrap.Modal(document.getElementById("modalAluno")).show();
}

function salvarAluno(){
const nome=document.getElementById("nomeAluno").value.trim();
const turma=document.getElementById("turmaAluno").value.trim();
const instrumento=document.getElementById("instrumentoAluno").value;
const numero=document.getElementById("numeroInstrumento").value.trim();
if(!nome||!turma){alert("Preencha o nome e a turma do aluno.");return}
if(instrumento&&!numero){alert("Informe o número do instrumento.");return}
if(instrumento&&instrumentos.length){
const inst=instrumentos.find(i=>i.tipo===instrumento&&String(i.numero)===String(numero));
if(inst&&inst.emUso){alert("Esse instrumento já está em uso.");return}
}
const id=document.getElementById("alunoId").value;
if(id){
const aluno=alunos.find(a=>a.id==id);
if(aluno){liberarInstrumentoDoAluno(aluno);aluno.nome=nome;aluno.turma=turma;aluno.instrumento=instrumento;aluno.numeroInstrumento=numero;vincularInstrumento(aluno);}
}else{
const aluno={id:gerarId(),nome,turma,instrumento,numeroInstrumento:numero};
alunos.push(aluno);vincularInstrumento(aluno);
}
salvarDados();
bootstrap.Modal.getInstance(document.getElementById("modalAluno")).hide();
carregarAlunos();
alert("Aluno salvo com sucesso!");
}

function vincularInstrumento(aluno){
if(!aluno.instrumento||!aluno.numeroInstrumento)return;
const inst=instrumentos.find(i=>i.tipo===aluno.instrumento&&String(i.numero)===String(aluno.numeroInstrumento));
if(inst){inst.emUso=true;inst.alunoId=aluno.id;}
}
function liberarInstrumentoDoAluno(aluno){
instrumentos.forEach(i=>{if(i.alunoId===aluno.id){i.emUso=false;i.alunoId=null;}});
}

function carregarAlunos(){
const tabela=document.getElementById("listaAlunos");if(!tabela)return;
tabela.innerHTML="";
if(!alunos.length){tabela.innerHTML='<tr><td colspan="5" class="text-center text-muted py-4">Nenhum aluno cadastrado.</td></tr>';return}
alunos.forEach(a=>{
const tr=document.createElement("tr");
tr.innerHTML=`<td><strong>${escapar(a.nome)}</strong></td><td>${escapar(a.turma)}</td><td>${escapar(a.instrumento||"Não definido")}</td><td>${escapar(a.numeroInstrumento||"-")}</td><td><button class="btn btn-sm btn-outline-danger" onclick="excluirAluno('${a.id}')">🗑️ Excluir</button></td>`;
tabela.appendChild(tr);
});
}
function excluirAluno(id){
const aluno=alunos.find(a=>a.id==id);if(!aluno)return;
if(!confirm(`Deseja excluir ${aluno.nome}?`))return;
liberarInstrumentoDoAluno(aluno);
alunos=alunos.filter(a=>a.id!=id);salvarDados();carregarAlunos();
}

function abrirModalInstrumento(){
document.getElementById("tipoInstrumento").value="Caixa";
document.getElementById("numeroNovoInstrumento").value="";
document.getElementById("condicaoInstrumento").value="bom";
new bootstrap.Modal(document.getElementById("modalInstrumento")).show();
}
function salvarInstrumento(){
const tipo=document.getElementById("tipoInstrumento").value;
const numero=document.getElementById("numeroNovoInstrumento").value.trim();
const condicao=document.getElementById("condicaoInstrumento").value;
if(!numero){alert("Informe o número do instrumento.");return}
if(instrumentos.some(i=>i.tipo===tipo&&String(i.numero)===String(numero))){alert("Esse instrumento já está cadastrado.");return}
instrumentos.push({id:gerarId(),tipo,numero,condicao,emUso:false,alunoId:null});
salvarDados();bootstrap.Modal.getInstance(document.getElementById("modalInstrumento")).hide();carregarInstrumentos();alert("Instrumento cadastrado!");
}

function carregarInstrumentos(){
const container=document.getElementById("listaInstrumentos");if(!container)return;
container.innerHTML="";
let lista=instrumentos;
if(filtroAtual==="livre")lista=instrumentos.filter(i=>!i.emUso);
if(filtroAtual==="uso")lista=instrumentos.filter(i=>i.emUso);
if(filtroAtual==="defeito")lista=instrumentos.filter(i=>i.condicao==="defeito");
if(!lista.length){container.innerHTML='<div class="col-12"><div class="alert alert-secondary">Nenhum instrumento encontrado.</div></div>';return}
lista.forEach(i=>{
const aluno=alunos.find(a=>a.id===i.alunoId);
const cc=i.condicao==="bom"?"status-bom":"status-defeito";
const ct=i.condicao==="bom"?"🟢 Bom":"🔴 Com defeito";
const uc=i.emUso?"status-uso":"status-livre";
const ut=i.emUso?"🔵 Em uso":"🟢 Livre";
const div=document.createElement("div");div.className="col-md-6 col-lg-4";
div.innerHTML=`<div class="instrumento-card"><div class="instrumento-titulo"><h4>🥁 ${escapar(i.tipo)} Nº ${escapar(i.numero)}</h4></div><div class="mb-3"><span class="status ${cc}">${ct}</span><span class="status ${uc}">${ut}</span></div>${aluno?`<div class="alert alert-info"><strong>Aluno:</strong> ${escapar(aluno.nome)}<br><strong>Turma:</strong> ${escapar(aluno.turma)}</div>`:`<div class="alert alert-light">Nenhum aluno utilizando.</div>`}<div class="d-flex gap-2 flex-wrap"><button class="btn btn-sm btn-outline-secondary" onclick="alternarCondicao('${i.id}')">Alterar condição</button>${i.emUso?`<button class="btn btn-sm btn-outline-danger" onclick="liberarInstrumento('${i.id}')">Liberar</button>`:""}<button class="btn btn-sm btn-outline-danger" onclick="excluirInstrumento('${i.id}')">Excluir</button></div></div>`;
container.appendChild(div);
});
}
function filtrarInstrumentos(filtro){filtroAtual=filtro;carregarInstrumentos()}
function alternarCondicao(id){
const i=instrumentos.find(x=>x.id==id);if(!i)return;
i.condicao=i.condicao==="bom"?"defeito":"bom";salvarDados();carregarInstrumentos();
}
function liberarInstrumento(id){
const i=instrumentos.find(x=>x.id==id);if(!i)return;
const aluno=alunos.find(a=>a.id===i.alunoId);
if(aluno){aluno.instrumento="";aluno.numeroInstrumento=""}
i.emUso=false;i.alunoId=null;salvarDados();carregarInstrumentos();
}
function excluirInstrumento(id){
const i=instrumentos.find(x=>x.id==id);if(!i)return;
if(i.emUso){alert("Não é possível excluir um instrumento em uso.");return}
if(!confirm(`Excluir ${i.tipo} nº ${i.numero}?`))return;
instrumentos=instrumentos.filter(x=>x.id!=id);salvarDados();carregarInstrumentos();
}

function carregarChamada(){
const tabela=document.getElementById("listaChamada");if(!tabela)return;
const data=document.getElementById("dataChamada").value;
document.getElementById("totalAlunos").textContent=alunos.length;tabela.innerHTML="";
if(!alunos.length){tabela.innerHTML='<tr><td colspan="6" class="text-center text-muted py-5">Nenhum aluno cadastrado.<br><br>Vá até a página <strong>Alunos</strong> para cadastrar.</td></tr>';atualizarResumo();return}
alunos.forEach(a=>{
const c=chamadas.find(x=>x.data===data&&x.alunoId===a.id);
const presente=c?c.presente:false;
const tr=document.createElement("tr");
tr.innerHTML=`<td><strong>${escapar(a.nome)}</strong></td><td>${escapar(a.turma)}</td><td>${escapar(a.instrumento||"-")}</td><td>${escapar(a.numeroInstrumento||"-")}</td><td><button class="btn ${presente?"btn-success":"btn-outline-danger"} btn-sm presenca-btn" onclick="alternarPresenca('${a.id}')">${presente?"🟢 Presente":"🔴 Falta"}</button></td><td><input class="form-control form-control-sm" id="obs-${a.id}" value="${escapar(c?c.observacao:"")}" placeholder="Ex.: atrasado"></td>`;
tabela.appendChild(tr);
});
atualizarResumo();
}
function alternarPresenca(alunoId){
const data=document.getElementById("dataChamada").value;
let c=chamadas.find(x=>x.data===data&&x.alunoId===alunoId);
if(!c){c={data,alunoId,presente:true,observacao:""};chamadas.push(c)}else c.presente=!c.presente;
salvarDados();carregarChamada();
}
function atualizarResumo(){
const data=document.getElementById("dataChamada")?.value;
const total=alunos.length;
const presentes=alunos.filter(a=>{const c=chamadas.find(x=>x.data===data&&x.alunoId===a.id);return c&&c.presente}).length;
document.getElementById("totalPresentes").textContent=presentes;
document.getElementById("totalFaltas").textContent=total-presentes;
}
function salvarChamada(){
const data=document.getElementById("dataChamada").value;
if(!data){alert("Selecione a data.");return}
alunos.forEach(a=>{
let c=chamadas.find(x=>x.data===data&&x.alunoId===a.id);
if(!c){c={data,alunoId:a.id,presente:false,observacao:""};chamadas.push(c)}
const obs=document.getElementById(`obs-${a.id}`);
if(obs)c.observacao=obs.value.trim();
});
salvarDados();carregarChamada();alert("Chamada salva com sucesso!");
}

document.addEventListener("DOMContentLoaded",()=>{
const data=document.getElementById("dataChamada");
if(data){if(!data.value)data.value=dataHoje();data.addEventListener("change",carregarChamada);carregarChamada()}
carregarAlunos();
carregarInstrumentos();
});

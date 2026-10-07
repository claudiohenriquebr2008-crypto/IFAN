const db = firebase.database();

let S = {
    alunos: {},
    instrumentos: {},
    chamadas: {},
    avisos: {},
    eventos: {},
    problemas: {}
};

let filtroInstrumentos = "todos";

/* =========================
   FIREBASE
========================= */

firebase.auth().signInAnonymously()
    .catch(error => {
        console.error("Erro no login:", error);
        mostrarConfig();
    });

const caminhos = [
    "alunos",
    "instrumentos",
    "chamadas",
    "avisos",
    "eventos",
    "problemas"
];

caminhos.forEach(caminho => {
    db.ref(caminho).on("value", snapshot => {
        S[caminho] = snapshot.val() || {};

        renderizar();

        if (caminho === "problemas") {
            atualizarBadgeProblemas();
        }
    });
});


/* =========================
   INICIALIZAÇÃO
========================= */

document.addEventListener("DOMContentLoaded", () => {

    const data = document.getElementById("data");

    if (data) {
        const hoje = new Date();

        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, "0");
        const dia = String(hoje.getDate()).padStart(2, "0");

        data.value = `${ano}-${mes}-${dia}`;
    }

    renderizar();
});


/* =========================
   RENDERIZAÇÃO GERAL
========================= */

function renderizar() {
    renderizarAlunos();
    renderizarInstrumentos();
    renderizarChamada();
    renderizarAvisos();
    renderizarEventos();
    renderizarProblemas();
}


/* =========================
   ALUNOS
========================= */

function renderizarAlunos() {

    const lista = document.getElementById("alunos");

    if (!lista) return;

    lista.innerHTML = "";

    const alunos = Object.entries(S.alunos);

    if (alunos.length === 0) {
        lista.innerHTML = `
            <div class="alert alert-secondary">
                Nenhum aluno cadastrado.
            </div>
        `;
        return;
    }

    alunos.forEach(([id, aluno]) => {

        const instrumento = S.instrumentos[aluno.instrumento];

        lista.innerHTML += `
            <div class="card mb-3">
                <div class="card-body">

                    <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">

                        <div>
                            <h5 class="mb-1">${esc(aluno.nome)}</h5>

                            <div>
                                <strong>Turma:</strong>
                                ${esc(aluno.turma)}
                            </div>

                            <div>
                                <strong>Instrumento:</strong>
                                ${
                                    instrumento
                                    ? `${esc(instrumento.tipo)} nº ${esc(instrumento.numero)}`
                                    : "Sem instrumento"
                                }
                            </div>
                        </div>

                        <div class="d-flex gap-2 flex-wrap">

                            <button
                                class="btn btn-primary btn-sm"
                                onclick="trocarInstrumento('${id}')">
                                Trocar instrumento
                            </button>

                            <button
                                class="btn btn-danger btn-sm"
                                onclick="excluirAluno('${id}')">
                                Excluir
                            </button>

                        </div>

                    </div>

                </div>
            </div>
        `;
    });
}


/* =========================
   CADASTRAR ALUNO
========================= */

document.getElementById("fAluno")?.addEventListener("submit", async e => {

    e.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const turma = document.getElementById("turma").value.trim();
    const instrumentoId = document.getElementById("instAluno").value;

    if (!nome || !turma) {
        alert("Preencha nome e turma.");
        return;
    }

    const id = novoId();

    const atualizacoes = {};

    atualizacoes[`alunos/${id}`] = {
        nome,
        turma,
        instrumento: instrumentoId || null
    };

    if (instrumentoId) {
        atualizacoes[`instrumentos/${instrumentoId}/alunoId`] = id;
    }

    try {

        await db.ref().update(atualizacoes);

        e.target.reset();

        mostrarToast("Aluno cadastrado!");

    } catch (erro) {

        console.error(erro);
        alert("Não foi possível cadastrar o aluno.");

    }
});


/* =========================
   EXCLUIR ALUNO
========================= */

async function excluirAluno(id) {

    const aluno = S.alunos[id];

    if (!aluno) return;

    const confirmar = confirm(
        `Excluir o aluno "${aluno.nome}"?`
    );

    if (!confirmar) return;

    const atualizacoes = {};

    atualizacoes[`alunos/${id}`] = null;

    if (aluno.instrumento) {
        atualizacoes[
            `instrumentos/${aluno.instrumento}/alunoId`
        ] = null;
    }

    await db.ref().update(atualizacoes);

    mostrarToast("Aluno excluído.");
}


/* =========================
   TROCAR INSTRUMENTO
========================= */

async function trocarInstrumento(alunoId) {

    const aluno = S.alunos[alunoId];

    if (!aluno) return;

    const livres = Object.entries(S.instrumentos)
        .filter(([id, instrumento]) =>
            !instrumento.alunoId &&
            instrumento.condicao !== "defeituoso"
        );

    if (livres.length === 0) {
        alert("Não há instrumentos livres em boas condições.");
        return;
    }

    let mensagem = "Escolha o ID do instrumento:\n\n";

    livres.forEach(([id, instrumento]) => {

        mensagem +=
            `${id} - ${instrumento.tipo} nº ${instrumento.numero}\n`;

    });

    const novoIdInstrumento = prompt(mensagem);

    if (!novoIdInstrumento) return;

    if (!S.instrumentos[novoIdInstrumento]) {
        alert("Instrumento não encontrado.");
        return;
    }

    const instrumento = S.instrumentos[novoIdInstrumento];

    if (instrumento.alunoId) {
        alert("Esse instrumento já está em uso.");
        return;
    }

    const atualizacoes = {};

    if (aluno.instrumento) {
        atualizacoes[
            `instrumentos/${aluno.instrumento}/alunoId`
        ] = null;
    }

    atualizacoes[
        `instrumentos/${novoIdInstrumento}/alunoId`
    ] = alunoId;

    atualizacoes[
        `alunos/${alunoId}/instrumento`
    ] = novoIdInstrumento;

    await db.ref().update(atualizacoes);

    mostrarToast("Instrumento trocado!");
}


/* =========================
   INSTRUMENTOS
========================= */

function renderizarInstrumentos() {

    const lista = document.getElementById("instrumentos");

    if (!lista) return;

    lista.innerHTML = "";

    let instrumentos = Object.entries(S.instrumentos);

    instrumentos = instrumentos.filter(([id, instrumento]) => {

        if (filtroInstrumentos === "livres") {
            return !instrumento.alunoId;
        }

        if (filtroInstrumentos === "uso") {
            return !!instrumento.alunoId;
        }

        if (filtroInstrumentos === "defeituosos") {
            return instrumento.condicao === "defeituoso";
        }

        return true;
    });

    if (instrumentos.length === 0) {

        lista.innerHTML = `
            <div class="col-12">
                <div class="alert alert-secondary">
                    Nenhum instrumento encontrado.
                </div>
            </div>
        `;

        return;
    }

    instrumentos.forEach(([id, instrumento]) => {

        const aluno = instrumento.alunoId
            ? S.alunos[instrumento.alunoId]
            : null;

        const defeituoso =
            instrumento.condicao === "defeituoso";

        lista.innerHTML += `
            <div class="col-md-4 mb-3">

                <div class="card instrument
                    ${defeituoso ? "border-danger" : "border-success"}">

                    <div class="card-body">

                        <h5>
                            ${esc(instrumento.tipo)}
                            nº ${esc(instrumento.numero)}
                        </h5>

                        <p>
                            Condição:
                            <span class="${defeituoso ? "bad" : "ok"}">
                                ${defeituoso ? "Defeituoso" : "Bom"}
                            </span>
                        </p>

                        <p>
                            ${
                                aluno
                                ? `<span class="using">
                                    Em uso: ${esc(aluno.nome)}
                                   </span>`
                                : `<span class="free">
                                    Livre
                                   </span>`
                            }
                        </p>

                        <div class="d-flex gap-2 flex-wrap">

                            <button
                                class="btn btn-sm ${defeituoso ? "btn-success" : "btn-warning"}"
                                onclick="alternarCondicao('${id}')">

                                ${
                                    defeituoso
                                    ? "Marcar como bom"
                                    : "Marcar defeituoso"
                                }

                            </button>

                            <button
                                class="btn btn-danger btn-sm"
                                onclick="excluirInstrumento('${id}')"
                                ${aluno ? "disabled" : ""}>

                                Excluir

                            </button>

                        </div>

                    </div>

                </div>

            </div>
        `;
    });
}


/* =========================
   CADASTRAR INSTRUMENTO
========================= */

document.getElementById("fInst")?.addEventListener("submit", async e => {

    e.preventDefault();

    const tipo = document.getElementById("tipo").value;
    const numero = document.getElementById("numero").value.trim();
    const condicao = document.getElementById("condicao").value;

    if (!tipo || !numero) {
        alert("Preencha todos os campos.");
        return;
    }

    const repetido = Object.values(S.instrumentos)
        .some(i =>
            i.tipo === tipo &&
            i.numero === numero
        );

    if (repetido) {
        alert("Esse instrumento já está cadastrado.");
        return;
    }

    const id = novoId();

    await db.ref(`instrumentos/${id}`).set({
        tipo,
        numero,
        condicao,
        alunoId: null
    });

    e.target.reset();

    mostrarToast("Instrumento cadastrado!");
});


/* =========================
   FILTROS
========================= */

document.querySelectorAll("[data-f]").forEach(botao => {

    botao.addEventListener("click", () => {

        document
            .querySelectorAll("[data-f]")
            .forEach(b => b.classList.remove("active"));

        botao.classList.add("active");

        filtroInstrumentos = botao.dataset.f;

        renderizarInstrumentos();
    });
});


/* =========================
   ALTERAR CONDIÇÃO
========================= */

async function alternarCondicao(id) {

    const instrumento = S.instrumentos[id];

    if (!instrumento) return;

    const novaCondicao =
        instrumento.condicao === "defeituoso"
            ? "bom"
            : "defeituoso";

    await db.ref(
        `instrumentos/${id}/condicao`
    ).set(novaCondicao);

    mostrarToast("Condição atualizada.");
}


/* =========================
   EXCLUIR INSTRUMENTO
========================= */

async function excluirInstrumento(id) {

    const instrumento = S.instrumentos[id];

    if (!instrumento) return;

    if (instrumento.alunoId) {

        alert(
            "Não é possível excluir um instrumento que está em uso."
        );

        return;
    }

    const confirmar = confirm(
        `Excluir ${instrumento.tipo} nº ${instrumento.numero}?`
    );

    if (!confirmar) return;

    await db.ref(`instrumentos/${id}`).remove();

    mostrarToast("Instrumento excluído.");
}


/* =========================
   CHAMADA
========================= */

function renderizarChamada() {

    const tabela = document.getElementById("tabela");

    if (!tabela) return;

    const data =
        document.getElementById("data")?.value;

    if (!data) return;

    const alunos = Object.entries(S.alunos);

    tabela.innerHTML = "";

    let presentes = 0;
    let faltas = 0;

    alunos.forEach(([id, aluno]) => {

        const chamada =
            S.chamadas[data]?.[id] || {};

        const instrumento =
            S.instrumentos[aluno.instrumento];

        if (chamada.p === true) presentes++;

        if (chamada.p === false) faltas++;

        tabela.innerHTML += `
            <tr>

                <td>${esc(aluno.nome)}</td>

                <td>${esc(aluno.turma)}</td>

                <td>
                    ${
                        instrumento
                        ? `${esc(instrumento.tipo)} nº ${esc(instrumento.numero)}`
                        : "—"
                    }
                </td>

                <td>
                    ${
                        instrumento
                        ? esc(instrumento.numero)
                        : "—"
                    }
                </td>

                <td>

                    <div class="d-flex gap-1 flex-wrap">

                        <button
                            class="btn btn-sm ${
                                chamada.p === true
                                ? "btn-success"
                                : "btn-outline-success"
                            }"
                            onclick="marcarPresenca('${data}','${id}',true)">

                            Presente

                        </button>

                        <button
                            class="btn btn-sm ${
                                chamada.p === false
                                ? "btn-danger"
                                : "btn-outline-danger"
                            }"
                            onclick="marcarPresenca('${data}','${id}',false)">

                            Faltou

                        </button>

                        <button
                            class="btn btn-sm btn-outline-secondary"
                            onclick="limparPresenca('${data}','${id}')">

                            Limpar

                        </button>

                    </div>

                </td>

                <td>
                    <input
                        class="form-control form-control-sm"
                        value="${esc(chamada.o || "")}"
                        placeholder="Observação"
                        onchange="salvarObservacao('${data}','${id}',this.value)">
                </td>

            </tr>
        `;
    });

    const total = alunos.length;

    document.getElementById("total").textContent = total;
    document.getElementById("presentes").textContent = presentes;
    document.getElementById("faltas").textContent = faltas;
}


/* =========================
   MUDAR DATA DA CHAMADA
========================= */

document.getElementById("data")?.addEventListener("change", () => {
    renderizarChamada();
});


/* =========================
   MARCAR PRESENÇA
========================= */

async function marcarPresenca(data, alunoId, presente) {

    const atual =
        S.chamadas[data]?.[alunoId]?.p;

    /*
       Se clicar novamente no mesmo botão,
       a presença é desmarcada.
    */

    if (atual === presente) {

        await db.ref(
            `chamadas/${data}/${alunoId}/p`
        ).remove();

    } else {

        await db.ref(
            `chamadas/${data}/${alunoId}/p`
        ).set(presente);
    }
}


/* =========================
   LIMPAR PRESENÇA
========================= */

async function limparPresenca(data, alunoId) {

    await db.ref(
        `chamadas/${data}/${alunoId}/p`
    ).remove();

}


/* =========================
   OBSERVAÇÃO
========================= */

async function salvarObservacao(data, alunoId, texto) {

    await db.ref(
        `chamadas/${data}/${alunoId}/o`
    ).set(texto);
}


/* =========================
   BOTÃO SALVAR CHAMADA
========================= */

document.getElementById("salvar")?.addEventListener("click", () => {

    mostrarToast(
        "A chamada já foi salva automaticamente."
    );

});


/* =========================
   AVISOS
========================= */

function renderizarAvisos() {

    const lista = document.getElementById("avisos");

    if (!lista) return;

    lista.innerHTML = "";

    const avisos = Object.entries(S.avisos)
        .sort((a, b) =>
            (b[1].criadoEm || 0) -
            (a[1].criadoEm || 0)
        );

    if (avisos.length === 0) {

        lista.innerHTML = `
            <div class="alert alert-secondary">
                Nenhum aviso publicado.
            </div>
        `;

        return;
    }

    avisos.forEach(([id, aviso]) => {

        lista.innerHTML += `
            <div class="notice">

                <small class="text-muted">
                    ${formatarDataHora(aviso.criadoEm)}
                </small>

                <p>${esc(aviso.texto)}</p>

                <button
                    class="btn btn-danger btn-sm"
                    onclick="excluirAviso('${id}')">

                    Excluir

                </button>

            </div>
        `;
    });
}


/* =========================
   PUBLICAR AVISO
========================= */

document.getElementById("fAviso")?.addEventListener("submit", async e => {

    e.preventDefault();

    const texto =
        document.getElementById("aviso").value.trim();

    if (!texto) return;

    await db.ref("avisos").push({
        texto,
        criadoEm: Date.now()
    });

    e.target.reset();

    mostrarToast("Aviso publicado!");
});


/* =========================
   EXCLUIR AVISO
========================= */

async function excluirAviso(id) {

    if (!confirm("Excluir este aviso?")) return;

    await db.ref(`avisos/${id}`).remove();

    mostrarToast("Aviso excluído.");
}


/* =========================
   EVENTOS
========================= */

function renderizarEventos() {

    const lista = document.getElementById("eventos");

    if (!lista) return;

    lista.innerHTML = "";

    const eventos = Object.entries(S.eventos)
        .sort((a, b) =>
            String(a[1].data)
                .localeCompare(String(b[1].data))
        );

    if (eventos.length === 0) {

        lista.innerHTML = `
            <div class="alert alert-secondary">
                Nenhum evento cadastrado.
            </div>
        `;

        return;
    }

    const hoje = new Date().toISOString().slice(0, 10);

    eventos.forEach(([id, evento]) => {

        const passado =
            evento.data < hoje;

        lista.innerHTML += `
            <div class="event">

                <span class="badge ${
                    passado
                    ? "text-bg-secondary"
                    : "text-bg-primary"
                }">

                    ${passado ? "Passado" : "Próximo"}

                </span>

                <h5>${esc(evento.nome)}</h5>

                <p class="mb-1">
                    <strong>Data:</strong>
                    ${formatarData(evento.data)}
                </p>

                <p>
                    <strong>Local:</strong>
                    ${esc(evento.local)}
                </p>

                <button
                    class="btn btn-danger btn-sm"
                    onclick="excluirEvento('${id}')">

                    Excluir

                </button>

            </div>
        `;
    });
}


/* =========================
   CADASTRAR EVENTO
========================= */

document.getElementById("fEvento")?.addEventListener("submit", async e => {

    e.preventDefault();

    const nome =
        document.getElementById("evNome").value.trim();

    const data =
        document.getElementById("evData").value;

    const local =
        document.getElementById("evLocal").value.trim();

    if (!nome || !data || !local) {

        alert("Preencha todos os campos.");

        return;
    }

    await db.ref("eventos").push({
        nome,
        data,
        local,
        criadoEm: Date.now()
    });

    e.target.reset();

    mostrarToast("Evento cadastrado!");
});


/* =========================
   EXCLUIR EVENTO
========================= */

async function excluirEvento(id) {

    if (!confirm("Excluir este evento?")) return;

    await db.ref(`eventos/${id}`).remove();

    mostrarToast("Evento excluído.");
}


/* =========================
   PROBLEMAS
========================= */

function renderizarProblemas() {

    const lista = document.getElementById("problemas");

    if (!lista) return;

    lista.innerHTML = "";

    const problemas = Object.entries(S.problemas)
        .sort((a, b) =>
            (b[1].criadoEm || 0) -
            (a[1].criadoEm || 0)
        );

    if (problemas.length === 0) {

        lista.innerHTML = `
            <div class="alert alert-secondary">
                Nenhum problema registrado.
            </div>
        `;

        return;
    }

    problemas.forEach(([id, problema]) => {

        const instrumento =
            problema.instrumento
            ? S.instrumentos[problema.instrumento]
            : null;

        const aberto =
            problema.status !== "resolvido";

        lista.innerHTML += `
            <div class="problem ${
                aberto ? "open" : "done"
            }">

                <span class="badge ${
                    aberto
                    ? "text-bg-danger"
                    : "text-bg-success"
                }">

                    ${
                        aberto
                        ? "Aberto"
                        : "Resolvido"
                    }

                </span>

                <p>
                    ${esc(problema.descricao)}
                </p>

                ${
                    instrumento
                    ? `
                        <p>
                            <strong>Instrumento:</strong>
                            ${esc(instrumento.tipo)}
                            nº ${esc(instrumento.numero)}
                        </p>
                    `
                    : ""
                }

                <div class="d-flex gap-2 flex-wrap">

                    <button
                        class="btn btn-sm ${
                            aberto
                            ? "btn-success"
                            : "btn-warning"
                        }"
                        onclick="alternarProblema('${id}')">

                        ${
                            aberto
                            ? "Marcar como resolvido"
                            : "Reabrir"
                        }

                    </button>

                    <button
                        class="btn btn-danger btn-sm"
                        onclick="excluirProblema('${id}')">

                        Excluir

                    </button>

                </div>

            </div>
        `;
    });
}


/* =========================
   CADASTRAR PROBLEMA
========================= */

document.getElementById("fProblema")?.addEventListener("submit", async e => {

    e.preventDefault();

    const descricao =
        document.getElementById("descricao").value.trim();

    const instrumento =
        document.getElementById("instProblema").value;

    if (!descricao) {

        alert("Digite a descrição do problema.");

        return;
    }

    const problemaId = novoId();

    const atualizacoes = {};

    atualizacoes[`problemas/${problemaId}`] = {
        descricao,
        instrumento: instrumento || null,
        status: "aberto",
        criadoEm: Date.now()
    };

    if (instrumento) {

        atualizacoes[
            `instrumentos/${instrumento}/condicao`
        ] = "defeituoso";
    }

    await db.ref().update(atualizacoes);

    e.target.reset();

    mostrarToast("Problema registrado!");
});


/* =========================
   ALTERAR PROBLEMA
========================= */

async function alternarProblema(id) {

    const problema = S.problemas[id];

    if (!problema) return;

    const novoStatus =
        problema.status === "resolvido"
            ? "aberto"
            : "resolvido";

    await db.ref(
        `problemas/${id}/status`
    ).set(novoStatus);

    mostrarToast(
        novoStatus === "resolvido"
        ? "Problema resolvido."
        : "Problema reaberto."
    );
}


/* =========================
   EXCLUIR PROBLEMA
========================= */

async function excluirProblema(id) {

    if (!confirm("Excluir este problema?")) return;

    await db.ref(`problemas/${id}`).remove();

    mostrarToast("Problema excluído.");
}


/* =========================
   BADGE DOS PROBLEMAS
========================= */

function atualizarBadgeProblemas() {

    const badge =
        document.getElementById("badgeProblemas");

    if (!badge) return;

    const abertos =
        Object.values(S.problemas)
            .filter(p => p.status !== "resolvido")
            .length;

    badge.textContent = abertos;

    badge.style.display =
        abertos > 0
        ? "inline-block"
        : "none";
}


/* =========================
   PREENCHER SELECTS
========================= */

function atualizarSelectInstrumentos() {

    const selectAluno =
        document.getElementById("instAluno");

    const selectProblema =
        document.getElementById("instProblema");

    if (selectAluno) {

        const valorAtual = selectAluno.value;

        selectAluno.innerHTML =
            `<option value="">Sem instrumento</option>`;

        Object.entries(S.instrumentos)
            .filter(([id, instrumento]) =>
                !instrumento.alunoId &&
                instrumento.condicao !== "defeituoso"
            )
            .forEach(([id, instrumento]) => {

                selectAluno.innerHTML += `
                    <option value="${id}">
                        ${esc(instrumento.tipo)}
                        nº ${esc(instrumento.numero)}
                    </option>
                `;
            });

        selectAluno.value = valorAtual;
    }

    if (selectProblema) {

        const valorAtual = selectProblema.value;

        selectProblema.innerHTML =
            `<option value="">Nenhum instrumento</option>`;

        Object.entries(S.instrumentos)
            .forEach(([id, instrumento]) => {

                selectProblema.innerHTML += `
                    <option value="${id}">
                        ${esc(instrumento.tipo)}
                        nº ${esc(instrumento.numero)}
                    </option>
                `;
            });

        selectProblema.value = valorAtual;
    }
}


/* =========================
   ATUALIZAÇÃO AUTOMÁTICA DOS SELECTS
========================= */

const renderizarOriginal = renderizar;

renderizar = function () {

    renderizarAlunos();
    renderizarInstrumentos();
    renderizarChamada();
    renderizarAvisos();
    renderizarEventos();
    renderizarProblemas();

    atualizarSelectInstrumentos();
    atualizarBadgeProblemas();
};


/* =========================
   TOAST
========================= */

function mostrarToast(mensagem) {

    const area =
        document.getElementById("toasts");

    if (!area) return;

    const toast = document.createElement("div");

    toast.className =
        "toast align-items-center text-bg-dark border-0 show mb-2";

    toast.setAttribute("role", "alert");

    toast.innerHTML = `
        <div class="d-flex">

            <div class="toast-body">
                ${esc(mensagem)}
            </div>

            <button
                type="button"
                class="btn-close btn-close-white me-2 m-auto"
                onclick="this.closest('.toast').remove()">
            </button>

        </div>
    `;

    area.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4000);
}


/* =========================
   NOTIFICAÇÕES DE NOVOS AVISOS
========================= */

db.ref("avisos").on("child_added", snapshot => {

    const aviso = snapshot.val();

    if (!aviso) return;

    mostrarToast("📢 Novo aviso publicado!");
});


/* =========================
   NOTIFICAÇÕES DE EVENTOS
========================= */

db.ref("eventos").on("child_added", snapshot => {

    const evento = snapshot.val();

    if (!evento) return;

    mostrarToast("📅 Novo evento cadastrado!");
});


/* =========================
   CONFIGURAÇÃO FIREBASE
========================= */

function mostrarConfig() {

    const config =
        document.getElementById("config");

    if (config) {
        config.style.display = "block";
    }
}


/* =========================
   FUNÇÕES AUXILIARES
========================= */

function novoId() {

    return Date.now().toString(36) +
        Math.random()
            .toString(36)
            .substring(2, 8);
}


function esc(valor) {

    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatarData(data) {

    if (!data) return "";

    const partes = data.split("-");

    if (partes.length !== 3) return data;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}


function formatarDataHora(timestamp) {

    if (!timestamp) return "";

    const data = new Date(timestamp);

    return data.toLocaleString("pt-BR");
}let alunos=JSON.parse(localStorage.getItem("fanfarra_alunos"))||[];
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

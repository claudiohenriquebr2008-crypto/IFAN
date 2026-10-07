// ======================================================
// 🎺 SISTEMA DE GERENCIAMENTO DA FANFARRA
// app.js
// ======================================================


// ======================================================
// BANCO DE DADOS
// ======================================================

const db = firebase.database();


// Dados carregados do Firebase
const S = {
    alunos: {},
    instrumentos: {},
    chamadas: {},
    avisos: {},
    eventos: {},
    problemas: {}
};


// ======================================================
// FUNÇÕES GERAIS
// ======================================================

// Gera um ID simples
function novoId() {
    return Date.now().toString(36) + Math.random()
        .toString(36)
        .substring(2, 8);
}


// Escapa HTML para evitar problemas ao mostrar textos
function escapar(texto) {

    if (texto === undefined || texto === null) {
        return "";
    }

    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// Data atual no formato YYYY-MM-DD
function dataHoje() {

    const d = new Date();

    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}


// Converte YYYY-MM-DD para DD/MM/YYYY
function formatarData(data) {

    if (!data) {
        return "";
    }

    const partes = data.split("-");

    if (partes.length !== 3) {
        return data;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}


// Mostra uma mensagem no canto da tela
function toast(mensagem, tipo = "success") {

    const container = document.getElementById("toasts");

    if (!container) {
        return;
    }

    const id = novoId();

    const cores = {
        success: "bg-success",
        danger: "bg-danger",
        warning: "bg-warning text-dark",
        info: "bg-primary"
    };

    const cor = cores[tipo] || cores.info;

    container.insertAdjacentHTML(
        "beforeend",
        `
        <div
            id="${id}"
            class="toast align-items-center text-white ${cor} border-0"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
        >
            <div class="d-flex">

                <div class="toast-body">
                    ${escapar(mensagem)}
                </div>

                <button
                    type="button"
                    class="btn-close btn-close-white me-2 m-auto"
                    data-bs-dismiss="toast"
                ></button>

            </div>
        </div>
        `
    );

    const elemento = document.getElementById(id);

    const t = new bootstrap.Toast(elemento, {
        delay: 3500
    });

    t.show();

    elemento.addEventListener("hidden.bs.toast", () => {
        elemento.remove();
    });
}


// ======================================================
// FIREBASE
// ======================================================

firebase.auth()
    .signInAnonymously()
    .catch((erro) => {

        console.error("Erro ao entrar no Firebase:", erro);

        toast(
            "Não foi possível conectar ao banco de dados.",
            "danger"
        );
    });


// ======================================================
// CARREGAR DADOS EM TEMPO REAL
// ======================================================

db.ref("alunos").on("value", snapshot => {

    S.alunos = snapshot.val() || {};

    renderizar();

});


db.ref("instrumentos").on("value", snapshot => {

    S.instrumentos = snapshot.val() || {};

    renderizar();

});


db.ref("chamadas").on("value", snapshot => {

    S.chamadas = snapshot.val() || {};

    renderizar();

});


db.ref("avisos").on("value", snapshot => {

    S.avisos = snapshot.val() || {};

    renderizar();

});


db.ref("eventos").on("value", snapshot => {

    S.eventos = snapshot.val() || {};

    renderizar();

});


db.ref("problemas").on("value", snapshot => {

    S.problemas = snapshot.val() || {};

    renderizar();

});


// ======================================================
// AVISOS DE NOVOS REGISTROS
// ======================================================

let sistemaCarregado = false;


db.ref("avisos").on("child_added", snapshot => {

    if (sistemaCarregado) {

        const aviso = snapshot.val();

        toast(
            "📢 Novo aviso publicado!",
            "info"
        );
    }

});


db.ref("eventos").on("child_added", snapshot => {

    if (sistemaCarregado) {

        toast(
            "📅 Novo evento cadastrado!",
            "info"
        );
    }

});


setTimeout(() => {

    sistemaCarregado = true;

}, 2000);


// ======================================================
// RENDERIZAÇÃO GERAL
// ======================================================

function renderizar() {

    renderizarAlunos();

    renderizarInstrumentos();

    renderizarChamada();

    renderizarAvisos();

    renderizarEventos();

    renderizarProblemas();

    atualizarBadgeProblemas();

    atualizarSelects();

}


// ======================================================
// ALUNOS
// ======================================================

const formAluno = document.getElementById("fAluno");

if (formAluno) {

    formAluno.addEventListener("submit", async function (e) {

        e.preventDefault();

        const nome = document.getElementById("nome").value.trim();
        const turma = document.getElementById("turma").value.trim();
        const instrumento = document.getElementById("instAluno").value;

        if (!nome || !turma) {

            toast(
                "Preencha o nome e a turma.",
                "warning"
            );

            return;
        }


        const alunoId = novoId();


        const atualizacoes = {};

        atualizacoes[`alunos/${alunoId}`] = {

            nome: nome,
            turma: turma,
            instrumentoId: instrumento || ""

        };


        // Se escolher instrumento,
        // verifica se ainda está livre.

        if (instrumento) {

            const inst = S.instrumentos[instrumento];

            if (!inst) {

                toast(
                    "Instrumento não encontrado.",
                    "danger"
                );

                return;
            }


            if (inst.alunoId) {

                toast(
                    "Esse instrumento já está em uso.",
                    "danger"
                );

                return;
            }


            atualizacoes[
                `instrumentos/${instrumento}/alunoId`
            ] = alunoId;
        }


        try {

            await db.ref().update(atualizacoes);

            formAluno.reset();

            toast(
                "Aluno cadastrado com sucesso!",
                "success"
            );

        } catch (erro) {

            console.error(erro);

            toast(
                "Erro ao cadastrar aluno.",
                "danger"
            );
        }

    });

}


// ======================================================
// MOSTRAR ALUNOS
// ======================================================

function renderizarAlunos() {

    const lista = document.getElementById("alunos");

    if (!lista) {
        return;
    }


    const alunos = Object.entries(S.alunos);


    if (alunos.length === 0) {

        lista.innerHTML = `
            <div class="text-center text-muted py-4">
                Nenhum aluno cadastrado.
            </div>
        `;

        return;
    }


    alunos.sort((a, b) =>
        String(a[1].nome || "")
            .localeCompare(String(b[1].nome || ""))
    );


    lista.innerHTML = alunos.map(([id, aluno]) => {

        const instrumento =
            S.instrumentos[aluno.instrumentoId];


        const nomeInstrumento = instrumento
            ? `${instrumento.tipo} ${instrumento.numero}`
            : "Sem instrumento";


        return `
            <div class="card mb-3 p-3">

                <div class="row align-items-center">

                    <div class="col-md-4">

                        <strong>
                            ${escapar(aluno.nome)}
                        </strong>

                    </div>


                    <div class="col-md-2">
                        <span class="text-muted">
                            Turma:
                        </span>

                        ${escapar(aluno.turma)}
                    </div>


                    <div class="col-md-3">

                        <span class="text-muted">
                            Instrumento:
                        </span>

                        ${escapar(nomeInstrumento)}

                    </div>


                    <div class="col-md-3 mt-2 mt-md-0">

                        <button
                            class="btn btn-sm btn-primary"
                            onclick="trocarInstrumento('${id}')"
                        >
                            🔄 Trocar
                        </button>

                        <button
                            class="btn btn-sm btn-danger"
                            onclick="excluirAluno('${id}')"
                        >
                            🗑️ Excluir
                        </button>

                    </div>

                </div>

            </div>
        `;

    }).join("");

}


// ======================================================
// TROCAR INSTRUMENTO
// ======================================================

async function trocarInstrumento(alunoId) {

    const aluno = S.alunos[alunoId];

    if (!aluno) {
        return;
    }


    const livres = Object.entries(S.instrumentos)
        .filter(([id, instrumento]) =>
            !instrumento.alunoId &&
            instrumento.condicao !== "defeituoso"
        );


    if (livres.length === 0) {

        toast(
            "Não existem instrumentos livres.",
            "warning"
        );

        return;
    }


    let mensagem =
        "Digite o número do instrumento desejado:\n\n";


    livres.forEach(([id, instrumento], indice) => {

        mensagem +=
            `${indice + 1} - ${instrumento.tipo} ${instrumento.numero}\n`;

    });


    const resposta = prompt(mensagem);


    if (resposta === null) {
        return;
    }


    const indice = Number(resposta) - 1;


    if (
        Number.isNaN(indice) ||
        !livres[indice]
    ) {

        toast(
            "Opção inválida.",
            "warning"
        );

        return;
    }


    const novoInstrumentoId =
        livres[indice][0];


    const antigoInstrumentoId =
        aluno.instrumentoId;


    const atualizacoes = {};


    if (antigoInstrumentoId) {

        atualizacoes[
            `instrumentos/${antigoInstrumentoId}/alunoId`
        ] = null;

    }


    atualizacoes[
        `instrumentos/${novoInstrumentoId}/alunoId`
    ] = alunoId;


    atualizacoes[
        `alunos/${alunoId}/instrumentoId`
    ] = novoInstrumentoId;


    await db.ref().update(atualizacoes);


    toast(
        "Instrumento alterado!",
        "success"
    );
}


// ======================================================
// EXCLUIR ALUNO
// ======================================================

async function excluirAluno(alunoId) {

    const aluno = S.alunos[alunoId];

    if (!aluno) {
        return;
    }


    const confirmar = confirm(
        `Deseja realmente excluir o aluno "${aluno.nome}"?`
    );


    if (!confirmar) {
        return;
    }


    const atualizacoes = {};


    if (aluno.instrumentoId) {

        atualizacoes[
            `instrumentos/${aluno.instrumentoId}/alunoId`
        ] = null;

    }


    atualizacoes[
        `alunos/${alunoId}`
    ] = null;


    await db.ref().update(atualizacoes);


    toast(
        "Aluno excluído.",
        "success"
    );
}


// ======================================================
// INSTRUMENTOS
// ======================================================

const formInstrumento =
    document.getElementById("fInst");


if (formInstrumento) {

    formInstrumento.addEventListener(
        "submit",
        async function (e) {

            e.preventDefault();


            const tipo =
                document.getElementById("tipo").value;


            const numero =
                document.getElementById("numero").value.trim();


            const condicao =
                document.getElementById("condicao").value;


            if (!tipo || !numero) {

                toast(
                    "Preencha todos os campos.",
                    "warning"
                );

                return;
            }


            const existe =
                Object.values(S.instrumentos)
                    .some(inst =>
                        inst.tipo === tipo &&
                        String(inst.numero) === String(numero)
                    );


            if (existe) {

                toast(
                    "Esse instrumento já está cadastrado.",
                    "danger"
                );

                return;
            }


            const id = novoId();


            try {

                await db.ref(
                    `instrumentos/${id}`
                ).set({

                    tipo: tipo,
                    numero: numero,
                    condicao: condicao,
                    alunoId: ""

                });


                formInstrumento.reset();


                toast(
                    "Instrumento cadastrado!",
                    "success"
                );

            } catch (erro) {

                console.error(erro);

                toast(
                    "Erro ao cadastrar instrumento.",
                    "danger"
                );
            }

        }
    );

}


// ======================================================
// FILTRO DE INSTRUMENTOS
// ======================================================

let filtroInstrumentos = "todos";


document.querySelectorAll(
    "[data-f]"
).forEach(botao => {

    botao.addEventListener(
        "click",
        function () {

            document.querySelectorAll(
                "[data-f]"
            ).forEach(b => {

                b.classList.remove("active");

            });


            this.classList.add("active");


            filtroInstrumentos =
                this.dataset.f;


            renderizarInstrumentos();

        }
    );

});


// ======================================================
// MOSTRAR INSTRUMENTOS
// ======================================================

function renderizarInstrumentos() {

    const lista =
        document.getElementById("instrumentos");


    if (!lista) {
        return;
    }


    let instrumentos =
        Object.entries(S.instrumentos);


    instrumentos =
        instrumentos.filter(([id, inst]) => {

            const emUso =
                !!inst.alunoId;


            const defeituoso =
                inst.condicao === "defeituoso";


            if (filtroInstrumentos === "livres") {
                return !emUso;
            }


            if (filtroInstrumentos === "uso") {
                return emUso;
            }


            if (filtroInstrumentos === "defeituosos") {
                return defeituoso;
            }


            return true;

        });


    instrumentos.sort((a, b) => {

        const tipo =
            String(a[1].tipo || "")
                .localeCompare(
                    String(b[1].tipo || "")
                );

        if (tipo !== 0) {
            return tipo;
        }

        return Number(a[1].numero || 0)
            - Number(b[1].numero || 0);

    });


    if (instrumentos.length === 0) {

        lista.innerHTML = `
            <div class="text-center text-muted py-4">
                Nenhum instrumento encontrado.
            </div>
        `;

        return;
    }


    lista.innerHTML = instrumentos.map(
        ([id, instrumento]) => {

            const aluno =
                instrumento.alunoId
                    ? S.alunos[instrumento.alunoId]
                    : null;


            const emUso = !!aluno;


            const defeituoso =
                instrumento.condicao === "defeituoso";


            const classeCondicao =
                defeituoso
                    ? "bad"
                    : "ok";


            const textoCondicao =
                defeituoso
                    ? "🔴 Defeituoso"
                    : "🟢 Bom";


            const status =
                emUso
                    ? `<span class="using">
                         👤 Em uso: ${escapar(aluno.nome)}
                       </span>`
                    : `<span class="free">
                         ✅ Livre
                       </span>`;


            return `
                <div class="col-12 col-md-6 col-lg-4 mb-3">

                    <div class="card instrument">

                        <h5>
                            ${escapar(instrumento.tipo)}
                            ${escapar(instrumento.numero)}
                        </h5>


                        <p class="${classeCondicao}">
                            ${textoCondicao}
                        </p>


                        <p>
                            ${status}
                        </p>


                        <div class="d-flex gap-2 flex-wrap">

                            <button
                                class="btn btn-sm ${
                                    defeituoso
                                        ? "btn-success"
                                        : "btn-danger"
                                }"
                                onclick="alternarCondicao('${id}')"
                            >
                                ${
                                    defeituoso
                                        ? "🟢 Marcar bom"
                                        : "🔴 Marcar defeituoso"
                                }
                            </button>


                            <button
                                class="btn btn-sm btn-outline-danger"
                                onclick="excluirInstrumento('${id}')"
                                ${
                                    emUso
                                        ? "disabled"
                                        : ""
                                }
                            >
                                🗑️ Excluir
                            </button>

                        </div>

                    </div>

                </div>
            `;

        }
    ).join("");

}


// ======================================================
// ALTERAR CONDIÇÃO
// ======================================================

async function alternarCondicao(id) {

    const instrumento =
        S.instrumentos[id];


    if (!instrumento) {
        return;
    }


    const novaCondicao =
        instrumento.condicao === "defeituoso"
            ? "bom"
            : "defeituoso";


    await db.ref(
        `instrumentos/${id}/condicao`
    ).set(novaCondicao);


    toast(
        novaCondicao === "defeituoso"
            ? "Instrumento marcado como defeituoso."
            : "Instrumento marcado como bom.",
        novaCondicao === "defeituoso"
            ? "danger"
            : "success"
    );
}


// ======================================================
// EXCLUIR INSTRUMENTO
// ======================================================

async function excluirInstrumento(id) {

    const instrumento =
        S.instrumentos[id];


    if (!instrumento) {
        return;
    }


    if (instrumento.alunoId) {

        toast(
            "Não é possível excluir um instrumento em uso.",
            "warning"
        );

        return;
    }


    const confirmar = confirm(
        `Deseja excluir o instrumento ${instrumento.tipo} ${instrumento.numero}?`
    );


    if (!confirmar) {
        return;
    }


    await db.ref(
        `instrumentos/${id}`
    ).remove();


    toast(
        "Instrumento excluído.",
        "success"
    );
}


// ======================================================
// CHAMADA
// ======================================================

const campoData =
    document.getElementById("dataChamada");


if (campoData) {

    campoData.value = dataHoje();


    campoData.addEventListener(
        "change",
        renderizarChamada
    );

}


// ======================================================
// MOSTRAR CHAMADA
// ======================================================

function renderizarChamada() {

    const tabela =
        document.getElementById("tabelaChamada");


    if (!tabela) {
        return;
    }


    const data =
        document.getElementById("dataChamada")
            ?.value || dataHoje();


    const alunos =
        Object.entries(S.alunos);


    const chamadaData =
        S.chamadas[data] || {};


    let presentes = 0;
    let faltas = 0;


    alunos.forEach(([id]) => {

        const presenca =
            chamadaData[id]?.p || "";


        if (presenca === "presente") {
            presentes++;
        }


        if (presenca === "faltou") {
            faltas++;
        }

    });


    const total =
        document.getElementById("total");


    const presentesEl =
        document.getElementById("presentes");


    const faltasEl =
        document.getElementById("faltas");


    if (total) {
        total.textContent = alunos.length;
    }


    if (presentesEl) {
        presentesEl.textContent = presentes;
    }


    if (faltasEl) {
        faltasEl.textContent = faltas;
    }


    if (alunos.length === 0) {

        tabela.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="text-center text-muted py-4"
                >
                    Nenhum aluno cadastrado.
                </td>
            </tr>
        `;

        return;
    }


    alunos.sort((a, b) =>
        String(a[1].nome || "")
            .localeCompare(
                String(b[1].nome || "")
            )
    );


    tabela.innerHTML = alunos.map(
        ([id, aluno], indice) => {

            const instrumento =
                S.instrumentos[aluno.instrumentoId];


            const chamada =
                chamadaData[id] || {};


            const presenca =
                chamada.p || "";


            const observacao =
                chamada.o || "";


            const botaoPresente =
                presenca === "presente"
                    ? "btn-success"
                    : "btn-outline-success";


            const botaoFalta =
                presenca === "faltou"
                    ? "btn-danger"
                    : "btn-outline-danger";


            return `
                <tr>

                    <td>
                        ${escapar(aluno.nome)}
                    </td>


                    <td>
                        ${escapar(aluno.turma)}
                    </td>


                    <td>
                        ${
                            instrumento
                                ? escapar(
                                    instrumento.tipo +
                                    " " +
                                    instrumento.numero
                                )
                                : "Sem instrumento"
                        }
                    </td>


                    <td>
                        ${indice + 1}
                    </td>


                    <td>

                        <div class="d-flex gap-1">

                            <button
                                class="btn btn-sm ${botaoPresente}"
                                onclick="marcarPresenca(
                                    '${data}',
                                    '${id}',
                                    'presente'
                                )"
                            >
                                Presente
                            </button>


                            <button
                                class="btn btn-sm ${botaoFalta}"
                                onclick="marcarPresenca(
                                    '${data}',
                                    '${id}',
                                    'faltou'
                                )"
                            >
                                Faltou
                            </button>


                            <button
                                class="btn btn-sm btn-outline-secondary"
                                onclick="limparPresenca(
                                    '${data}',
                                    '${id}'
                                )"
                            >
                                Limpar
                            </button>

                        </div>

                    </td>


                    <td>

                        <input
                            type="text"
                            class="form-control form-control-sm"
                            value="${escapar(observacao)}"
                            placeholder="Observação"
                            onchange="salvarObservacao(
                                '${data}',
                                '${id}',
                                this.value
                            )"
                        >

                    </td>

                </tr>
            `;

        }
    ).join("");

}


// ======================================================
// MARCAR PRESENÇA
// ======================================================

async function marcarPresenca(
    data,
    alunoId,
    valor
) {

    const atual =
        S.chamadas[data]?.[alunoId]?.p || "";


    // Se clicar novamente,
    // remove a marcação.

    if (atual === valor) {

        await db.ref(
            `chamadas/${data}/${alunoId}/p`
        ).remove();

    } else {

        await db.ref(
            `chamadas/${data}/${alunoId}/p`
        ).set(valor);

    }
}


// ======================================================
// LIMPAR PRESENÇA
// ======================================================

async function limparPresenca(
    data,
    alunoId
) {

    await db.ref(
        `chamadas/${data}/${alunoId}/p`
    ).remove();

}


// ======================================================
// SALVAR OBSERVAÇÃO
// ======================================================

async function salvarObservacao(
    data,
    alunoId,
    observacao
) {

    if (observacao.trim() === "") {

        await db.ref(
            `chamadas/${data}/${alunoId}/o`
        ).remove();

        return;
    }


    await db.ref(
        `chamadas/${data}/${alunoId}/o`
    ).set(
        observacao.trim()
    );

}


// ======================================================
// BOTÃO SALVAR CHAMADA
// ======================================================

const salvarChamada =
    document.getElementById("salvarChamada");


if (salvarChamada) {

    salvarChamada.addEventListener(
        "click",
        function () {

            toast(
                "A chamada já é salva automaticamente.",
                "info"
            );

        }
    );

}


// ======================================================
// AVISOS
// ======================================================

const formAviso =
    document.getElementById("fAviso");


if (formAviso) {

    formAviso.addEventListener(
        "submit",
        async function (e) {

            e.preventDefault();


            const campo =
                document.getElementById("textoAviso");


            const texto =
                campo.value.trim();


            if (!texto) {

                toast(
                    "Digite o aviso.",
                    "warning"
                );

                return;
            }


            const id = novoId();


            await db.ref(
                `avisos/${id}`
            ).set({

                texto: texto,

                criadoEm: Date.now()

            });


            formAviso.reset();


            toast(
                "Aviso publicado!",
                "success"
            );

        }
    );

}


// ======================================================
// MOSTRAR AVISOS
// ======================================================

function renderizarAvisos() {

    const lista =
        document.getElementById("avisos");


    if (!lista) {
        return;
    }


    const avisos =
        Object.entries(S.avisos)
            .sort(
                (a, b) =>
                    Number(b[1].criadoEm || 0)
                    -
                    Number(a[1].criadoEm || 0)
            );


    if (avisos.length === 0) {

        lista.innerHTML = `
            <div class="text-center text-muted py-4">
                Nenhum aviso publicado.
            </div>
        `;

        return;
    }


    lista.innerHTML = avisos.map(
        ([id, aviso]) => {

            const data =
                aviso.criadoEm
                    ? new Date(aviso.criadoEm)
                    : new Date();


            return `
                <div class="notice">

                    <div class="d-flex justify-content-between gap-3">

                        <span class="badge bg-primary">
                            📢 Aviso
                        </span>

                        <small class="text-muted">
                            ${data.toLocaleString("pt-BR")}
                        </small>

                    </div>


                    <p>
                        ${escapar(aviso.texto)}
                    </p>


                    <button
                        class="btn btn-sm btn-outline-danger"
                        onclick="excluirAviso('${id}')"
                    >
                        🗑️ Excluir
                    </button>

                </div>
            `;

        }
    ).join("");

}


// ======================================================
// EXCLUIR AVISO
// ======================================================

async function excluirAviso(id) {

    if (
        !confirm(
            "Deseja realmente excluir este aviso?"
        )
    ) {
        return;
    }


    await db.ref(
        `avisos/${id}`
    ).remove();


    toast(
        "Aviso excluído.",
        "success"
    );
}


// ======================================================
// EVENTOS
// ======================================================

const formEvento =
    document.getElementById("fEvento");


if (formEvento) {

    formEvento.addEventListener(
        "submit",
        async function (e) {

            e.preventDefault();


            const nome =
                document.getElementById("nomeEvento")
                    .value.trim();


            const data =
                document.getElementById("dataEvento")
                    .value;


            const local =
                document.getElementById("localEvento")
                    .value.trim();


            if (!nome || !data || !local) {

                toast(
                    "Preencha todos os campos.",
                    "warning"
                );

                return;
            }


            const id = novoId();


            await db.ref(
                `eventos/${id}`
            ).set({

                nome: nome,

                data: data,

                local: local,

                criadoEm: Date.now()

            });


            formEvento.reset();


            toast(
                "Evento cadastrado!",
                "success"
            );

        }
    );

}


// ======================================================
// MOSTRAR EVENTOS
// ======================================================

function renderizarEventos() {

    const lista =
        document.getElementById("eventos");


    if (!lista) {
        return;
    }


    const hoje =
        dataHoje();


    const eventos =
        Object.entries(S.eventos)
            .sort(
                (a, b) =>
                    String(a[1].data || "")
                        .localeCompare(
                            String(b[1].data || "")
                        )
            );


    if (eventos.length === 0) {

        lista.innerHTML = `
            <div class="text-center text-muted py-4">
                Nenhum evento cadastrado.
            </div>
        `;

        return;
    }


    lista.innerHTML = eventos.map(
        ([id, evento]) => {

            const passado =
                evento.data < hoje;


            return `
                <div class="event">

                    <div class="d-flex justify-content-between">

                        <span class="badge ${
                            passado
                                ? "bg-secondary"
                                : "bg-success"
                        }">

                            ${
                                passado
                                    ? "Evento realizado"
                                    : "Próximo evento"
                            }

                        </span>


                        <small class="text-muted">
                            ${formatarData(evento.data)}
                        </small>

                    </div>


                    <h5>
                        📅 ${escapar(evento.nome)}
                    </h5>


                    <p class="mb-3">
                        📍 ${escapar(evento.local)}
                    </p>


                    <button
                        class="btn btn-sm btn-outline-danger"
                        onclick="excluirEvento('${id}')"
                    >
                        🗑️ Excluir
                    </button>

                </div>
            `;

        }
    ).join("");

}


// ======================================================
// EXCLUIR EVENTO
// ======================================================

async function excluirEvento(id) {

    if (
        !confirm(
            "Deseja realmente excluir este evento?"
        )
    ) {
        return;
    }


    await db.ref(
        `eventos/${id}`
    ).remove();


    toast(
        "Evento excluído.",
        "success"
    );
}


// ======================================================
// PROBLEMAS
// ======================================================

const formProblema =
    document.getElementById("fProblema");


if (formProblema) {

    formProblema.addEventListener(
        "submit",
        async function (e) {

            e.preventDefault();


            const descricao =
                document.getElementById(
                    "descricaoProblema"
                ).value.trim();


            const instrumentoId =
                document.getElementById(
                    "instrumentoProblema"
                ).value;


            if (!descricao) {

                toast(
                    "Descreva o problema.",
                    "warning"
                );

                return;
            }


            const id = novoId();


            const atualizacoes = {};


            atualizacoes[
                `problemas/${id}`
            ] = {

                descricao: descricao,

                instrumentoId:
                    instrumentoId || "",

                status: "aberto",

                criadoEm: Date.now()

            };


            // Se tiver instrumento,
            // marca automaticamente como defeituoso.

            if (instrumentoId) {

                atualizacoes[
                    `instrumentos/${instrumentoId}/condicao`
                ] = "defeituoso";

            }


            await db.ref().update(
                atualizacoes
            );


            formProblema.reset();


            toast(
                "Problema registrado!",
                "danger"
            );

        }
    );

}


// ======================================================
// MOSTRAR PROBLEMAS
// ======================================================

function renderizarProblemas() {

    const lista =
        document.getElementById("problemas");


    if (!lista) {
        return;
    }


    const problemas =
        Object.entries(S.problemas)
            .sort(
                (a, b) =>
                    Number(b[1].criadoEm || 0)
                    -
                    Number(a[1].criadoEm || 0)
            );


    if (problemas.length === 0) {

        lista.innerHTML = `
            <div class="text-center text-muted py-4">
                Nenhum problema registrado.
            </div>
        `;

        atualizarContadorProblemas(0);

        return;
    }


    let abertos = 0;


    lista.innerHTML = problemas.map(
        ([id, problema]) => {

            const aberto =
                problema.status !== "resolvido";


            if (aberto) {
                abertos++;
            }


            const instrumento =
                problema.instrumentoId
                    ? S.instrumentos[
                        problema.instrumentoId
                    ]
                    : null;


            const nomeInstrumento =
                instrumento
                    ? `${instrumento.tipo} ${instrumento.numero}`
                    : "Nenhum";


            return `
                <div class="problem ${
                    aberto
                        ? "open"
                        : "done"
                }">

                    <div class="d-flex justify-content-between">

                        <span class="badge ${
                            aberto
                                ? "bg-danger"
                                : "bg-success"
                        }">

                            ${
                                aberto
                                    ? "🔴 Em aberto"
                                    : "🟢 Resolvido"
                            }

                        </span>


                        <small class="text-muted">
                            ${
                                problema.criadoEm
                                    ? new Date(
                                        problema.criadoEm
                                    ).toLocaleString(
                                        "pt-BR"
                                    )
                                    : ""
                            }
                        </small>

                    </div>


                    <p>
                        <strong>
                            Problema:
                        </strong>

                        ${escapar(
                            problema.descricao
                        )}
                    </p>


                    <p>
                        <strong>
                            Instrumento:
                        </strong>

                        ${escapar(
                            nomeInstrumento
                        )}
                    </p>


                    <div class="d-flex gap-2 flex-wrap">

                        <button
                            class="btn btn-sm ${
                                aberto
                                    ? "btn-success"
                                    : "btn-warning"
                            }"
                            onclick="alternarProblema('${id}')"
                        >
                            ${
                                aberto
                                    ? "✓ Marcar resolvido"
                                    : "↩ Reabrir"
                            }
                        </button>


                        <button
                            class="btn btn-sm btn-outline-danger"
                            onclick="excluirProblema('${id}')"
                        >
                            🗑️ Excluir
                        </button>

                    </div>

                </div>
            `;

        }
    ).join("");


    atualizarContadorProblemas(abertos);

}


// ======================================================
// ALTERAR STATUS DO PROBLEMA
// ======================================================

async function alternarProblema(id) {

    const problema =
        S.problemas[id];


    if (!problema) {
        return;
    }


    const novoStatus =
        problema.status === "resolvido"
            ? "aberto"
            : "resolvido";


    await db.ref(
        `problemas/${id}/status`
    ).set(novoStatus);


    toast(
        novoStatus === "resolvido"
            ? "Problema marcado como resolvido."
            : "Problema reaberto.",
        novoStatus === "resolvido"
            ? "success"
            : "warning"
    );
}


// ======================================================
// EXCLUIR PROBLEMA
// ======================================================

async function excluirProblema(id) {

    if (
        !confirm(
            "Deseja realmente excluir este problema?"
        )
    ) {
        return;
    }


    await db.ref(
        `problemas/${id}`
    ).remove();


    toast(
        "Problema excluído.",
        "success"
    );
}


// ======================================================
// CONTADOR DE PROBLEMAS
// ======================================================

function atualizarContadorProblemas(
    quantidade
) {

    const contador =
        document.getElementById(
            "contadorProblemas"
        );


    if (contador) {

        contador.textContent =
            `${quantidade} em aberto`;

    }


    const badge =
        document.getElementById(
            "badgeProblemas"
        );


    if (badge) {

        badge.textContent =
            quantidade;

    }

}


function atualizarBadgeProblemas() {

    const quantidade =
        Object.values(S.problemas)
            .filter(
                problema =>
                    problema.status !== "resolvido"
            ).length;


    atualizarContadorProblemas(
        quantidade
    );

}


// ======================================================
// ATUALIZAR SELECTS
// ======================================================

function atualizarSelects() {

    atualizarSelectInstrumentoAluno();

    atualizarSelectInstrumentoProblema();

}


// ======================================================
// SELECT DE INSTRUMENTOS DOS ALUNOS
// ======================================================

function atualizarSelectInstrumentoAluno() {

    const select =
        document.getElementById("instAluno");


    if (!select) {
        return;
    }


    const valorAtual =
        select.value;


    let html = `
        <option value="">
            Sem instrumento
        </option>
    `;


    Object.entries(S.instrumentos)
        .sort(
            (a, b) =>
                String(a[1].tipo || "")
                    .localeCompare(
                        String(b[1].tipo || "")
                    )
        )
        .forEach(
            ([id, instrumento]) => {

                if (
                    !instrumento.alunoId &&
                    instrumento.condicao !== "defeituoso"
                ) {

                    html += `
                        <option value="${id}">
                            ${escapar(
                                instrumento.tipo
                            )}
                            ${escapar(
                                instrumento.numero
                            )}
                        </option>
                    `;

                }

            }
        );


    select.innerHTML = html;


    if (
        [...select.options]
            .some(
                option =>
                    option.value === valorAtual
            )
    ) {

        select.value = valorAtual;

    }

}


// ======================================================
// SELECT DE INSTRUMENTOS DOS PROBLEMAS
// ======================================================

function atualizarSelectInstrumentoProblema() {

    const select =
        document.getElementById(
            "instrumentoProblema"
        );


    if (!select) {
        return;
    }


    const valorAtual =
        select.value;


    let html = `
        <option value="">
            Nenhum instrumento específico
        </option>
    `;


    Object.entries(S.instrumentos)
        .sort(
            (a, b) =>
                String(a[1].tipo || "")
                    .localeCompare(
                        String(b[1].tipo || "")
                    )
        )
        .forEach(
            ([id, instrumento]) => {

                html += `
                    <option value="${id}">
                        ${escapar(
                            instrumento.tipo
                        )}
                        ${escapar(
                            instrumento.numero
                        )}
                    </option>
                `;

            }
        );


    select.innerHTML = html;


    if (
        [...select.options]
            .some(
                option =>
                    option.value === valorAtual
            )
    ) {

        select.value = valorAtual;

    }

}


// ======================================================
// INICIALIZAÇÃO
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        renderizar();

    }
);

# 🎺 Fanfarras

Sistema web para gerenciamento de uma fanfarra.

## 📋 Funcionalidades

- Chamada dos alunos
- Cadastro de alunos
- Cadastro de instrumentos
- Controle de instrumentos livres e em uso
- Controle de instrumentos defeituosos
- Avisos para a fanfarra
- Cadastro de eventos
- Registro de problemas
- Atualização em tempo real

## 📁 Arquivos

Todos os arquivos ficam na mesma pasta:

- `index.html`
- `style.css`
- `app.js`
- `firebase-config.js`
- `README.md`

## 🔥 Configuração do Firebase

O sistema utiliza o Firebase Realtime Database para compartilhar as informações em tempo real.

No arquivo:

`firebase-config.js`

coloque as informações do seu projeto Firebase.

Também é necessário ativar:

- Authentication → Anonymous
- Realtime Database

## 🌐 Publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie todos os arquivos para o repositório.
3. Entre em:

**Settings → Pages**

4. Em **Build and deployment**, selecione:

**Deploy from a branch**

5. Escolha:

**Branch: main**

**Folder: / (root)**

6. Clique em **Save**.

Depois de alguns minutos, o GitHub Pages fornecerá o endereço do seu site.

## 🎺 Como utilizar

### 1. Instrumentos

Cadastre primeiro todos os instrumentos da fanfarra.

Exemplo:

- Caixa nº 1
- Caixa nº 2
- Bumbo nº 1
- Surdo nº 1
- Prato nº 1
- Lira nº 1
- Corneta nº 1

### 2. Alunos

Depois cadastre os alunos e escolha um instrumento disponível.

Um instrumento não pode ficar atribuído a dois alunos.

### 3. Chamada

Na data do ensaio:

- selecione a data;
- marque os alunos presentes;
- marque os faltosos;
- registre observações quando necessário.

As informações são salvas automaticamente.

### 4. Avisos

Use essa área para publicar informações para todos os integrantes da fanfarra.

### 5. Eventos

Cadastre apresentações, ensaios especiais, desfiles e outros eventos.

### 6. Problemas

Registre problemas encontrados nos instrumentos.

Quando um instrumento for selecionado em um problema, ele será marcado automaticamente como **defeituoso**.

## 📱 Celular

O sistema foi desenvolvido para funcionar também em celulares e tablets.

## ⚠️ Segurança

Antes de utilizar dados reais dos alunos, configure corretamente as regras de segurança do Firebase Realtime Database.

Nunca compartilhe senhas ou credenciais administrativas do Firebase.

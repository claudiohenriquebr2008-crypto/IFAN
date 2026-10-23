# IFAN — Sistema da Fanfarra (com login)

## O que este pacote corrige
- `app.js` completo (o do site estava truncado)
- Páginas HTML sem conteúdo duplicado
- Login com Firebase Authentication (e-mail/senha)
- Regras do Realtime Database exigindo usuário logado

## Regras do Firebase (cole e publique)

No console: **Realtime Database → Regras**

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

Arquivo pronto: `firebase-rules.json`.

## Authentication

1. Firebase Console → **Authentication** → **Sign-in method**
2. Ative **E-mail/senha**
3. Em **Users**, crie os usuários (ou use o botão **Cadastrar** na tela de login)

Admins (veem o badge “Administrador” no app):

- `administrativo945@gmail.com`
- `claudiohenriquebr2008@gmail.com`

(Outros e-mails entram normalmente; só o rótulo muda. Com as regras acima, qualquer conta autenticada pode ler e escrever.)

## Deploy (Vercel / Netlify / GitHub)

1. Apague os arquivos antigos do projeto.
2. Envie **todos** os arquivos desta pasta.
3. Publique as regras no Firebase (passo acima).
4. Abra o site → deve cair em `login.html`.

## Arquivos

| Arquivo | Função |
|---------|--------|
| login.html | Entrar / cadastrar |
| index.html | Painel |
| chamada.html | Presença |
| alunos.html | Alunos |
| instrumentos.html | Instrumentos |
| avisos.html | Avisos |
| eventos.html | Eventos |
| problemas.html | Problemas |
| app.js | Lógica |
| firebase-config.js | Projeto `ifan-f8f19` |
| firebase-rules.json | Regras `auth != null` |
| style.css | Tema escuro |

## Fluxo
1. Usuário abre qualquer página → se não estiver logado, vai para `login.html`.
2. Entra com e-mail/senha (ou cadastra).
3. Firebase Auth libera o Realtime Database (regras `auth != null`).
4. Dados sincronizam entre aparelhos.

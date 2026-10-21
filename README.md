# Fanfarra (IFAN)

## Publicação do site

O site pode ficar acessível publicamente pelo endereço da Vercel/Netlify, mas mantenha o login para proteger os dados dos alunos, presenças e instrumentos.

- Publique os arquivos na raiz do repositório (o `index.html` deve ficar na raiz).
- No Firebase Authentication, ative **E-mail/senha** e cadastre os usuários autorizados.
- No Firebase Realtime Database, use regras que exijam autenticação:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

**Importante:** não use `.read: true` e `.write: true` no banco real. Isso permitiria que qualquer pessoa lesse, alterasse ou apagasse dados dos alunos. O `firebase-config.js` mantém `EXIGIR_LOGIN_CFG = true`.

## Instrumentos

A lista de instrumentos é organizada pelo número em ordem crescente (1, 2, 3, ...). Em caso de números iguais, os tipos são organizados alfabeticamente.

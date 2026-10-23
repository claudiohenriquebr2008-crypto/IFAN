# IFAN — Fanfarra (Admin × Aluno)

## Perfis

| Perfil | Acesso |
|--------|--------|
| **Admin** | Início, Chamada, Alunos, Instrumentos, Avisos, Eventos, Problemas (resolve) |
| **Aluno** | Início (avisos/eventos resumidos), Avisos (ler), Eventos (ler), Problemas (reportar e ver) |

Admins fixos por e-mail (em `app.js`):
- administrativo945@gmail.com
- claudiohenriquebr2008@gmail.com

Ou no Firebase: `papeis/{UID}` = `"admin"` ou `"aluno"`.

## Regras sugeridas

Cole em Realtime Database → Regras (mínimo para funcionar com login):

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

## Deploy

Troque principalmente `app.js` e `style.css`. Faça deploy no Vercel.

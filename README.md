# Fanfarra (IFAN) 

## 1. Firebase (uma vez só)
Firebase Console → projeto **ifan-f8f19** → Realtime Database → **Regras**. Cole e clique em **Publicar**:

    { "rules": { ".read": true, ".write": true } }

Sem isso o site funciona, mas salva só no aparelho (aparece um aviso amarelo no topo).
Atenção: essas regras deixam o banco aberto a quem tiver o link do site.

## 2. Netlify
- Arrastar e soltar: Netlify → Sites → "Deploy manually" → solte **a pasta com estes arquivos**
  (o `index.html` precisa estar na raiz, não dentro de outra pasta).
- Ou GitHub: envie os arquivos para a raiz do repositório e conecte no Netlify
  (Build command vazio, Publish directory `.`).

## 3. Login (já ligado)
Firebase → Authentication → Sign-in method → ative **E-mail/senha** → aba Users → "Adicionar usuário".
Regras do banco para exigir login: `{ "rules": { ".read": "auth != null", ".write": "auth != null" } }`
Para site aberto sem login, em `firebase-config.js` use `EXIGIR_LOGIN_CFG = false` e regras `true`.

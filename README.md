# IFAN — Fanfarra (login por perfil)

## Quem entra
Só entra quem tem **login no Firebase Authentication** E um perfil em `papeis/<UID>` no Realtime Database:
- `"admin"`: vê e mexe em tudo (chamada, alunos, instrumentos, avisos, eventos, problemas).
- `"aluno"`: vê avisos e eventos, e relata problemas (o relato é privado). Só isso.

Quem tem login mas não tem perfil é desconectado e vê "não está cadastrado".

## Passo a passo
1. Firebase → Authentication → ative **E-mail/senha** e crie os usuários (admins e alunos). Copie o **UID** de cada um.
2. Realtime Database → Dados: crie `papeis` → `<UID>` com o valor `admin` ou `aluno`. Comece pelo seu usuário (admin).
3. Realtime Database → Regras: cole o `firebase-rules.json` e publique.
4. Envie os arquivos para o GitHub e espere a Vercel publicar.

## Botão Cadastrar (embaixo do login)
O aluno que já tem login digita e-mail e senha e clica **Cadastrar**. Ele entra e preenche nome, sala e número. O admin vê em **Alunos → Cadastros recebidos** e clica **Aprovar**.

## Mudou em relação à versão anterior
- Sem `ADMIN_EMAIL`: os admins agora são os usuários com `papeis/<UID> = admin` (pode ter vários).
- Aluno vê eventos, mas não envia mais sugestão de evento.
- Linha dourada do cabeçalho removida; botões **+ Aluno** e **+ Instrumento** só para admin.
- Login e páginas estavam duplicados dentro do mesmo arquivo; agora cada arquivo tem um só.

# Continuar o projeto em outro computador

Guia para retomar o desenvolvimento de **Pedidos de Compra** numa máquina nova.
O código está todo no GitHub; o que **não** está lá são as senhas/chaves e o
material antigo do PowerApps (itens 3 e 5 abaixo).

## 1. Instalar o que precisa

- **Git** — https://git-scm.com
- **Node.js 24** (LTS atual) — https://nodejs.org (já vem com o npm)
- Um editor (VS Code) e/ou o Claude Code

Versões usadas até aqui: Node 24.19, npm 11.

## 2. Baixar o código e rodar

```bash
git clone https://github.com/SatSunasia/Financialapp.git
cd Financialapp
npm install
```

Crie o arquivo `.env` (ele **não** vem do GitHub, está no `.gitignore`):

```bash
cp .env.example .env
```

e preencha com os valores do Supabase (**Settings → API**: `Project URL` e a
chave `anon public`/publishable):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Se preferir, copie o `.env` do computador antigo (por um canal privado — pasta
privada do Drive ou e-mail para você mesmo; **não** coloque no GitHub).

```bash
npm run dev      # abre em http://localhost:5173
```

O app local conversa com o **mesmo banco de produção** do Supabase. Tudo que
você criar, alterar ou apagar pelo app local vale de verdade.

## 3. O que NÃO está no GitHub (precisa levar à parte)

| Item | Onde está | Como recuperar |
|---|---|---|
| `.env` (URL + chave anon) | pasta do projeto no computador antigo | copiar, ou pegar de novo no Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | só nas variáveis do Netlify | Supabase → Settings → API → `service_role`. **Nunca** em arquivo nem no GitHub |
| Variáveis do Netlify | Netlify → Site settings → Environment variables | já estão lá; só confira se mudar de conta |
| Senhas dos usuários | Supabase Auth | admin gera outra pelo botão "Reset senha" em Administração |
| Material do PowerApps (`source/`, `source-v6/`) | `C:\CLAUDE\pedido-compras\` | ver item 5 (backup em .zip) |

As funções do Netlify (criar/excluir usuário, reset de senha) só rodam no
Netlify. No `npm run dev` os botões de Administração que dependem delas
(criar, resetar senha, excluir usuário) **não funcionam** localmente, a menos
que você use `npx netlify dev` com as variáveis configuradas. Todo o resto
funciona.

## 4. Banco de dados — regra mais importante

> **NUNCA rode `supabase/schema.sql` no banco de produção.** Ele apaga TODOS os
> dados (pedidos, cotações, usuários, perfis, admins) e recria vazio. Serve
> só para montar um banco novo e vazio. Isso já aconteceu uma vez e derrubou
> as permissões de admin.

Para mudar o banco em uso, rode **só as migrações numeradas** da pasta
`supabase/`, uma vez cada, em ordem, no SQL Editor (aba nova):

| Arquivo | O que faz | Estado |
|---|---|---|
| `schema.sql` | estrutura completa (referência / banco novo) | só referência |
| `002_admin.sql` | colunas `is_admin` e `email` em `usuarios` (histórico; já incluída no `schema.sql`) | aplicada |
| `003_visibilidade_e_exclusao.sql` | leitura por perfil/empresa; só admin exclui pedido | aplicada |
| `004_corrige_recursao_cotacoes.sql` | corrige erro ao salvar orçamento | aplicada |
| `005_limpeza_e_empresas_iniciais.sql` | limpou testes, cadastrou empresas, zerou numeração | aplicada (uma vez só) |

Migração nova = novo arquivo `006_...`, `007_...`, e atualizar o `schema.sql`
para refletir o resultado.

Promover alguém a admin (SQL Editor, aba nova — não é o schema.sql):

```sql
update usuarios set is_admin = true where email = 'pessoa@exemplo.com';
```

## 5. Backup do material antigo (PowerApps)

Fora do repositório existem as exportações originais do app antigo, usadas
como referência de telas e regras: `source/` (versão 1) e `source-v6/` (versão
com telas de administração). Estão compactadas em
`C:\CLAUDE\pedido-compras\backup\legado-powerapps-2026-10-06.zip`.
Copie esse .zip para um pendrive ou para uma pasta **privada** do Drive.

## 6. Publicação (deploy)

- Cada `git push` na branch `main` dispara o deploy automático no Netlify.
- Site: https://purchapp.netlify.app
- Se o deploy não rodar, confira no Netlify (Deploys) se a conta não está sem
  créditos — foi o que pausou os deploys em agosto/setembro.

## 7. Contas do sistema

Usuários e senhas ficam no Supabase (Authentication → Users). Não há senha
neste repositório. Admin master atual: `suporte@sunasia.co`.

## 8. Pendências conhecidas (próximos passos)

- **Backup automático do banco** (o plano gratuito do Supabase não faz backup).
- Tela para o próprio usuário **trocar a senha** (hoje só o admin reseta).
- Etapa "Concluir pedido" (Encaminhado ao ERP → Concluído).
- Feedbacks (Reportar Problema/Sugestão) e métricas extras nos Relatórios.
- A tela "Para Orçar" deveria bloquear quem não é Compras/admin (hoje só o
  banco bloqueia as ações).
- Integração ERP / Conta a Pagar: em stand by.
- Envio de e-mail: removido do escopo do projeto.

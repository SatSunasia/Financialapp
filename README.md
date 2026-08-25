# Pedidos de Compra

Reconstrução moderna (React + Supabase) do app original em PowerApps
(`ScrNovoPedido`, `scrCadastroCotacao`, `scrAprovarPedidos`, `ScrAprovaFinan`,
`scrAcompanharPedidos`). O fluxo é o mesmo:

```
Solicitante cria pedido
  → Compras registra orçamento (valor, fornecedor, data de entrega, forma de pagamento)
    → Gestor aprova/rejeita o orçamento
      → Financeiro aprova/rejeita
        → Aprovado para compra → Encaminhado ao ERP → Concluído
```

Cada mudança de status é registrada automaticamente em `historico_status`
(gatilho no banco — não depende da tela lembrar de salvar).

## 1. Criar o projeto no Supabase

1. Crie uma conta/projeto em [supabase.com](https://supabase.com) (grátis).
2. Em **SQL Editor**, cole e rode o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).
   Isso cria as tabelas, os status, o gatilho de histórico e as regras de
   acesso por perfil (Row Level Security).
3. Em **Settings → API**, copie `Project URL` e a chave `anon public`.
4. Copie `.env.example` para `.env` e preencha:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

## 2. Criar os primeiros usuários

O cadastro de login fica em **Authentication → Users** no painel do
Supabase (crie por e-mail/senha, ou habilite auto-cadastro depois). Ao
criar um usuário, um gatilho já cria a linha correspondente em `usuarios`
com perfil `colaborador`. Para promover alguém a Compras/Gestor/Financeiro,
rode no SQL Editor:

```sql
update usuarios set perfil = 'compras' where id = 'uuid-do-usuario';
```

(pegue o `uuid` na tabela `usuarios` ou em Authentication → Users)

## 3. Rodar local

```bash
npm install
npm run dev
```

## 4. Publicar no Netlify

1. Suba este projeto para um repositório Git (GitHub/GitLab).
2. No Netlify: **Add new site → Import from Git**, aponte para o repo.
3. Build command: `npm run build` · Publish directory: `dist` (já configurado em `netlify.toml`).
4. Em **Site settings → Environment variables**, adicione `VITE_SUPABASE_URL`
   e `VITE_SUPABASE_ANON_KEY` (os mesmos do `.env`).
5. Deploy. Compartilhe o link do site com as pessoas — cada uma faz login
   com o e-mail/senha cadastrado no Supabase.

## 5. Espelho no Google Sheets (opcional)

O banco (Supabase) é sempre a fonte real dos dados — é ele quem garante
que cada perfil só vê/edita o que pode. O Sheets entra só como uma cópia
de leitura fácil de consultar. Passo a passo em
[`netlify/functions/sync-sheets.ts`](netlify/functions/sync-sheets.ts).
Sem configurar as variáveis de ambiente do Google, essa sincronização
fica simplesmente desligada e o app funciona normalmente.

## O que ainda falta (próximos passos sugeridos)

- Tela de administração para cadastrar/editar Fornecedores, Empresas e
  Setores (hoje só dá para inserir via SQL Editor do Supabase).
- Tela de administração para promover perfil de usuário (hoje via SQL).
- Anexar arquivos ao pedido/orçamento (Supabase Storage resolve isso bem).
- Notificação por e-mail nas trocas de status (Supabase tem integração
  com serviços de e-mail, ou dá para usar uma Netlify Function).

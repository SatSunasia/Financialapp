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

Antes de ter um admin com acesso à tela de "Criar novo usuário" dentro do
próprio app (item 4.1), o primeiro usuário precisa ser criado direto no
Supabase: **Authentication → Users → Add user** (marque "Auto Confirm
User"). Ao criar, um gatilho já cria a linha correspondente em `usuarios`
com perfil `colaborador`. Para promover alguém a admin (o que libera criar
os próximos usuários pela própria tela de Administração):

```sql
update usuarios set is_admin = true where id = 'uuid-do-usuario';
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

### 4.1 Criar usuários pela tela de Administração (sem precisar do Supabase)

A tela de Administração tem um botão "+ Criar novo usuário", que chama a
Netlify Function [`criar-usuario.ts`](netlify/functions/criar-usuario.ts).
Pra isso funcionar, adicione mais duas variáveis de ambiente no Netlify
(**Site settings → Environment variables**):

- `SUPABASE_URL` — a mesma URL do `VITE_SUPABASE_URL` (mas **sem** o
  prefixo `VITE_`, porque essa variável só é usada no servidor — não
  precisa e não deve ir para o código do navegador).
- `SUPABASE_SERVICE_ROLE_KEY` — em Supabase **Settings → API → Project
  API keys**, a chave `service_role` (ou `secret`, no formato mais novo
  `sb_secret_...`). **Essa chave é diferente da anon/publishable e dá
  acesso total ao banco, ignorando toda regra de segurança (RLS).**
  Nunca cole ela no `.env` do projeto, nunca no código, nunca em lugar
  público — só nessa variável de ambiente do Netlify (marque a opção
  "Contains secret values" se o Netlify oferecer isso).

Sem essas duas variáveis, o botão "Criar novo usuário" aparece mas dá erro
ao usar — o resto do app funciona normalmente. Nesse caso, continue
criando usuários direto no Supabase (item 2) enquanto não configurar isso.

## 5. Espelho no Google Sheets (opcional)

O banco (Supabase) é sempre a fonte real dos dados — é ele quem garante
que cada perfil só vê/edita o que pode. O Sheets entra só como uma cópia
de leitura fácil de consultar. Passo a passo em
[`netlify/functions/sync-sheets.ts`](netlify/functions/sync-sheets.ts).
Sem configurar as variáveis de ambiente do Google, essa sincronização
fica simplesmente desligada e o app funciona normalmente.

## O que ainda falta (próximos passos sugeridos)

- Tela de administração para cadastrar/editar Fornecedores (Empresas e
  Setores já têm tela própria; Fornecedores hoje só via SQL Editor).
- Configurar SMTP próprio no Supabase para o "Esqueci minha senha"
  entregar e-mail de verdade (o padrão do Supabase não entrega pra
  ninguém fora da equipe do projeto).
- Anexar arquivos ao pedido/orçamento (Supabase Storage resolve isso bem).
- Notificação por e-mail nas trocas de status (Supabase tem integração
  com serviços de e-mail, ou dá para usar uma Netlify Function).

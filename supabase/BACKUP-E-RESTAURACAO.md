# Backup e restauração do banco

## Como o backup funciona

O workflow [`.github/workflows/backup-banco.yml`](../.github/workflows/backup-banco.yml)
roda **todo dia às 02:30 (Brasília)** no GitHub Actions e também sob demanda.
Ele exporta o banco do Supabase, compacta, **criptografa com AES-256** e guarda
o arquivo `backup-banco-AAAA-MM-DD.tar.gz.gpg` por **90 dias**.

O repositório é público: por isso o arquivo só existe criptografado. Quem
baixar sem a senha não consegue abrir.

**O que entra:** schema `public` completo (tabelas, dados, policies, funções:
pedidos, cotações, histórico, usuários, fornecedores, empresas, setores) e os
logins (`auth.users` e `auth.identities`, com o hash das senhas).

**O que NÃO entra:** os arquivos de anexo do Storage (bucket `anexos-cotacoes`).
Eles não estão no banco. Se anexos passarem a ser críticos, baixe o bucket
periodicamente pelo painel do Supabase.

## Configuração (uma vez)

1. **Supabase → Connect → Session pooler** (não use "Direct" nem
   "Transaction"): copie a URI. Troque `[YOUR-PASSWORD]` pela senha do banco
   (esqueceu? Supabase → Database → Settings → Reset database password).
   Se a senha tiver caracteres especiais, codifique: `@`→`%40`, `#`→`%23`,
   `/`→`%2F`, `:`→`%3A`, `%`→`%25`.
2. **GitHub → repositório → Settings → Secrets and variables → Actions →
   New repository secret**:
   - `SUPABASE_DB_URL` = a URI do passo 1
   - `BACKUP_PASSPHRASE` = uma senha longa e aleatória. **Guarde num
     gerenciador de senhas.** Se perdê-la, nenhum backup abre.
3. **Actions → "Backup do banco (Supabase)" → Run workflow**, para testar.
   Deve terminar verde em ~1 minuto.

## Baixar um backup

GitHub → **Actions** → escolha uma execução verde → seção **Artifacts** →
`backup-banco`. Vem um .zip com o arquivo `.gpg` dentro.

Opcional: mantenha uma cópia mensal fora do GitHub (pasta privada do Drive).

## Restaurar

> **Restaure primeiro num projeto Supabase NOVO e VAZIO** (pode ser um
> projeto gratuito de teste). Nunca por cima do banco em uso.

```bash
# 1) Abrir o backup (pede a BACKUP_PASSPHRASE)
gpg --decrypt backup-banco-AAAA-MM-DD.tar.gz.gpg | tar xz
# gera a pasta dump/ com public.sql e auth-dados.sql

# 2) No projeto novo: pegue a URI do Session pooler, igual à configuração acima
psql "URI_DO_PROJETO_NOVO" -f dump/public.sql
```

Atenção à ordem: `public.usuarios` tem chave estrangeira para `auth.users`.
Se `public.sql` reclamar disso, restaure os logins primeiro:

```bash
psql "URI_DO_PROJETO_NOVO" -f dump/auth-dados.sql   # logins
psql "URI_DO_PROJETO_NOVO" -f dump/public.sql        # dados e estrutura
```

Depois da restauração: aponte o `.env` (e as variáveis do Netlify) para o
projeto novo e confira se o login funciona.

## Teste de restauração

**Um backup que nunca foi restaurado ainda não é garantia.** Faça um teste de
restauração completo num projeto gratuito de teste e anote aqui a data e o
resultado (e qualquer ajuste necessário nos comandos acima):

- [ ] Teste de restauração feito em: ____ / resultado: ____

## Avisos

- O GitHub desativa workflows agendados de repositório público depois de 60
  dias sem nenhuma atividade no repositório. Um commit ocasional mantém ativo.
- Se o backup falhar, o GitHub envia e-mail avisando. Não ignore.
- Nunca coloque a URI do banco nem a senha no código ou no `.env` do GitHub.

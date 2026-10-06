-- Migração 004 — corrige: "infinite recursion detected in policy for relation cotacoes"
-- Rodar no SQL Editor do Supabase, numa aba nova. Não apaga dados.
--
-- Sintoma: ao salvar um orçamento (tela Para Orçar) o banco recusa o INSERT.
-- Causa provável: a policy de INSERT de cotacoes confere o limite de 3
-- orçamentos com um SELECT na própria tabela cotacoes, e o Postgres entende
-- isso como recursão da policy. A contagem passa a ser feita por uma função
-- security definer (que roda sem RLS), e a recursão some.
--
-- A policy abaixo é a mesma do schema.sql do repositório, trocando só a
-- contagem. Se alguém alterou essa policy direto no banco, ela é substituída.

create or replace function total_cotacoes_do_pedido(p_pedido uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.cotacoes where pedido_id = p_pedido;
$$;

drop policy if exists "compras_cria_cotacao" on cotacoes;
create policy "compras_cria_cotacao" on cotacoes for insert to authenticated
  with check (
    (perfil_atual() = 'compras' or is_admin_atual())
    and exists (
      select 1 from pedidos_compra p
      where p.id = cotacoes.pedido_id
        and p.status in ('aguardando_cotacao', 'em_cotacao', 'rejeitado_orcamento', 'rejeitado_financeiro')
    )
    and total_cotacoes_do_pedido(cotacoes.pedido_id) < 3
  );

-- Diagnóstico (só leitura), caso o erro continue depois de rodar o acima.
-- Rode e me envie o resultado:
--   select tablename, policyname, cmd, qual, with_check
--   from pg_policies
--   where schemaname = 'public' and tablename in ('cotacoes', 'pedidos_compra')
--   order by tablename, policyname;

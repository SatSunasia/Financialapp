-- Migração incremental — rodar no SQL Editor do Supabase, numa aba nova.
-- NÃO mexe em tabelas nem apaga dados: só substitui 3 policies de leitura
-- e adiciona 1 policy nova de exclusão.
--
-- O que muda:
--  1) pedidos_compra: hoje QUALQUER autenticado lê QUALQUER pedido. Passa a
--     ser: Colaborador só os próprios; Compras e Financeiro continuam vendo
--     todos (Compras precisa pra orçar, Financeiro por decisão do Douglas);
--     Gestor só pedidos das empresas em que ele é o gestor responsável
--     (tabela setores_empresas); Admin sempre vê tudo.
--  2) cotacoes e historico_status: passam a espelhar a mesma visibilidade
--     do pedido a que pertencem (se não pode ver o pedido, não vê o
--     orçamento nem o histórico dele).
--  3) pedidos_compra ganha uma policy de DELETE — só admin exclui.

drop policy if exists "leitura_pedidos" on pedidos_compra;
create policy "leitura_pedidos" on pedidos_compra for select to authenticated
  using (
    is_admin_atual()
    or perfil_atual() = 'financeiro'
    or perfil_atual() = 'compras'
    or solicitante_id = auth.uid()
    or (
      perfil_atual() = 'gestor'
      and exists (
        select 1 from setores_empresas se
        where se.empresa_id = pedidos_compra.empresa_id
          and se.gestor_id = auth.uid()
          and se.ativo
      )
    )
  );

drop policy if exists "leitura_cotacoes" on cotacoes;
create policy "leitura_cotacoes" on cotacoes for select to authenticated
  using (
    exists (select 1 from pedidos_compra p where p.id = cotacoes.pedido_id)
  );

drop policy if exists "leitura_historico" on historico_status;
create policy "leitura_historico" on historico_status for select to authenticated
  using (
    exists (select 1 from pedidos_compra p where p.id = historico_status.pedido_id)
  );

drop policy if exists "admin_exclui_pedido" on pedidos_compra;
create policy "admin_exclui_pedido" on pedidos_compra for delete to authenticated
  using (is_admin_atual());

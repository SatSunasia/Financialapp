-- Schema do Sistema de Pedido de Compra / Orçamento / Aprovação
-- Rodar no SQL Editor do Supabase (Postgres).
-- Este arquivo é seguro de rodar mais de uma vez: ele apaga o que já
-- existir (tabelas, tipos, funções) antes de recriar do zero.

drop trigger if exists trg_novo_usuario on auth.users;

drop table if exists historico_status cascade;
drop table if exists cotacoes cascade;
drop table if exists pedidos_compra cascade;
drop table if exists fornecedores cascade;
drop table if exists naturezas_pedido cascade;
drop table if exists usuarios cascade;
drop table if exists setores_empresas cascade;
drop table if exists setores cascade;
drop table if exists empresas cascade;

drop function if exists fn_novo_usuario() cascade;
drop function if exists fn_log_status_pedido() cascade;
drop function if exists fn_touch_updated_at() cascade;
drop function if exists perfil_atual() cascade;
drop function if exists is_admin_atual() cascade;
drop function if exists pedidos_pendentes_gestor() cascade;

drop type if exists status_pedido cascade;
drop type if exists perfil_usuario cascade;

create extension if not exists pgcrypto;

-- ── Tipos ─────────────────────────────────────────────────────────

create type perfil_usuario as enum ('colaborador', 'compras', 'gestor', 'financeiro');

create type status_pedido as enum (
  'aguardando_cotacao',
  'em_cotacao',
  'aguardando_aprovacao_orcamento',
  'rejeitado_orcamento',
  'aguardando_aprovacao_financeira',
  'rejeitado_financeiro',
  'aprovado_compra',
  'encaminhado_erp',
  'concluido',
  'cancelado'
);

-- ── Tabelas de apoio ──────────────────────────────────────────────

create table empresas (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  created_at timestamptz not null default now()
);

create table setores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  empresa_id uuid not null references empresas(id),
  created_at timestamptz not null default now()
);

create table naturezas_pedido (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique
);

insert into naturezas_pedido (nome) values
  ('Compra de produto'),
  ('Contratação de serviço'),
  ('Vistos, passagens e hospedagens'),
  ('Outros');

create table fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj_cpf text,
  contato text,
  email text,
  telefone text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Usuários (estende auth.users do Supabase) ────────────────────

create table usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text,
  perfil perfil_usuario not null default 'colaborador',
  setor_id uuid references setores(id),
  empresa_id uuid references empresas(id),
  ativo boolean not null default true,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Cria automaticamente a linha em `usuarios` quando alguém se cadastra no
-- Supabase Auth. Perfil inicial é sempre 'colaborador' — promova para
-- compras/gestor/financeiro manualmente (SQL Editor) depois do cadastro.
create or replace function fn_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nome, email, perfil)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', new.email), new.email, 'colaborador');
  return new;
end;
$$;

create trigger trg_novo_usuario
  after insert on auth.users
  for each row execute function fn_novo_usuario();

-- Preenche `usuarios` para quem já tinha se cadastrado no Auth antes desta
-- execução do script (o gatilho acima só pega cadastros novos).
insert into public.usuarios (id, nome, email, perfil)
select id, coalesce(raw_user_meta_data ->> 'nome', email), email, 'colaborador'
from auth.users
on conflict (id) do nothing;

-- Define qual Gestor é responsável por aprovar pedidos de um Setor dentro
-- de uma Empresa específica (uma mesma pessoa pode ser gestora de vários
-- setores/empresas; um setor pode ter gestores diferentes por empresa).
-- Precisa vir depois de `usuarios` porque referencia essa tabela.
create table setores_empresas (
  id uuid primary key default gen_random_uuid(),
  setor_id uuid not null references setores(id),
  empresa_id uuid not null references empresas(id),
  gestor_id uuid references usuarios(id),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (setor_id, empresa_id)
);

-- ── Pedido de Compra ──────────────────────────────────────────────

create table pedidos_compra (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity,
  descricao_item text not null,
  quantidade numeric not null check (quantidade > 0),
  valor_estimado numeric not null check (valor_estimado > 0),
  natureza_pedido_id uuid not null references naturezas_pedido(id),
  fornecedor_sugerido text,
  cnpj_fornecedor text,
  justificativa text not null,
  observacao text,
  status status_pedido not null default 'aguardando_cotacao',
  aprovacao_orcamento_pulada boolean not null default false,
  solicitante_id uuid not null references usuarios(id),
  setor_id uuid references setores(id),
  empresa_id uuid references empresas(id),
  data_solicitacao date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Cotação (orçamento vinculado ao pedido) ──────────────────────

create table cotacoes (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos_compra(id) on delete cascade,
  fornecedor_id uuid references fornecedores(id),
  valor numeric not null check (valor > 0),
  data_entrega date,
  forma_pagamento text,
  observacao text,
  criado_por uuid references usuarios(id),
  created_at timestamptz not null default now()
);

-- ── Histórico de status (auditoria, preenchido automaticamente) ──

create table historico_status (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos_compra(id) on delete cascade,
  etapa text not null,
  status_anterior status_pedido,
  novo_status status_pedido not null,
  usuario_id uuid references usuarios(id),
  observacao text,
  created_at timestamptz not null default now()
);

-- ── Trigger: gera histórico automaticamente a cada troca de status ─

-- Mantém updated_at em dia (roda ANTES de gravar, pois só assim consegue
-- alterar a linha que está sendo salva).
create or replace function fn_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_touch_updated_at
  before update on pedidos_compra
  for each row execute function fn_touch_updated_at();

-- Grava o histórico DEPOIS que o pedido já existe de fato na tabela
-- (senão a chave estrangeira pedido_id falha, porque na fase BEFORE a
-- linha ainda não foi gravada).
create or replace function fn_log_status_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.historico_status (pedido_id, etapa, status_anterior, novo_status, usuario_id, observacao)
    values (new.id, 'Criação', null, new.status, new.solicitante_id, 'Pedido criado.');
  elsif (tg_op = 'UPDATE' and old.status is distinct from new.status) then
    insert into public.historico_status (pedido_id, etapa, status_anterior, novo_status, usuario_id)
    values (new.id, 'Mudança de status', old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger trg_log_status_pedido
  after insert or update on pedidos_compra
  for each row execute function fn_log_status_pedido();

-- ── RLS ───────────────────────────────────────────────────────────

alter table usuarios enable row level security;
alter table empresas enable row level security;
alter table setores enable row level security;
alter table naturezas_pedido enable row level security;
alter table fornecedores enable row level security;
alter table pedidos_compra enable row level security;
alter table cotacoes enable row level security;
alter table historico_status enable row level security;

create or replace function perfil_atual()
returns perfil_usuario
language sql
security definer
stable
set search_path = public
as $$
  select perfil from public.usuarios where id = auth.uid();
$$;

create or replace function is_admin_atual()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from public.usuarios where id = auth.uid()), false);
$$;

-- Tabelas de referência: leitura livre para autenticados
create policy "leitura_autenticados_usuarios" on usuarios for select to authenticated using (true);
create policy "leitura_autenticados_empresas" on empresas for select to authenticated using (true);
create policy "leitura_autenticados_setores" on setores for select to authenticated using (true);
create policy "leitura_autenticados_naturezas" on naturezas_pedido for select to authenticated using (true);
create policy "leitura_autenticados_fornecedores" on fornecedores for select to authenticated using (true);
create policy "escrita_compras_fornecedores" on fornecedores for insert to authenticated
  with check (perfil_atual() in ('compras', 'gestor'));
create policy "usuario_edita_proprio_perfil" on usuarios for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "admin_edita_qualquer_usuario" on usuarios for update to authenticated
  using (is_admin_atual()) with check (is_admin_atual());

-- Pedidos: todos autenticados enxergam todos os pedidos (ferramenta interna),
-- mas só quem tem o perfil certo, no status certo, pode alterar.
create policy "leitura_pedidos" on pedidos_compra for select to authenticated using (true);

create policy "colaborador_cria_pedido" on pedidos_compra for insert to authenticated
  with check (solicitante_id = auth.uid());

create policy "solicitante_cancela_proprio" on pedidos_compra for update to authenticated
  using (solicitante_id = auth.uid() and status not in ('concluido', 'cancelado', 'encaminhado_erp'))
  with check (solicitante_id = auth.uid());

create policy "compras_gerencia_cotacao" on pedidos_compra for update to authenticated
  using (perfil_atual() = 'compras' and status in ('aguardando_cotacao', 'em_cotacao', 'rejeitado_orcamento', 'rejeitado_financeiro'))
  with check (perfil_atual() = 'compras');

-- Gestor só aprova pedidos do Setor+Empresa em que ele é o responsável
-- designado (tabela setores_empresas) — não qualquer pedido pendente.
-- Admin tem uma válvula de escape para destravar pedidos "órfãos" (sem
-- setor/empresa configurados, ou sem gestor designado ainda).
create policy "gestor_aprova_orcamento" on pedidos_compra for update to authenticated
  using (
    perfil_atual() = 'gestor'
    and status = 'aguardando_aprovacao_orcamento'
    and (
      is_admin_atual()
      or exists (
        select 1 from setores_empresas se
        where se.setor_id = pedidos_compra.setor_id
          and se.empresa_id = pedidos_compra.empresa_id
          and se.gestor_id = auth.uid()
          and se.ativo
      )
    )
  )
  with check (perfil_atual() = 'gestor');

create policy "financeiro_aprova" on pedidos_compra for update to authenticated
  using (perfil_atual() = 'financeiro' and status = 'aguardando_aprovacao_financeira')
  with check (perfil_atual() = 'financeiro');

-- Setores × Empresas × Gestor responsável: leitura livre (a tela de Novo
-- Pedido e a de admin precisam ler), escrita só para admin.
alter table setores_empresas enable row level security;
create policy "leitura_autenticados_setores_empresas" on setores_empresas for select to authenticated using (true);
create policy "admin_escreve_setores_empresas" on setores_empresas for insert to authenticated
  with check (is_admin_atual());
create policy "admin_atualiza_setores_empresas" on setores_empresas for update to authenticated
  using (is_admin_atual()) with check (is_admin_atual());

-- Cadastros administrativos: leitura livre, escrita só para admin.
create policy "admin_escreve_empresas" on empresas for insert to authenticated
  with check (is_admin_atual());
create policy "admin_atualiza_empresas" on empresas for update to authenticated
  using (is_admin_atual()) with check (is_admin_atual());
create policy "admin_escreve_setores" on setores for insert to authenticated
  with check (is_admin_atual());
create policy "admin_atualiza_setores" on setores for update to authenticated
  using (is_admin_atual()) with check (is_admin_atual());

-- Lista, para o Gestor logado, só os pedidos que ele realmente pode
-- aprovar (mesma regra da policy de UPDATE acima, exposta para leitura
-- em lista — evita mostrar na tela pedidos que a RLS depois recusaria).
create or replace function pedidos_pendentes_gestor()
returns setof pedidos_compra
language sql
stable
security invoker
set search_path = public
as $$
  select p.* from pedidos_compra p
  where p.status = 'aguardando_aprovacao_orcamento'
    and (
      is_admin_atual()
      or exists (
        select 1 from setores_empresas se
        where se.setor_id = p.setor_id
          and se.empresa_id = p.empresa_id
          and se.gestor_id = auth.uid()
          and se.ativo
      )
    );
$$;

-- Cotações
create policy "leitura_cotacoes" on cotacoes for select to authenticated using (true);
create policy "compras_cria_cotacao" on cotacoes for insert to authenticated
  with check (perfil_atual() = 'compras');

-- Histórico: leitura livre. A entrada de "mudança de status" vem sempre do
-- trigger (garantida mesmo se a UI falhar). Além dela, o usuário autenticado
-- pode inserir uma entrada de comentário própria (ex.: motivo de rejeição).
create policy "leitura_historico" on historico_status for select to authenticated using (true);
create policy "usuario_comenta_historico" on historico_status for insert to authenticated
  with check (usuario_id = auth.uid());

-- ── Relatórios ────────────────────────────────────────────────────
-- Uma linha por pedido, já com os nomes de quem criou, orçou e aprovou
-- (gestor e financeiro) prontos — evita montar isso na mão no frontend.
-- security_invoker faz a view respeitar a RLS de quem está consultando,
-- em vez das permissões de quem criou a view.
create or replace view relatorio_pedidos
with (security_invoker = true)
as
select
  p.id,
  p.numero,
  p.descricao_item,
  p.quantidade,
  p.valor_estimado,
  p.status,
  p.data_solicitacao,
  p.created_at,
  p.updated_at,
  sol.id as solicitante_id,
  sol.nome as solicitante_nome,
  emp.razao_social as empresa_nome,
  st.nome as setor_nome,
  nat.nome as natureza_nome,
  (
    select u.id from cotacoes c join usuarios u on u.id = c.criado_por
    where c.pedido_id = p.id order by c.created_at desc limit 1
  ) as orcado_por_id,
  (
    select u.nome from cotacoes c join usuarios u on u.id = c.criado_por
    where c.pedido_id = p.id order by c.created_at desc limit 1
  ) as orcado_por_nome,
  (
    select u.id from historico_status h join usuarios u on u.id = h.usuario_id
    where h.pedido_id = p.id and h.novo_status = 'aguardando_aprovacao_financeira'
    order by h.created_at desc limit 1
  ) as aprovado_gestor_id,
  (
    select u.nome from historico_status h join usuarios u on u.id = h.usuario_id
    where h.pedido_id = p.id and h.novo_status = 'aguardando_aprovacao_financeira'
    order by h.created_at desc limit 1
  ) as aprovado_gestor_nome,
  (
    select u.id from historico_status h join usuarios u on u.id = h.usuario_id
    where h.pedido_id = p.id and h.novo_status = 'aprovado_compra'
    order by h.created_at desc limit 1
  ) as aprovado_financeiro_id,
  (
    select u.nome from historico_status h join usuarios u on u.id = h.usuario_id
    where h.pedido_id = p.id and h.novo_status = 'aprovado_compra'
    order by h.created_at desc limit 1
  ) as aprovado_financeiro_nome
from pedidos_compra p
left join usuarios sol on sol.id = p.solicitante_id
left join empresas emp on emp.id = p.empresa_id
left join setores st on st.id = p.setor_id
left join naturezas_pedido nat on nat.id = p.natureza_pedido_id;

grant select on relatorio_pedidos to authenticated;

-- Adiciona a tela de Administração (promover perfil / ativar-desativar
-- usuário) sem depender do SQL Editor no dia a dia.
-- Rodar no SQL Editor do Supabase DEPOIS do schema.sql. Seguro de rodar
-- mais de uma vez.

alter table usuarios add column if not exists is_admin boolean not null default false;
alter table usuarios add column if not exists email text;

-- Backfill do e-mail para quem já existia antes desta coluna.
update usuarios u set email = a.email
from auth.users a
where a.id = u.id and u.email is null;

-- Passa a gravar o e-mail também para cadastros novos (mesmo gatilho de
-- sempre, só que agora também grava o e-mail).
create or replace function fn_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nome, perfil, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', new.email), 'colaborador', new.email);
  return new;
end;
$$;

-- Mesmo padrão de perfil_atual(): função security definer pra checar
-- is_admin sem cair em recursão de RLS dentro de uma policy da própria
-- tabela usuarios.
create or replace function admin_atual()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from public.usuarios where id = auth.uid()), false);
$$;

-- Admin pode alterar qualquer usuário (perfil, ativo, nome, setor, empresa,
-- is_admin). A policy "usuario_edita_proprio_perfil" que já existe no
-- schema.sql continua valendo em paralelo — múltiplas policies permissivas
-- na mesma tabela se combinam com OR, então vale "é o próprio dono OU é
-- admin".
create policy "admin_gerencia_usuarios" on usuarios for update to authenticated
  using (admin_atual()) with check (admin_atual());

-- ── Promova o primeiro admin ──────────────────────────────────────
-- Troque pelo seu e-mail de login e rode manualmente (só uma vez):
--
--   update usuarios set is_admin = true where email = 'seu-email@aqui.com';

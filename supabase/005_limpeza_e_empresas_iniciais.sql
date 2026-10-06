-- Migração 005 — limpeza dos dados de teste + empresas iniciais + numeração zerada.
-- Rodar UMA vez no SQL Editor do Supabase, numa aba nova, depois do 004.
--
-- O que faz (tudo numa transação: se qualquer passo falhar, nada é aplicado):
--   1) Apaga os pedidos de teste Nº 1, 3, 4, 6, 7 e 8 (cotações e histórico
--      deles vão junto, por cascata). A lista é explícita de propósito: um
--      pedido real criado depois disso NÃO é apagado.
--   2) Apaga a empresa/setor/vínculo de teste e o fornecedor "FORNECEDOR TEMPORARIO".
--   3) Cadastra as 4 empresas iniciais (não duplica se rodar de novo).
--   4) Se não sobrar nenhum pedido, zera a numeração: o próximo será o Nº 1.
--
-- Não mexe em: usuários (só desvincula empresa/setor de teste), naturezas,
-- estrutura, policies e funções.
--
-- Os arquivos de anexo ficam no Storage e NÃO são apagados por SQL. Se algum
-- pedido de teste teve anexo, apague pelo painel: Storage > anexos-cotacoes.
--
-- Prévia opcional (só leitura), para conferir antes de rodar:
--   select numero, descricao_item, status from pedidos_compra order by numero;

begin;

-- 1) Pedidos de teste
delete from pedidos_compra where numero in (1, 3, 4, 6, 7, 8);

-- 2) Empresa, setor e vínculo de gestor de teste; fornecedor de teste
update usuarios set empresa_id = null, setor_id = null
  where empresa_id in (select id from empresas where razao_social = 'Empresa Renomeada Teste')
     or setor_id   in (select id from setores where nome = 'Setor Teste');
delete from setores_empresas where setor_id in (select id from setores where nome = 'Setor Teste');
delete from setores where nome = 'Setor Teste';
delete from empresas where razao_social = 'Empresa Renomeada Teste';
delete from fornecedores where nome = 'FORNECEDOR TEMPORARIO';

-- 3) Empresas iniciais
insert into empresas (razao_social)
select v.nome
from (values
  ('Ndace Assessoria'),
  ('NDI Distribuição'),
  ('Mota Construtora'),
  ('AYA Construtora')
) as v(nome)
where not exists (select 1 from empresas e where e.razao_social = v.nome);

-- 4) Zera a numeração, mas só se a tabela de pedidos estiver mesmo vazia
do $$
begin
  if (select count(*) from public.pedidos_compra) = 0 then
    execute 'alter table public.pedidos_compra alter column numero restart with 1';
  end if;
end $$;

-- Conferência do resultado
select
  (select count(*) from pedidos_compra)    as pedidos,
  (select count(*) from cotacoes)          as cotacoes,
  (select count(*) from historico_status)  as historicos,
  (select count(*) from fornecedores)      as fornecedores,
  (select count(*) from empresas)          as empresas,
  (select count(*) from setores)           as setores;

commit;

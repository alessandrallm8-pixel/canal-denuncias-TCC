alter table denuncias
  add column if not exists nome_empresa varchar(160),
  add column if not exists setor varchar(120),
  add column if not exists local varchar(160);

update denuncias
set
  nome_empresa = coalesce(nullif(nome_empresa, ''), 'Nao informado'),
  setor = coalesce(nullif(setor, ''), local_setor),
  local = coalesce(nullif(local, ''), local_setor)
where nome_empresa is null
   or setor is null
   or local is null;

alter table denuncias
  alter column nome_empresa set not null,
  alter column setor set not null,
  alter column local set not null;

alter table denuncias
  drop column if exists local_setor;

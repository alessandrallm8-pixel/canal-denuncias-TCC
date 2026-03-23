create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'denuncia_status') then
    create type denuncia_status as enum ('aberta', 'em_analise', 'resolvida');
  end if;
end
$$;

create table if not exists usuarios_admin (
  id uuid primary key default gen_random_uuid(),
  nome varchar(120) not null,
  email varchar(180) not null unique,
  perfil varchar(40) not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists denuncias (
  id uuid primary key default gen_random_uuid(),
  protocolo varchar(40) not null unique,
  anonima boolean not null,
  nome_denunciante varchar(140),
  email_denunciante varchar(180),
  nome_empresa varchar(160) not null,
  setor varchar(120) not null,
  descricao text not null,
  tipo_ocorrencia varchar(120) not null,
  local varchar(160) not null,
  data_ocorrencia_aprox date,
  status denuncia_status not null default 'aberta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_denuncias_identificacao
    check (
      (anonima = true and nome_denunciante is null and email_denunciante is null)
      or
      (anonima = false)
    )
);

create table if not exists anexos_denuncia (
  id uuid primary key default gen_random_uuid(),
  denuncia_id uuid not null,
  arquivo_url text not null,
  arquivo_nome varchar(240) not null,
  mime_type varchar(80) not null,
  created_at timestamptz not null default now(),
  constraint fk_anexos_denuncia_denuncia
    foreign key (denuncia_id) references denuncias(id) on delete cascade
);

create table if not exists tratativas (
  id uuid primary key default gen_random_uuid(),
  denuncia_id uuid not null,
  admin_id uuid,
  descricao text not null,
  created_at timestamptz not null default now(),
  constraint fk_tratativas_denuncia
    foreign key (denuncia_id) references denuncias(id) on delete cascade,
  constraint fk_tratativas_admin
    foreign key (admin_id) references usuarios_admin(id) on delete set null
);

create table if not exists historico_denuncia (
  id uuid primary key default gen_random_uuid(),
  denuncia_id uuid not null,
  evento varchar(80) not null,
  detalhes text,
  ator_tipo varchar(20) not null,
  ator_id uuid,
  created_at timestamptz not null default now(),
  constraint fk_historico_denuncia_denuncia
    foreign key (denuncia_id) references denuncias(id) on delete cascade,
  constraint fk_historico_denuncia_ator
    foreign key (ator_id) references usuarios_admin(id) on delete set null
);

create index if not exists idx_denuncias_status_created_at
  on denuncias(status, created_at desc);

create index if not exists idx_historico_denuncia_denuncia_created_at
  on historico_denuncia(denuncia_id, created_at desc);

create index if not exists idx_tratativas_denuncia_created_at
  on tratativas(denuncia_id, created_at desc);

create or replace function set_denuncias_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_denuncias_updated_at on denuncias;

create trigger trg_denuncias_updated_at
before update on denuncias
for each row
execute function set_denuncias_updated_at();

create or replace function transition_denuncia_status(
  p_denuncia_id uuid,
  p_novo_status denuncia_status,
  p_ator_tipo varchar,
  p_ator_id uuid,
  p_detalhes text
)
returns void
language plpgsql
as $$
declare
  v_status_atual denuncia_status;
begin
  select status
    into v_status_atual
  from denuncias
  where id = p_denuncia_id
  for update;

  if v_status_atual is null then
    raise exception 'DENUNCIA_NAO_ENCONTRADA';
  end if;

  if not (
    (v_status_atual = 'aberta' and p_novo_status = 'em_analise')
    or
    (v_status_atual = 'em_analise' and p_novo_status = 'resolvida')
  ) then
    raise exception 'TRANSICAO_STATUS_INVALIDA';
  end if;

  update denuncias
  set status = p_novo_status
  where id = p_denuncia_id;

  insert into historico_denuncia (denuncia_id, evento, detalhes, ator_tipo, ator_id)
  values (p_denuncia_id, 'status_alterado', p_detalhes, p_ator_tipo, p_ator_id);
end;
$$;

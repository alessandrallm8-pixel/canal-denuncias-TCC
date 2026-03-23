create or replace function prevent_historico_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'HISTORICO_APPEND_ONLY';
end;
$$;

drop trigger if exists trg_historico_denuncia_no_update on historico_denuncia;
drop trigger if exists trg_historico_denuncia_no_delete on historico_denuncia;

create trigger trg_historico_denuncia_no_update
before update on historico_denuncia
for each row
execute function prevent_historico_mutation();

create trigger trg_historico_denuncia_no_delete
before delete on historico_denuncia
for each row
execute function prevent_historico_mutation();

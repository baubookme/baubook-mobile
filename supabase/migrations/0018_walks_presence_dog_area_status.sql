-- BauBook 0.6.0 - Walks presence dog area status
-- Aggiunge lo status presenza dog_area senza cambiare schema tabelle.
-- Richiede che la migration 0017_walks_presence_active_per_type.sql sia gia applicata.

begin;

do $$
declare
  target_proc regprocedure;
  fn_def text;
  new_def text;
  changed boolean;
begin
  foreach target_proc in array array[
    'public.create_or_refresh_presence_session(uuid,uuid,text,text,integer)'::regprocedure,
    'public.update_my_active_presence_session(uuid,uuid,text,text,integer)'::regprocedure
  ]
  loop
    select pg_get_functiondef(target_proc) into fn_def;
    new_def := fn_def;

    if position('dog_area' in new_def) = 0 then
      changed := false;

      new_def := replace(
        new_def,
        'status_input in (''available'', ''walking'', ''playing'')',
        'status_input in (''available'', ''walking'', ''playing'', ''dog_area'')'
      );
      changed := changed or new_def <> fn_def;

      if not changed then
        new_def := replace(
          new_def,
          'status_input in (''available'',''walking'',''playing'')',
          'status_input in (''available'',''walking'',''playing'',''dog_area'')'
        );
        changed := changed or new_def <> fn_def;
      end if;

      if not changed then
        raise exception 'Pattern status_input non trovato nella funzione %. Interrompo per evitare modifiche cieche.', target_proc::text;
      end if;

      execute new_def;
    end if;
  end loop;
end $$;

grant execute on function public.create_or_refresh_presence_session(uuid, uuid, text, text, integer) to authenticated;
grant execute on function public.update_my_active_presence_session(uuid, uuid, text, text, integer) to authenticated;

commit;

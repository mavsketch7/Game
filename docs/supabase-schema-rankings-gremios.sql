-- Rankings globales de gremios (Punto 6 de la mejora de UX multijugador).
-- Depende del esquema de gremios ya aplicado (supabase-schema-gremios.sql).
-- Ejecutar en Supabase: Dashboard -> SQL Editor -> New query -> pegar y "Run".

alter table guilds add column if not exists total_dano bigint not null default 0;
alter table guilds add column if not exists total_derrotados bigint not null default 0;
alter table guilds add column if not exists total_parries bigint not null default 0;

-- Incremento atómico de los totales de un gremio al terminar una partida.
-- SECURITY DEFINER: se ejecuta con permisos de propietario, así que puede
-- actualizar "guilds" aunque esa tabla no tenga una política de UPDATE
-- pública -- solo se permite sumar (nunca restar ni tocar el nombre) a
-- través de esta función, no editar filas libremente.
create or replace function submit_guild_run(
  p_guild_id uuid,
  p_dano bigint,
  p_derrotados bigint,
  p_parries bigint
)
returns void
language sql
security definer
set search_path = public
as $$
  update guilds
  set total_dano = total_dano + greatest(p_dano, 0),
      total_derrotados = total_derrotados + greatest(p_derrotados, 0),
      total_parries = total_parries + greatest(p_parries, 0)
  where id = p_guild_id;
$$;

grant execute on function submit_guild_run(uuid, bigint, bigint, bigint) to anon;

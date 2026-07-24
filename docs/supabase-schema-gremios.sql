-- Esquema del sistema de gremios (Punto 4 de la mejora de UX multijugador).
-- Ejecutar en Supabase: Dashboard -> SQL Editor -> New query -> pegar y "Run".

create table if not exists guilds (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  tag text,
  created_at timestamptz not null default now(),
  constraint guilds_name_length check (char_length(name) between 3 and 24),
  constraint guilds_tag_length check (tag is null or char_length(tag) <= 5)
);

-- Un jugador (identificado por un id anónimo persistido en su navegador,
-- ya que el juego no tiene login) pertenece como máximo a un gremio a la vez.
create table if not exists guild_members (
  player_id uuid primary key,
  guild_id uuid not null references guilds(id) on delete cascade,
  player_name text,
  joined_at timestamptz not null default now()
);

alter table guilds enable row level security;
alter table guild_members enable row level security;

-- Lectura pública: necesaria para listar/mostrar gremios y su membresía en
-- el lobby y en los futuros rankings (punto 6).
create policy "guilds_select_all" on guilds for select using (true);
create policy "guild_members_select_all" on guild_members for select using (true);

-- Cualquiera puede crear un gremio; el nombre único evita duplicados.
create policy "guilds_insert_all" on guilds for insert with check (true);

-- Cualquiera puede crear/actualizar/borrar SU PROPIA fila de membresía.
-- Nota de seguridad: sin login real no hay forma de verificar
-- criptográficamente que "player_id" es quien dice ser -- es la
-- contrapartida aceptada al elegir identidad anónima por dispositivo en
-- vez de cuentas con email/contraseña. No hay datos sensibles en juego
-- (solo nombre de jugador y afiliación de gremio).
create policy "guild_members_insert_all" on guild_members for insert with check (true);
create policy "guild_members_update_all" on guild_members for update using (true);
create policy "guild_members_delete_all" on guild_members for delete using (true);

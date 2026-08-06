import { supabase } from "../net/supabaseClient.js";

async function unirseGremioPorId(guildId, playerId, playerName) {
  const { error } = await supabase
    .from("guild_members")
    .upsert({ player_id: playerId, guild_id: guildId, player_name: playerName });
  if (error) throw error;
}

async function buscarGremioPorNombre(nombre) {
  const { data, error } = await supabase
    .from("guilds")
    .select("id, name, tag")
    .ilike("name", nombre.trim())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function crearGremio(nombre, playerId, playerName) {
  const nombreLimpio = (nombre || "").trim().slice(0, 24);
  if (nombreLimpio.length < 3)
    throw new Error("El nombre del gremio debe tener al menos 3 letras");
  const { data: guild, error } = await supabase
    .from("guilds")
    .insert({ name: nombreLimpio })
    .select("id, name, tag")
    .single();
  if (error) {
    if (error.code === "23505") throw new Error("Ya existe un gremio con ese nombre");
    throw error;
  }
  await unirseGremioPorId(guild.id, playerId, playerName);
  return guild;
}

export async function unirseGremio(nombre, playerId, playerName) {
  const g = await buscarGremioPorNombre(nombre);
  if (!g) throw new Error("No existe ningún gremio con ese nombre");
  await unirseGremioPorId(g.id, playerId, playerName);
  return g;
}

export async function salirGremio(playerId) {
  const { error } = await supabase.from("guild_members").delete().eq("player_id", playerId);
  if (error) throw error;
}

export async function miGremio(playerId) {
  const { data, error } = await supabase
    .from("guild_members")
    .select("guild_id, guilds(name, tag)")
    .eq("player_id", playerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: data.guild_id, name: data.guilds.name, tag: data.guilds.tag };
}

// Suma las estadísticas de una partida terminada a los totales globales del
// gremio (incremento atómico vía RPC, ver docs/supabase-schema-rankings-gremios.sql).
export async function enviarStatsGremio(guildId, dano, derrotados, parries) {
  if (!guildId) return;
  const { error } = await supabase.rpc("submit_guild_run", {
    p_guild_id: guildId,
    p_dano: Math.max(0, Math.round(dano || 0)),
    p_derrotados: Math.max(0, Math.round(derrotados || 0)),
    p_parries: Math.max(0, Math.round(parries || 0)),
  });
  if (error) throw error;
}

// Top gremios por daño total acumulado entre todas las partidas.
export async function rankingGremios(limite) {
  const { data, error } = await supabase
    .from("guilds")
    .select("name, tag, total_dano, total_derrotados, total_parries")
    .order("total_dano", { ascending: false })
    .limit(limite || 20);
  if (error) throw error;
  return data || [];
}

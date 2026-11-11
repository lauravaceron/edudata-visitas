import { db } from './local-db';
import { encolar } from './sync';
import { supabase } from './supabase';
import type { ArchivoDocentes, EspacioSede, Institucion, Integrante, Sede, Tabla, TipoEspacio } from './types';
import { normTipo } from '../shared/texto';

export const nuevoId = () => crypto.randomUUID();

async function guardar<T extends { id: string }>(tabla: Tabla, fila: T) {
  await db.table(tabla).put(fila);
  await encolar(tabla, 'upsert', fila.id, fila as unknown as Record<string, unknown>);
}
async function borrar(tabla: Tabla, id: string) {
  await db.table(tabla).delete(id);
  await encolar(tabla, 'delete', id);
}

/* ---------- Instituciones y sedes ---------- */
export async function actualizarIE(id: string, cambios: Partial<Institucion>) {
  const ie = await db.instituciones.get(id);
  if (ie) await guardar('instituciones', { ...ie, ...cambios });
}
export async function crearIE(nombre: string, comuna_id: string, sedes: string[], dane: string | null = null) {
  const ie: Institucion = { id: nuevoId(), nombre, comuna_id, dane, fecha_visita: null, registrado_por: null, atendio: null, notas: '' };
  await guardar('instituciones', ie);
  for (let i = 0; i < sedes.length; i++) await crearSede(ie.id, sedes[i], i === 0, i);
  return ie;
}
export async function crearSede(institucion_id: string, nombre: string, principal: boolean, orden: number) {
  const s: Sede = { id: nuevoId(), institucion_id, nombre, principal, bloques: 0, internet_mbps: null, computadores: null, orden };
  await guardar('sedes', s);
  return s;
}
export async function actualizarSede(id: string, cambios: Partial<Sede>) {
  const s = await db.sedes.get(id);
  if (s) await guardar('sedes', { ...s, ...cambios });
}

/* ---------- Espacios ---------- */
export async function agregarEspacio(sede_id: string, tipo_espacio_id: string) {
  const e: EspacioSede = { id: nuevoId(), sede_id, tipo_espacio_id };
  await guardar('espacios', e);
}
export const quitarEspacio = (id: string) => borrar('espacios', id);

/** Busca un tipo con ese nombre; si no existe, lo crea como "nuevo, por revisar". */
export async function tipoPorNombre(nombre: string, categoria_id: string, ieNombre: string) {
  const limpio = nombre.trim().replace(/^./, (c) => c.toUpperCase());
  const todos = await db.tipos.toArray();
  const existe = todos.find((t) => normTipo(t.nombre) === normTipo(limpio));
  if (existe) return existe;
  const t: TipoEspacio = { id: nuevoId(), nombre: limpio, categoria_id, oficial: false, creado_en_ie: ieNombre };
  await guardar('tipos', t);
  return t;
}
export async function aprobarTipo(id: string) {
  const t = await db.tipos.get(id);
  if (t) await guardar('tipos', { ...t, oficial: true });
}
/** Une un tipo repetido con otro: pasa sus espacios al tipo destino y lo elimina. */
export async function unirTipos(desde: string, hacia: string) {
  const es = await db.espacios.where('tipo_espacio_id').equals(desde).toArray();
  for (const e of es) await guardar('espacios', { ...e, tipo_espacio_id: hacia });
  await borrar('tipos', desde);
}

/* ---------- Equipo ---------- */
export const guardarIntegrante = (i: Integrante) => guardar('equipo', i);
export const quitarIntegrante = (id: string) => borrar('equipo', id);

/* ---------- Excel de docentes (necesita internet) ---------- */
export async function subirDocentes(ie: Institucion, file: File) {
  const anterior = await db.archivos.where('institucion_id').equals(ie.id).first();
  const seguro = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_');
  const ruta = `${ie.id}/${Date.now()}-${seguro}`;
  const { error } = await supabase.storage.from('docentes').upload(ruta, file, { upsert: true });
  if (error) throw new Error(error.message);
  if (anterior) await supabase.storage.from('docentes').remove([anterior.ruta_archivo]);
  const a: ArchivoDocentes = {
    id: anterior?.id ?? nuevoId(), institucion_id: ie.id, ruta_archivo: ruta, nombre: file.name,
    tamano: file.size, subido_en: new Date().toISOString(),
  };
  await guardar('archivos', a);
}
export async function quitarDocentes(a: ArchivoDocentes) {
  await supabase.storage.from('docentes').remove([a.ruta_archivo]);
  await borrar('archivos', a.id);
}
export async function enlaceDocentes(a: ArchivoDocentes) {
  const { data, error } = await supabase.storage.from('docentes').createSignedUrl(a.ruta_archivo, 120, { download: a.nombre });
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

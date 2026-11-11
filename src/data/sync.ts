import { useSyncExternalStore } from 'react';
import { db } from './local-db';
import { supabase } from './supabase';
import { REMOTA, type Op, type Tabla } from './types';

export type EstadoSync = {
  online: boolean;
  pendientes: number;
  sincronizando: boolean;
  fallidos: number;
  error: string | null;
  ultima: number | null;
};

let estado: EstadoSync = {
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  pendientes: 0,
  sincronizando: false,
  fallidos: 0,
  error: null,
  ultima: null,
};
const oyentes = new Set<() => void>();
function cambiar(p: Partial<EstadoSync>) {
  estado = { ...estado, ...p };
  oyentes.forEach((f) => f());
}
export function useSync(): EstadoSync {
  return useSyncExternalStore(
    (f) => { oyentes.add(f); return () => oyentes.delete(f); },
    () => estado,
  );
}

/** Guarda un cambio para subirlo. Si ya había uno pendiente de la misma fila, lo reemplaza. */
export async function encolar(tabla: Tabla, tipo: Op['tipo'], fila_id: string, datos?: Record<string, unknown>) {
  await db.transaction('rw', db.outbox, async () => {
    if (tipo === 'upsert') {
      const previos = await db.outbox.where('fila_id').equals(fila_id).filter((o) => o.tabla === tabla && o.tipo === 'upsert').primaryKeys();
      // Solo se reemplaza si es el último cambio de la cola (para no alterar el orden de creación)
      const ultimo = await db.outbox.orderBy('id').last();
      if (previos.length && ultimo && previos.includes(ultimo.id!)) {
        await db.outbox.update(ultimo.id!, { datos, ts: Date.now() });
        return;
      }
    }
    await db.outbox.add({ tabla, tipo, fila_id, datos, ts: Date.now() });
  });
  cambiar({ pendientes: await db.outbox.count() });
  programar();
}

let timer: ReturnType<typeof setTimeout> | undefined;
function programar(ms = 1500) {
  clearTimeout(timer);
  timer = setTimeout(() => { void sincronizar(); }, ms);
}

const esDeRed = (msg: string) => /fetch|network|Failed to|timeout|Load failed/i.test(msg);

async function subir() {
  const ops = await db.outbox.orderBy('id').toArray();
  for (const op of ops) {
    const tabla = REMOTA[op.tabla];
    const { error } =
      op.tipo === 'upsert'
        ? await supabase.from(tabla).upsert(sinCamposServidor(op.datos ?? {}))
        : await supabase.from(tabla).delete().eq('id', op.fila_id);
    if (error) {
      if (esDeRed(error.message)) throw new Error('sin conexión');
      // Error de datos (p. ej. nombre repetido): se descarta para no bloquear la cola
      console.warn('Cambio descartado', op, error);
      cambiar({ fallidos: estado.fallidos + 1 });
    }
    await db.outbox.delete(op.id!);
    cambiar({ pendientes: await db.outbox.count() });
  }
}

function sinCamposServidor(d: Record<string, unknown>) {
  const { updated_at: _u, ...resto } = d;
  void _u;
  return resto;
}

async function traerTodo(tabla: string) {
  const filas: Record<string, unknown>[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase.from(tabla).select('*').range(desde, desde + 999);
    if (error) throw new Error(error.message);
    filas.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return filas;
}

async function bajar() {
  const nombres = Object.keys(REMOTA) as Tabla[];
  const datos = await Promise.all(nombres.map((t) => traerTodo(REMOTA[t])));
  // Si mientras bajábamos alguien editó localmente, no pisamos sus cambios
  if ((await db.outbox.count()) > 0) return;
  await db.transaction('rw', nombres.map((t) => db.table(t)), async () => {
    for (let i = 0; i < nombres.length; i++) {
      const t = db.table(nombres[i]);
      await t.clear();
      await t.bulkPut(datos[i]);
    }
  });
}

let corriendo = false;
export async function sincronizar() {
  if (corriendo) return;
  if (!navigator.onLine) { cambiar({ online: false }); return; }
  corriendo = true;
  cambiar({ sincronizando: true, online: true });
  try {
    await subir();
    await bajar();
    cambiar({ error: null, ultima: Date.now() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const red = esDeRed(msg) || msg === 'sin conexión';
    cambiar({ error: red ? null : msg, online: navigator.onLine && !red });
  } finally {
    corriendo = false;
    cambiar({ sincronizando: false, pendientes: await db.outbox.count() });
  }
}

let iniciado = false;
export function iniciarSync() {
  if (iniciado) return;
  iniciado = true;
  window.addEventListener('online', () => { cambiar({ online: true }); programar(200); });
  window.addEventListener('offline', () => cambiar({ online: false }));
  setInterval(() => { void sincronizar(); }, 45000);
  void db.outbox.count().then((n) => cambiar({ pendientes: n }));
  void sincronizar();
}

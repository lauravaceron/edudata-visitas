import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/local-db';
import type { ArchivoDocentes, Categoria, Comuna, EspacioSede, Institucion, Integrante, Sede, TipoEspacio } from '../data/types';

const COMUNAS_BASE: Comuna[] = [
  ...Array.from({ length: 22 }, (_, i) => ({ id: String(i + 1), nombre: 'Comuna ' + (i + 1), orden: i + 1 })),
  { id: 'Rural', nombre: 'Zona rural', orden: 23 },
];

export type Datos = {
  comunas: Comuna[];
  ies: Institucion[];
  sedes: Sede[];
  categorias: Categoria[];
  tipos: TipoEspacio[];
  espacios: EspacioSede[];
  archivos: ArchivoDocentes[];
  equipo: Integrante[];
};

/** Todos los datos locales, siempre al día (se vuelve a leer cuando algo cambia). */
export function useDatos(): Datos | undefined {
  return useLiveQuery(async () => ({
    comunas: (await db.comunas.count()) ? (await db.comunas.toArray()).sort((a, b) => a.orden - b.orden) : COMUNAS_BASE,
    ies: (await db.instituciones.toArray()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    sedes: (await db.sedes.toArray()).sort((a, b) => Number(b.principal) - Number(a.principal) || a.orden - b.orden),
    categorias: (await db.categorias.toArray()).sort((a, b) => a.orden - b.orden),
    tipos: (await db.tipos.toArray()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    espacios: await db.espacios.toArray(),
    archivos: await db.archivos.toArray(),
    equipo: (await db.equipo.toArray()).filter((i) => i.activo),
  }), []);
}

export type Estado = 'sin' | 'curso' | 'ok';
export type Progreso = { estado: Estado; falta: string[] };

export function progreso(ie: Institucion, d: Datos): Progreso {
  const sedes = d.sedes.filter((s) => s.institucion_id === ie.id);
  const p = sedes.find((s) => s.principal) ?? sedes[0];
  const nEsp = p ? d.espacios.filter((e) => e.sede_id === p.id).length : 0;
  const h = {
    visita: !!ie.fecha_visita,
    espacios: !!(p && p.bloques > 0 && nEsp > 0),
    docentes: d.archivos.some((a) => a.institucion_id === ie.id),
  };
  const nombres = { visita: 'datos de la visita', espacios: 'espacios de la sede principal', docentes: 'Excel de docentes' };
  const falta = (Object.keys(h) as (keyof typeof h)[]).filter((k) => !h[k]).map((k) => nombres[k]);
  return { falta, estado: falta.length === 3 ? 'sin' : falta.length === 0 ? 'ok' : 'curso' };
}

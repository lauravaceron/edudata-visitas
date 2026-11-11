export type Comuna = { id: string; nombre: string; orden: number };

export type Institucion = {
  id: string;
  nombre: string;
  comuna_id: string;
  dane: string | null;
  fecha_visita: string | null;
  registrado_por: string | null;
  atendio: string | null;
  notas: string;
  updated_at?: string;
};

export type Sede = {
  id: string;
  institucion_id: string;
  nombre: string;
  principal: boolean;
  bloques: number;
  internet_mbps: number | null;
  computadores: number | null;
  orden: number;
  updated_at?: string;
};

export type Categoria = { id: string; nombre: string; color: string; prioridad: boolean; orden: number };

export type TipoEspacio = {
  id: string;
  nombre: string;
  categoria_id: string;
  oficial: boolean;
  creado_en_ie: string | null;
};

export type EspacioSede = { id: string; sede_id: string; tipo_espacio_id: string };

export type ArchivoDocentes = {
  id: string;
  institucion_id: string;
  ruta_archivo: string;
  nombre: string;
  tamano: number | null;
  subido_en: string;
};

export type Integrante = { id: string; nombre: string; activo: boolean };

/** Nombre de la tabla en la base local → nombre en Supabase */
export const REMOTA = {
  comunas: 'comunas',
  instituciones: 'instituciones',
  sedes: 'sedes',
  categorias: 'categorias_espacio',
  tipos: 'tipos_espacio',
  espacios: 'espacios_sede',
  archivos: 'archivos_docentes',
  equipo: 'equipo',
} as const;
export type Tabla = keyof typeof REMOTA;

/** Un cambio pendiente por subir a la nube */
export type Op = {
  id?: number;
  tabla: Tabla;
  tipo: 'upsert' | 'delete';
  fila_id: string;
  datos?: Record<string, unknown>;
  ts: number;
};

import Dexie, { type Table } from 'dexie';
import type { ArchivoDocentes, Categoria, Comuna, EspacioSede, Institucion, Integrante, Op, Sede, TipoEspacio } from './types';

/** Copia local de los datos: permite trabajar sin señal. */
class LocalDB extends Dexie {
  comunas!: Table<Comuna, string>;
  instituciones!: Table<Institucion, string>;
  sedes!: Table<Sede, string>;
  categorias!: Table<Categoria, string>;
  tipos!: Table<TipoEspacio, string>;
  espacios!: Table<EspacioSede, string>;
  archivos!: Table<ArchivoDocentes, string>;
  equipo!: Table<Integrante, string>;
  outbox!: Table<Op, number>;

  constructor() {
    super('edudata-visitas');
    this.version(1).stores({
      comunas: 'id',
      instituciones: 'id, comuna_id',
      sedes: 'id, institucion_id',
      categorias: 'id',
      tipos: 'id, categoria_id',
      espacios: 'id, sede_id, tipo_espacio_id',
      archivos: 'id, institucion_id',
      equipo: 'id',
      outbox: '++id, tabla, fila_id',
    });
  }
}

export const db = new LocalDB();

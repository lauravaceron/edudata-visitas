import * as XLSX from 'xlsx';
import { db } from '../../data/local-db';
import { crearIE, crearSede } from '../../data/repos';
import { comunaLbl, norm } from '../../shared/texto';
import { progreso, type Datos } from '../../shared/useDatos';

/** Descarga todo en un Excel con una hoja por tema. */
export function exportarExcel(d: Datos) {
  const C = (id: string) => comunaLbl(id);
  const tipo = (id: string) => d.tipos.find((t) => t.id === id);
  const cat = (id?: string) => d.categorias.find((c) => c.id === id)?.nombre ?? '';
  const ieDe = (id: string) => d.ies.find((i) => i.id === id)!;

  const hojaIE = d.ies.map((ie) => {
    const p = progreso(ie, d);
    return {
      Comuna: C(ie.comuna_id), IE: ie.nombre, 'Código DANE': ie.dane ?? '',
      Estado: p.estado === 'ok' ? 'Completa' : p.estado === 'curso' ? 'Le falta algo' : 'Sin visitar',
      'Fecha visita': ie.fecha_visita ?? '', 'Registrado por': ie.registrado_por ?? '', Atendió: ie.atendio ?? '',
      'N.° sedes': d.sedes.filter((s) => s.institucion_id === ie.id).length, Notas: ie.notas,
    };
  });
  const hojaSedes = d.sedes.filter((s) => d.ies.some((i) => i.id === s.institucion_id)).map((s) => {
    const ie = ieDe(s.institucion_id);
    const ts = d.espacios.filter((e) => e.sede_id === s.id).map((e) => tipo(e.tipo_espacio_id));
    return {
      Comuna: C(ie.comuna_id), IE: ie.nombre, Sede: s.nombre, Principal: s.principal ? 'Sí' : 'No', Bloques: s.bloques,
      'Internet (Mbps)': s.internet_mbps ?? '', Computadores: s.computadores ?? '',
      'Biblioteca o sala de lectura': ts.some((t) => t?.categoria_id === 'lectura') ? 'Sí' : ts.length ? 'No' : '',
      'N.° laboratorios': ts.filter((t) => t?.categoria_id === 'laboratorios').length,
      Accesibilidad: ts.filter((t) => t?.categoria_id === 'accesibilidad').map((t) => t!.nombre).join(', '),
      'N.° espacios': ts.length,
    };
  });
  const hojaEsp = d.espacios.flatMap((e) => {
    const s = d.sedes.find((x) => x.id === e.sede_id); if (!s) return [];
    const ie = ieDe(s.institucion_id); if (!ie) return [];
    const t = tipo(e.tipo_espacio_id);
    return [{ Comuna: C(ie.comuna_id), IE: ie.nombre, Sede: s.nombre, 'Sede principal': s.principal ? 'Sí' : 'No',
      Categoría: cat(t?.categoria_id), Espacio: t?.nombre ?? '', 'Tipo nuevo': t?.oficial ? 'No' : 'Sí' }];
  });
  const hojaLabs = hojaEsp.filter((r) => r.Categoría === 'Laboratorios' || /laborator|planta|taller|robot/i.test(r.Espacio));
  const hojaDoc = d.ies.map((ie) => {
    const a = d.archivos.find((x) => x.institucion_id === ie.id);
    return { Comuna: C(ie.comuna_id), IE: ie.nombre, 'Excel de docentes': a ? a.nombre : 'Pendiente', 'Fecha de subida': a ? a.subido_en.slice(0, 10) : '' };
  });
  const hojaTipos = d.tipos.map((t) => ({ Tipo: t.nombre, Categoría: cat(t.categoria_id), Oficial: t.oficial ? 'Sí' : 'No (por revisar)', 'Creado en': t.creado_en_ie ?? '' }));

  const wb = XLSX.utils.book_new();
  const hojas: [string, Record<string, unknown>[]][] = [
    ['IE', hojaIE], ['Sedes', hojaSedes], ['Espacios', hojaEsp], ['Laboratorios', hojaLabs], ['Docentes', hojaDoc], ['Tipos de espacio', hojaTipos],
  ];
  for (const [nombre, filas] of hojas) {
    const ws = XLSX.utils.json_to_sheet(filas.length ? filas : [{ 'Sin datos': '' }]);
    const cols = Object.keys(filas[0] ?? {});
    ws['!cols'] = cols.map((c) => ({ wch: Math.min(50, Math.max(c.length + 2, ...filas.map((r) => String(r[c] ?? '').length + 1))) }));
    XLSX.utils.book_append_sheet(wb, ws, nombre);
  }
  XLSX.writeFile(wb, `visitas_ie_edudata_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Carga la base de IE y sedes desde un Excel o CSV con columnas: comuna, ie, sede, dane.
 * Si una IE ya existe (mismo nombre), solo le agrega las sedes que le falten.
 */
export async function importarBase(file: File): Promise<string> {
  const wb = XLSX.read(await file.arrayBuffer());
  const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  if (!filas.length) return 'El archivo está vacío.';
  const cols = Object.keys(filas[0]);
  const col = (f: (h: string) => boolean) => cols.find((c) => f(norm(c)));
  const cIE = col((h) => h === 'ie' || h.includes('institucion') || h === 'nombre ie');
  const cSede = col((h) => h.includes('sede'));
  const cCom = col((h) => h.includes('comuna'));
  const cDane = col((h) => h.includes('dane'));
  if (!cIE || !cSede) return 'No encontré las columnas «ie» y «sede». Revisa el encabezado.';

  const grupos = new Map<string, { nombre: string; comuna: string; dane: string; sedes: string[] }>();
  for (const f of filas) {
    const nombre = String(f[cIE]).trim(); if (!nombre) continue;
    let comuna = cCom ? String(f[cCom]).replace(/comuna/i, '').trim() : '1';
    if (/rural|correg/i.test(comuna)) comuna = 'Rural';
    else comuna = String(parseInt(comuna) || 1);
    const k = norm(nombre);
    if (!grupos.has(k)) grupos.set(k, { nombre, comuna, dane: cDane ? String(f[cDane]).trim() : '', sedes: [] });
    const sede = String(f[cSede]).trim();
    if (sede && !grupos.get(k)!.sedes.includes(sede)) grupos.get(k)!.sedes.push(sede);
  }

  const existentes = await db.instituciones.toArray();
  let nuevas = 0, sedesNuevas = 0;
  for (const g of grupos.values()) {
    const ya = existentes.find((i) => norm(i.nombre) === norm(g.nombre));
    if (!ya) {
      await crearIE(g.nombre, g.comuna, g.sedes.length ? g.sedes : ['Sede Principal'], g.dane || null);
      nuevas++; sedesNuevas += Math.max(1, g.sedes.length);
    } else {
      const actuales = await db.sedes.where('institucion_id').equals(ya.id).toArray();
      for (const sn of g.sedes) {
        if (!actuales.some((s) => norm(s.nombre) === norm(sn))) {
          await crearSede(ya.id, sn, actuales.length === 0, actuales.length);
          actuales.push({ id: '', institucion_id: ya.id, nombre: sn, principal: false, bloques: 0, internet_mbps: null, computadores: null, orden: 0 });
          sedesNuevas++;
        }
      }
    }
  }
  return `Listo: ${nuevas} IE nuevas y ${sedesNuevas} sedes nuevas. Se están subiendo a la nube.`;
}

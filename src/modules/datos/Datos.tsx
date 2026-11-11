import { useState } from 'react';
import { Link } from 'react-router-dom';
import { guardarIntegrante, nuevoId, quitarIntegrante } from '../../data/repos';
import { Campo, Icon } from '../../shared/ui';
import type { Datos as TDatos } from '../../shared/useDatos';

export default function Datos({ d }: { d: TDatos }) {
  const [msg, setMsg] = useState('');
  const [cargando, setCargando] = useState(false);
  const nuevos = d.tipos.filter((t) => !t.oficial).length;

  const importar = async (f?: File) => {
    if (!f) return;
    setCargando(true); setMsg('Cargando…');
    try { const { importarBase } = await import('./excel'); setMsg(await importarBase(f)); } catch (e) { setMsg('No se pudo leer el archivo: ' + (e instanceof Error ? e.message : '')); }
    finally { setCargando(false); }
  };

  return (
    <>
      <div className="head"><div><h1>Descargar y datos</h1><div className="muted">Todo lo registrado sale en un Excel listo para EduData</div></div></div>
      <div className="g2">
        <div className="card"><h3>Descargar en Excel</h3>
          <div className="hint">Hojas: IE, Sedes, Espacios, Laboratorios, Docentes (qué IE ya entregaron su Excel) y Tipos de espacio.</div>
          <button className="btn pri" style={{ marginTop: 16 }} onClick={() => void import('./excel').then((m) => m.exportarExcel(d))}><Icon n="datos" /> Descargar Excel</button>
        </div>
        <div className="card"><h3>Cargar la base de IE y sedes</h3>
          <div className="hint">Un Excel o CSV con columnas <b>comuna</b>, <b>ie</b>, <b>sede</b> y <b>dane</b>. La primera sede de cada IE queda como principal. Si la IE ya existe, solo se agregan las sedes que falten.</div>
          <input type="file" accept=".xlsx,.xls,.csv" className="inp" style={{ marginTop: 14 }} disabled={cargando} onChange={(e) => void importar(e.target.files?.[0])} />
          {msg && <div className="hint" style={{ marginTop: 8 }}>{msg}</div>}
        </div>
        <div className="card"><h3>Tipos de espacio</h3>
          <div className="hint">La lista que se va armando en campo. Aquí se revisan los nuevos y se unen los repetidos.</div>
          <Link className="btn" style={{ marginTop: 16 }} to="/catalogo">Revisar tipos{nuevos ? ` (${nuevos} nuevos)` : ''}</Link>
        </div>
        <div className="card"><h3>Equipo</h3>
          <div className="hint">Los nombres que aparecen en «¿Quién registra?».</div>
          <div className="list" style={{ marginTop: 12 }}>
            {d.equipo.map((i) => (
              <div key={i.id} style={{ display: 'flex', gap: 8 }}>
                <Campo valor={i.nombre} onGuardar={(v) => guardarIntegrante({ ...i, nombre: v })} aria-label="Nombre" />
                <button className="btn sm ghost warn" onClick={() => quitarIntegrante(i.id)}>Quitar</button>
              </div>
            ))}
          </div>
          <button className="btn sm" style={{ marginTop: 10 }} onClick={() => guardarIntegrante({ id: nuevoId(), nombre: 'Persona ' + (d.equipo.length + 1), activo: true })}>
            <Icon n="plus" /> Agregar persona</button>
        </div>
      </div>
    </>
  );
}

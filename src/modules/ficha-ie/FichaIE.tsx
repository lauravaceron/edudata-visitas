import { Link, useParams } from 'react-router-dom';
import { actualizarIE } from '../../data/repos';
import { Campo, Icon } from '../../shared/ui';
import { comunaLbl } from '../../shared/texto';
import { progreso, type Datos } from '../../shared/useDatos';
import Sedes from './Sedes';
import Docentes from './Docentes';

export default function FichaIE({ d }: { d: Datos }) {
  const { id } = useParams();
  const ie = d.ies.find((x) => x.id === id);
  if (!ie) return <div className="empty"><b>No encontré esta IE</b><Link to="/instituciones">Volver a las instituciones</Link></div>;
  const sedes = d.sedes.filter((s) => s.institucion_id === ie.id);
  const p = progreso(ie, d);
  const set = (c: Parameters<typeof actualizarIE>[1]) => actualizarIE(ie.id, c);

  return (
    <div className="ficha">
      <div className="topbar">
        <Link className="btn" to="/instituciones"><Icon n="back" /> Volver a las IE</Link>
        <span className="saved"><Icon n="check" size={16} /> Se guarda solo</span>
      </div>
      <div className="ietitle">
        <Campo valor={ie.nombre} onGuardar={(v) => set({ nombre: v || 'IE sin nombre' })} className="ie-nombre" aria-label="Nombre de la IE" />
        <p>{comunaLbl(ie.comuna_id)} · {sedes.length} {sedes.length === 1 ? 'sede' : 'sedes'}{ie.dane ? ' · DANE ' + ie.dane : ''}</p>
      </div>

      <section className="sec">
        <h2>La visita</h2>
        <p className="sub">Cuándo fueron y quién los atendió.</p>
        <div className="panel"><div className="f3">
          <div><label className="lbl" htmlFor="f-fecha">Fecha</label>
            <input className="inp" type="date" id="f-fecha" value={ie.fecha_visita ?? ''} onChange={(e) => set({ fecha_visita: e.target.value || null })} /></div>
          <div><label className="lbl" htmlFor="f-por">¿Quién registra?</label>
            <select className="inp" style={{ width: '100%' }} id="f-por" value={ie.registrado_por ?? ''} onChange={(e) => set({ registrado_por: e.target.value || null })}>
              <option value="">Elegir…</option>
              {d.equipo.map((i) => <option key={i.id}>{i.nombre}</option>)}
              {ie.registrado_por && !d.equipo.some((i) => i.nombre === ie.registrado_por) && <option>{ie.registrado_por}</option>}
            </select></div>
          <div><label className="lbl" htmlFor="f-at">¿Quién los atendió?</label>
            <Campo id="f-at" valor={ie.atendio ?? ''} onGuardar={(v) => set({ atendio: v || null })} placeholder="Nombre y cargo" /></div>
        </div></div>
      </section>

      <section className="sec">
        <h2>Sedes y espacios</h2>
        <p className="sub">Escoge la sede y agrégale, uno por uno, los espacios que tiene. Si algo no está en la lista, lo escriben.</p>
        <Sedes ie={ie} sedes={sedes} d={d} />
      </section>

      <section className="sec">
        <h2>Docentes</h2>
        <p className="sub">El rector les entrega un Excel con la planta docente. Súbelo aquí cuando lo tengan (necesita internet).</p>
        <Docentes ie={ie} archivo={d.archivos.find((a) => a.institucion_id === ie.id)} />
      </section>

      <section className="sec">
        <h2>Notas</h2>
        <p className="sub">Acceso, contactos, lo que quedó pendiente.</p>
        <Campo multilinea valor={ie.notas} onGuardar={(v) => set({ notas: v })} placeholder="Escribe aquí…" style={{ minHeight: 120 }} />
      </section>

      <div className="endbar">
        <span className="muted">{p.estado === 'ok' ? 'Esta IE ya tiene toda la información.' : 'Falta: ' + p.falta.join(', ') + '.'}</span>
        <Link className="btn pri" to="/instituciones">Listo, volver a las IE</Link>
      </div>
    </div>
  );
}

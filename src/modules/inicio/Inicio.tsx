import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../shared/ui';
import { comunaLbl, norm } from '../../shared/texto';
import { progreso, type Datos } from '../../shared/useDatos';

const META = 92;

export default function Inicio({ d }: { d: Datos }) {
  const [q, setQ] = useState('');
  const pr = d.ies.map((ie) => ({ ie, p: progreso(ie, d) }));
  const vis = pr.filter((x) => x.p.estado !== 'sin').length;
  const ok = pr.filter((x) => x.p.estado === 'ok').length;
  const puntos = [...pr.filter((x) => x.p.estado === 'ok').map(() => 'ok'), ...pr.filter((x) => x.p.estado === 'curso').map(() => 'curso')];
  const curso = pr.filter((x) => x.p.estado === 'curso')
    .sort((a, b) => (b.ie.fecha_visita ?? '').localeCompare(a.ie.fecha_visita ?? '')).slice(0, 3);
  const nq = norm(q);
  const hits = nq
    ? d.ies.filter((ie) => norm(ie.nombre + ' ' + d.sedes.filter((s) => s.institucion_id === ie.id).map((s) => s.nombre).join(' ')).includes(nq)).slice(0, 6)
    : [];

  return (
    <>
      <section className="hero">
        <div>
          <small>Visitas a las instituciones educativas</small>
          <h1>Van <span>{vis}</span> de {META} instituciones</h1>
          <p>{ok} ya tienen toda la información. Cada punto es una IE: así se ve cuánto falta.</p>
        </div>
        <div>
          <div className="dots" aria-label={`${vis} de ${META} IE visitadas`}>
            {Array.from({ length: META }, (_, i) => <i key={i} className={puntos[i] ?? ''} />)}
          </div>
          <div className="dleg">
            <span><i style={{ background: '#fff' }} />Completa</span>
            <span><i style={{ background: '#FFC062' }} />Le falta algo</span>
            <span><i style={{ background: 'rgba(255,255,255,.25)' }} />Sin visitar</span>
          </div>
        </div>
      </section>

      <section className="block">
        <h2>¿A cuál IE van hoy?</h2>
        <p className="sub">Búscala y entra a su ficha para registrar la visita.</p>
        <label className="bigsearch" htmlFor="qh"><Icon n="search" />
          <input id="qh" placeholder="Nombre de la IE o de una de sus sedes" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
        </label>
        {nq && (
          <div className="hits">
            {hits.length ? hits.map((ie) => (
              <Link key={ie.id} to={`/ie/${ie.id}`}><b>{ie.nombre}</b><span>{comunaLbl(ie.comuna_id)}</span></Link>
            )) : <div style={{ padding: '14px 18px', color: 'var(--muted)' }}>No encontré esa IE. Revisa el nombre.</div>}
          </div>
        )}
      </section>

      {curso.length > 0 && (
        <section className="block">
          <h2>Para terminar</h2>
          <p className="sub">Ya las visitaron, pero les falta algo.</p>
          <div className="cont">
            {curso.map(({ ie, p }) => (
              <Link key={ie.id} to={`/ie/${ie.id}`}>
                <span className="muted" style={{ fontSize: 13.5 }}>{comunaLbl(ie.comuna_id)}</span>
                <b>{ie.nombre}</b>
                <span className="f">Falta: {p.falta.join(', ')}</span>
                <span className="go">Continuar →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {d.ies.length === 0 && (
        <div className="empty" style={{ marginTop: 40 }}>
          <b>Todavía no hay instituciones cargadas</b>
          Ve a <Link to="/datos">Descargar y datos</Link> y carga la base de las {META} IE.
        </div>
      )}
    </>
  );
}

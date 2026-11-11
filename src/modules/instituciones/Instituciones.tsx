import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { crearIE } from '../../data/repos';
import { Icon } from '../../shared/ui';
import { comunaLbl, fmtFecha, norm } from '../../shared/texto';
import { progreso, type Datos, type Estado } from '../../shared/useDatos';

const FILTROS: [Estado | '', string][] = [['', 'Todas'], ['sin', 'Sin visitar'], ['curso', 'Les falta algo'], ['ok', 'Completas']];

export default function Instituciones({ d }: { d: Datos }) {
  const [q, setQ] = useState('');
  const [comuna, setComuna] = useState('');
  const [estado, setEstado] = useState<Estado | ''>('');
  const nav = useNavigate();
  const nq = norm(q);
  const sedesDe = (id: string) => d.sedes.filter((s) => s.institucion_id === id);
  const xs = d.ies
    .map((ie) => ({ ie, p: progreso(ie, d) }))
    .filter(({ ie, p }) =>
      (!comuna || ie.comuna_id === comuna) &&
      (!estado || p.estado === estado) &&
      (!nq || norm(ie.nombre + ' ' + sedesDe(ie.id).map((s) => s.nombre).join(' ')).includes(nq)));
  const comunasConIE = d.comunas.filter((c) => d.ies.some((ie) => ie.comuna_id === c.id));

  const nueva = async () => {
    const ie = await crearIE('IE nueva', comuna || '1', ['Sede Principal']);
    nav(`/ie/${ie.id}`);
  };

  return (
    <>
      <div className="head">
        <div><h1>Instituciones</h1><div className="muted">{d.ies.length} IE, ordenadas por comuna</div></div>
        <button className="btn" onClick={nueva}><Icon n="plus" /> Agregar IE</button>
      </div>
      <div className="filters">
        <label className="search" htmlFor="q"><Icon n="search" />
          <input id="q" placeholder="Buscar IE o sede" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
        </label>
        <select className="inp" value={comuna} onChange={(e) => setComuna(e.target.value)} aria-label="Filtrar por comuna">
          <option value="">Todas las comunas</option>
          {comunasConIE.map((c) => <option key={c.id} value={c.id}>{comunaLbl(c.id)}</option>)}
        </select>
        <div className="tabs">
          {FILTROS.map(([v, l]) => <button key={v} className={estado === v ? 'on' : ''} onClick={() => setEstado(v)}>{l}</button>)}
        </div>
      </div>

      {xs.length === 0 && <div className="empty" style={{ marginTop: 20 }}><b>No hay IE con esos filtros</b>Prueba con otra comuna o borra la búsqueda.</div>}

      {d.comunas.map((c) => {
        const g = xs.filter((x) => x.ie.comuna_id === c.id);
        if (!g.length) return null;
        return (
          <div key={c.id}>
            <div className="group-h"><h2>{comunaLbl(c.id)}</h2><span>{g.length} IE</span></div>
            <div className="list">
              {g.map(({ ie, p }) => {
                const n = sedesDe(ie.id).length;
                return (
                  <Link key={ie.id} className={'row ' + p.estado} to={`/ie/${ie.id}`}>
                    <div>
                      <div className="t">{ie.nombre}</div>
                      <div className="meta">
                        <span className="chip">{n} {n === 1 ? 'sede' : 'sedes'}</span>
                        {ie.fecha_visita && <span className="chip">Visitada el {fmtFecha(ie.fecha_visita)}</span>}
                      </div>
                    </div>
                    {p.estado === 'sin' ? <span className="st">Sin visitar</span>
                      : p.estado === 'ok' ? <span className="st ok">Completa</span>
                      : <span className="st curso">Falta: {p.falta.join(', ')}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}

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

  const [form, setForm] = useState<{ nombre: string; comuna: string; sede: string } | null>(null);
  const guardarNueva = async () => {
    if (!form || !form.nombre.trim()) return;
    const ie = await crearIE(form.nombre.trim(), form.comuna, [form.sede.trim() || 'Sede Principal']);
    setForm(null);
    nav(`/ie/${ie.id}`);
  };

  return (
    <>
      <div className="head">
        <div><h1>Instituciones</h1><div className="muted">{d.ies.length} IE, ordenadas por comuna</div></div>
        {!form && <button className="btn" onClick={() => setForm({ nombre: '', comuna: comuna || '1', sede: 'Sede Principal' })}><Icon n="plus" /> Agregar IE</button>}
      </div>
      {form && (
        <form className="panel nueva-ie" onSubmit={(e) => { e.preventDefault(); void guardarNueva(); }}>
          <h3>Nueva institución</h3>
          <div className="f3">
            <div><label className="lbl" htmlFor="n-nom">Nombre de la IE</label>
              <input className="inp" id="n-nom" autoFocus value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Institución Educativa…" /></div>
            <div><label className="lbl" htmlFor="n-com">Comuna</label>
              <select className="inp" style={{ width: '100%' }} id="n-com" value={form.comuna} onChange={(e) => setForm({ ...form, comuna: e.target.value })}>
                {d.comunas.map((c) => <option key={c.id} value={c.id}>{comunaLbl(c.id)}</option>)}
              </select></div>
            <div><label className="lbl" htmlFor="n-sede">Sede principal</label>
              <input className="inp" id="n-sede" value={form.sede} onChange={(e) => setForm({ ...form, sede: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button className="btn pri" disabled={!form.nombre.trim()}>Guardar IE</button>
            <button type="button" className="btn" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </form>
      )}
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

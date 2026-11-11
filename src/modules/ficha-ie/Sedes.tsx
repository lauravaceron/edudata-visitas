import { useEffect, useState } from 'react';
import { actualizarSede, agregarEspacio, crearSede, eliminarSede, quitarEspacio, tipoPorNombre } from '../../data/repos';
import type { Institucion, Sede } from '../../data/types';
import { Campo, Icon, useToast } from '../../shared/ui';
import type { Datos } from '../../shared/useDatos';

const numero = (v: string) => (v.trim() === '' ? null : Math.max(0, Number(v.replace(',', '.'))) || 0);

export default function Sedes({ ie, sedes, d }: { ie: Institucion; sedes: Sede[]; d: Datos }) {
  const [sel, setSel] = useState<string | undefined>(sedes[0]?.id);
  const [otroCat, setOtroCat] = useState<string | null>(null);
  const [otro, setOtro] = useState('');
  const [borrar, setBorrar] = useState(false);
  const toast = useToast();
  // "Institución Educativa X - Sede Principal" → "Sede Principal" (el nombre de la IE ya está arriba)
  const corto = (n: string) => {
    const base = ie.nombre.trim();
    return n.startsWith(base) ? n.slice(base.length).replace(/^[\s\-–—:]+/, '') || n : n;
  };
  useEffect(() => { if (!sedes.some((s) => s.id === sel)) setSel(sedes[0]?.id); }, [sedes, sel]);
  const s = sedes.find((x) => x.id === sel);

  const nueva = async () => {
    const ns = await crearSede(ie.id, 'Sede ' + (sedes.length + 1), sedes.length === 0, sedes.length);
    setSel(ns.id);
    toast('Sede agregada: escríbele el nombre');
  };

  const tabs = (
    <div className="sedetabs">
      {sedes.map((x) => {
        const n = d.espacios.filter((e) => e.sede_id === x.id).length;
        return (
          <button key={x.id} className={x.id === sel ? 'on' : ''} onClick={() => { setSel(x.id); setOtroCat(null); setBorrar(false); }}>
            <b>{corto(x.nombre)}</b><small>{x.principal ? 'Principal · ' : ''}{n} {n === 1 ? 'espacio' : 'espacios'}</small>
          </button>
        );
      })}
      <button className="add" onClick={nueva}><Icon n="plus" size={16} /> Otra sede</button>
    </div>
  );
  if (!s) return tabs;

  const mios = d.espacios.filter((e) => e.sede_id === s.id);
  const tipo = (id: string) => d.tipos.find((t) => t.id === id);
  const set = (c: Partial<Sede>) => actualizarSede(s.id, c);

  const agregar = async (tid: string) => {
    await agregarEspacio(s.id, tid);
    setOtroCat(null); setOtro('');
    toast((tipo(tid)?.nombre ?? 'Espacio') + ' agregado');
  };
  const crearOtro = async (cat: string) => {
    if (!otro.trim()) return;
    const t = await tipoPorNombre(otro, cat, ie.nombre);
    await agregar(t.id);
  };

  return (
    <>
      {tabs}
      <div className="panel">
        <div className="sedetop">
          <div className="grow"><label className="lbl" htmlFor="f-sn">Nombre de la sede</label>
            <Campo id="f-sn" valor={s.nombre} onGuardar={(v) => set({ nombre: v || 'Sede sin nombre' })} /></div>
          <div><span className="lbl">Bloques o edificios</span>
            <div className="stepper">
              <button onClick={() => set({ bloques: Math.max(0, s.bloques - 1) })} aria-label="Quitar un bloque">−</button>
              <span className="num">{s.bloques}</span>
              <button onClick={() => set({ bloques: s.bloques + 1 })} aria-label="Agregar un bloque">+</button>
            </div></div>
          <div className="del-sede">
            {borrar && <button className="btn sm" onClick={() => setBorrar(false)}>Cancelar</button>}
            <button className={'btn sm ' + (borrar ? 'danger' : 'ghost warn')} onClick={async () => {
              if (!borrar) { setBorrar(true); return; }
              const nombre = s.nombre;
              await eliminarSede(s.id);
              setBorrar(false);
              toast(nombre + ' eliminada');
            }}>{borrar ? `Sí, eliminar ${s.nombre}` : 'Eliminar sede'}</button>
          </div>
        </div>

        <div className="conect">
          <div className="cbox" style={{ ['--ac' as string]: '#0E8A9A' }}>
            <label className="lbl" htmlFor="f-net">Velocidad de internet</label>
            <div className="unit">
              <Campo id="f-net" type="number" min={0} step="any" inputMode="decimal" placeholder="0"
                valor={s.internet_mbps == null ? '' : String(s.internet_mbps)} onGuardar={(v) => set({ internet_mbps: numero(v) })} />
              <span>Mbps</span>
            </div>
            <small>Mídanla en la sede abriendo <b>fast.com</b> en el celular. Si no hay internet, pongan 0.</small>
          </div>
          <div className="cbox" style={{ ['--ac' as string]: '#1F5FAD' }}>
            <label className="lbl" htmlFor="f-pcs">Cantidad de computadores</label>
            <div className="unit">
              <Campo id="f-pcs" type="number" min={0} inputMode="numeric" placeholder="0"
                valor={s.computadores == null ? '' : String(s.computadores)} onGuardar={(v) => { const n = numero(v); set({ computadores: n == null ? null : Math.round(n) }); }} />
              <span>equipos</span>
            </div>
            <small>Todos los que tenga la sede: portátiles y de escritorio que funcionen.</small>
          </div>
        </div>

        <div className="addzone"><h3>¿Qué espacios tiene esta sede?</h3><p className="sub">Abre la categoría y escoge. Si no está, elige «Otro» y escríbelo.</p></div>
        <div className="cats">
          {d.categorias.map((c) => {
            const suyos = mios.filter((e) => tipo(e.tipo_espacio_id)?.categoria_id === c.id);
            const tipos = d.tipos.filter((t) => t.categoria_id === c.id);
            return (
              <div key={c.id} className={'cat' + (suyos.length ? ' has' : '')} style={{ ['--ac' as string]: c.color }}>
                <div className="cat-h"><i /><b>{c.nombre}</b>{c.prioridad && <span className="star">Prioridad</span>}<span className="cnt">{suyos.length || ''}</span></div>
                {suyos.length > 0 && (
                  <div className="tags">
                    {suyos.map((e) => {
                      const nm = tipo(e.tipo_espacio_id)?.nombre ?? 'Espacio';
                      return (
                        <span key={e.id} className="tag">{nm}
                          <button onClick={() => { void quitarEspacio(e.id); toast(nm + ' quitado'); }} aria-label={'Quitar ' + nm} title="Quitar"><Icon n="x" /></button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <select className="inp catsel" value="" aria-label={'Agregar en ' + c.nombre}
                  onChange={(e) => { const v = e.target.value; if (v === '__otro') { setOtroCat(c.id); setOtro(''); } else if (v) void agregar(v); }}>
                  <option value="">+ Agregar…</option>
                  {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  <option value="__otro">Otro (escribirlo)…</option>
                </select>
                {otroCat === c.id && (
                  <div className="otro-row">
                    <input className="inp" autoFocus placeholder="¿Cómo se llama?" value={otro} onChange={(e) => setOtro(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void crearOtro(c.id); } if (e.key === 'Escape') setOtroCat(null); }} />
                    <button className="btn pri sm" onClick={() => void crearOtro(c.id)}>Agregar</button>
                    <button className="btn sm ghost" onClick={() => setOtroCat(null)}>Cancelar</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

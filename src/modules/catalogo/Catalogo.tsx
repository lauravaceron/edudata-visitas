import { Link } from 'react-router-dom';
import { aprobarTipo, unirTipos } from '../../data/repos';
import { Icon, useToast } from '../../shared/ui';
import type { Datos } from '../../shared/useDatos';

export default function Catalogo({ d }: { d: Datos }) {
  const toast = useToast();
  const usos = (id: string) => d.espacios.filter((e) => e.tipo_espacio_id === id).length;
  return (
    <>
      <Link className="back" to="/datos"><Icon n="back" size={18} /> Descargar y datos</Link>
      <div className="head"><div><h1>Tipos de espacio</h1>
        <div className="muted" style={{ maxWidth: '60ch' }}>Cuando alguien registra un espacio que no existía, aparece aquí como nuevo. Si dos significan lo mismo, únelos para que el conteo salga bien.</div></div></div>
      {d.categorias.map((c) => {
        const ts = d.tipos.filter((t) => t.categoria_id === c.id);
        if (!ts.length) return null;
        return (
          <div key={c.id} className="cat-g">
            <h3><i style={{ background: c.color }} />{c.nombre}</h3>
            {ts.map((t) => (
              <div key={t.id} className="catrow">
                <div>
                  <div className="t">{t.nombre}{!t.oficial && <span className="chip" style={{ background: 'var(--coral-suave)', color: '#A93A22', marginLeft: 6 }}>Nuevo</span>}</div>
                  <div className="meta">{usos(t.id)} registrados{t.creado_en_ie ? ' · creado en ' + t.creado_en_ie : ''}</div>
                </div>
                {!t.oficial && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="btn sm" onClick={() => { void aprobarTipo(t.id); toast(`«${t.nombre}» quedó como oficial`); }}>Dejar como oficial</button>
                    <select className="inp" style={{ padding: '7px 9px', fontSize: 13.5 }} value="" aria-label="Unir con otro tipo"
                      onChange={(e) => { const to = d.tipos.find((x) => x.id === e.target.value); if (to) { void unirTipos(t.id, to.id); toast(`«${t.nombre}» unido con «${to.nombre}»`); } }}>
                      <option value="">Unir con…</option>
                      {d.tipos.filter((o) => o.id !== t.id).map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}

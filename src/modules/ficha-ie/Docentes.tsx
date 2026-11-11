import { useRef, useState } from 'react';
import { enlaceDocentes, quitarDocentes, subirDocentes } from '../../data/repos';
import type { ArchivoDocentes, Institucion } from '../../data/types';
import { fmtFecha } from '../../shared/texto';
import { Icon, useToast } from '../../shared/ui';

export default function Docentes({ ie, archivo }: { ie: Institucion; archivo?: ArchivoDocentes }) {
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [sobre, setSobre] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const toast = useToast();

  const subir = async (f?: File | null) => {
    if (!f) return;
    if (!navigator.onLine) { toast('Necesitas internet para subir el archivo'); return; }
    setSubiendo(true);
    try { await subirDocentes(ie, f); toast('Excel de docentes subido'); }
    catch { toast('No se pudo subir. Revisa la conexión e intenta otra vez.'); }
    finally { setSubiendo(false); if (input.current) input.current.value = ''; }
  };
  const bajar = async () => {
    try { window.location.href = await enlaceDocentes(archivo!); }
    catch { toast('No se pudo descargar. ¿Hay internet?'); }
  };
  const quitar = async () => {
    if (!confirmar) { setConfirmar(true); return; }
    try { await quitarDocentes(archivo!); toast('Archivo quitado'); } catch { toast('No se pudo quitar. ¿Hay internet?'); }
    setConfirmar(false);
  };

  const fileInput = <input ref={input} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => void subir(e.target.files?.[0])} />;

  if (archivo)
    return (
      <div className="panel"><div className="file">
        <div className="ficon">XLS</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b>{archivo.nombre}</b>
          <div className="muted" style={{ fontSize: 14 }}>{Math.max(1, Math.round((archivo.tamano ?? 0) / 1024))} KB · subido el {fmtFecha(archivo.subido_en)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn sm" onClick={bajar}>Descargar</button>
          <button className="btn sm" onClick={() => input.current?.click()} disabled={subiendo}>{subiendo ? 'Subiendo…' : 'Cambiar'}</button>
          <button className="btn sm ghost warn" onClick={quitar}>{confirmar ? '¿Seguro?' : 'Quitar'}</button>
        </div>
        {fileInput}
      </div></div>
    );

  return (
    <>
      <button type="button" className={'drop' + (sobre ? ' over' : '')} style={{ width: '100%' }} onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setSobre(true); }} onDragLeave={() => setSobre(false)}
        onDrop={(e) => { e.preventDefault(); setSobre(false); void subir(e.dataTransfer.files[0]); }}>
        <div className="ficon" style={{ background: 'var(--azul-suave)', color: 'var(--azul)' }}><Icon n="subir" size={24} /></div>
        <b>{subiendo ? 'Subiendo…' : 'Subir el Excel de docentes'}</b>
        <span className="muted">Toca aquí o arrastra el archivo (.xlsx, .xls o .csv)</span>
      </button>
      {fileInput}
    </>
  );
}

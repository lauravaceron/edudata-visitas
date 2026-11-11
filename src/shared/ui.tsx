import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

/* ---------- Íconos ---------- */
const PATHS = {
  inicio: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
  instituciones: '<path d="M3 20h18"/><path d="M5 20V9l7-4 7 4v11"/><path d="M9.5 20v-4.5h5V20"/><path d="M9 11h.01M15 11h.01"/>',
  datos: '<path d="M12 4v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4.5 19.5h15"/>',
  subir: '<path d="M12 20V9"/><path d="m7.5 13.5 4.5-4.5 4.5 4.5"/><path d="M4.5 4.5h15"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
};
export function Icon({ n, size }: { n: keyof typeof PATHS; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" width={size} height={size} dangerouslySetInnerHTML={{ __html: PATHS[n] }} />
  );
}

/** Logo completo de EduData Cali. */
export function Logo({ alto = 32 }: { alto?: number }) {
  return <img src="/logo-edudata.png" alt="EduData Cali" height={alto} style={{ height: alto, width: 'auto', display: 'block' }} />;
}

/* ---------- Avisos ---------- */
const ToastCtx = createContext<(m: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toast = useCallback((m: string) => {
    setMsg(m); setShow(true);
    clearTimeout(t.current);
    t.current = setTimeout(() => setShow(false), 1900);
  }, []);
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className={'toast' + (show ? ' show' : '')} role="status">{msg}</div>
    </ToastCtx.Provider>
  );
}

/* ---------- Campo de texto que guarda solo, sin guardar en cada tecla ---------- */
type CampoProps = {
  valor: string;
  onGuardar: (v: string) => void;
  multilinea?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>;

export function Campo({ valor, onGuardar, multilinea, className, ...rest }: CampoProps) {
  const [v, setV] = useState(valor);
  const editando = useRef(false);
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => { if (!editando.current) setV(valor); }, [valor]);
  const cambiar = (nv: string) => {
    editando.current = true;
    setV(nv);
    clearTimeout(t.current);
    t.current = setTimeout(() => { editando.current = false; if (nv !== valor) onGuardar(nv); }, 600);
  };
  const salir = () => {
    clearTimeout(t.current);
    editando.current = false;
    if (v !== valor) onGuardar(v);
  };
  const cls = 'inp' + (className ? ' ' + className : '');
  if (multilinea)
    return <textarea className={cls} id={rest.id} placeholder={rest.placeholder} style={rest.style} value={v}
      onChange={(e) => cambiar(e.target.value)} onBlur={salir} />;
  return <input className={cls} {...rest} value={v} onChange={(e) => cambiar(e.target.value)} onBlur={salir} />;
}

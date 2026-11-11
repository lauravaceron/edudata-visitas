import { useEffect, useState, type FormEvent } from 'react';
import { HashRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { CORREO_EQUIPO, configurado, supabase } from './data/supabase';
import { iniciarSync, sincronizar, useSync } from './data/sync';
import { Icon, Logo, ToastProvider } from './shared/ui';
import { useDatos } from './shared/useDatos';
import Inicio from './modules/inicio/Inicio';
import Instituciones from './modules/instituciones/Instituciones';
import FichaIE from './modules/ficha-ie/FichaIE';
import Catalogo from './modules/catalogo/Catalogo';
import Datos from './modules/datos/Datos';

export default function App() {
  const [sesion, setSesion] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSesion(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!configurado) return <div className="login"><div className="box"><h1>Falta configurar</h1><p>Crea el archivo <b>.env</b> con los datos de Supabase (mira <b>.env.example</b>).</p></div></div>;
  if (sesion === undefined) return <div className="loading">Cargando…</div>;
  if (!sesion) return <Entrar />;
  return <ToastProvider><HashRouter><Marco /></HashRouter></ToastProvider>;
}

function Entrar() {
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [espera, setEspera] = useState(false);
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setEspera(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email: CORREO_EQUIPO, password: clave });
    setEspera(false);
    if (error) setError(navigator.onLine ? 'Ese código no es correcto.' : 'Para entrar la primera vez necesitas internet.');
  };
  return (
    <div className="login">
      <form className="box" onSubmit={enviar}>
        <Logo alto={44} />
        <h1>Visitas a las IE</h1>
        <p className="muted" style={{ margin: 0 }}>Escribe el código del equipo. Solo se pide una vez en cada celular o computador.</p>
        <input className="inp" type="password" placeholder="Código del equipo" value={clave} onChange={(e) => setClave(e.target.value)} autoFocus />
        {error && <div className="err">{error}</div>}
        <button className="btn pri" disabled={espera || !clave}>{espera ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  );
}

function EstadoNube() {
  const s = useSync();
  const [cls, txt] = !s.online ? ['off', s.pendientes ? `Sin señal · ${s.pendientes} por subir` : 'Sin señal · guardando en el celular']
    : s.error ? ['err', 'No se pudo sincronizar']
    : s.pendientes || s.sincronizando ? ['pend', s.pendientes ? `Subiendo ${s.pendientes} cambios…` : 'Sincronizando…']
    : ['', 'Todo sincronizado'];
  return <span className={'sync ' + cls} title={s.error ?? ''}><i />{txt}</span>;
}

const NAV: [string, 'inicio' | 'instituciones' | 'datos', string, string][] = [
  ['/', 'inicio', 'Inicio', 'Inicio'],
  ['/instituciones', 'instituciones', 'Instituciones', 'Instituciones'],
  ['/datos', 'datos', 'Descargar y datos', 'Datos'],
];

function Marco() {
  const d = useDatos();
  useEffect(() => { iniciarSync(); }, []);
  const links = (corto: boolean) => NAV.map(([to, ic, l, c]) => (
    <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'on' : '')}>
      <Icon n={ic} /><span>{corto ? c : l}</span>
    </NavLink>
  ));
  return (
    <div className="app">
      <aside className="side">
        <div className="brand"><Logo alto={30} /><small>Visitas a las IE</small></div>
        <nav className="nav">{links(false)}</nav>
        <div className="side-foot">
          <EstadoNube />
          <div style={{ marginTop: 6 }}>Lo que registres se guarda en el dispositivo y se sube solo cuando hay internet.</div>
          <button className="lnk" onClick={() => void sincronizar()}>Sincronizar ahora</button>
        </div>
      </aside>
      <main>
        <div className="mtop"><Logo alto={26} /><EstadoNube /></div>
        {!d ? <div className="loading">Cargando…</div> : (
          <Routes>
            <Route path="/" element={<Inicio d={d} />} />
            <Route path="/instituciones" element={<Instituciones d={d} />} />
            <Route path="/ie/:id" element={<FichaIE d={d} />} />
            <Route path="/catalogo" element={<Catalogo d={d} />} />
            <Route path="/datos" element={<Datos d={d} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        )}
      </main>
      <nav className="bottom">{links(true)}</nav>
    </div>
  );
}

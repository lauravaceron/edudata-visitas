/** Minúsculas, sin tildes ni signos: para buscar y comparar. */
export const norm = (s: string | null | undefined) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Igual que norm, pero ignora palabras como "laboratorio", "sala", "de": "Lab. de suelos" = "Laboratorio suelos". */
export const normTipo = (s: string) =>
  norm(s).replace(/\b(lab|laboratorio|aula|sala|de|del|la|el|y)\b/g, ' ').replace(/\s+/g, ' ').trim();

export const fmtFecha = (f: string | null | undefined) =>
  f ? new Date(f.slice(0, 10) + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : '';

export const comunaLbl = (id: string) => (id === 'Rural' ? 'Zona rural' : 'Comuna ' + id);

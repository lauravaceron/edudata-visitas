# Visitas EduData Cali

Aplicación web para registrar las visitas a las 92 instituciones educativas (IE) oficiales de Cali: sedes, bloques, conectividad, computadores, espacios (bibliotecas, laboratorios, canchas, accesibilidad…) y el Excel de planta docente de cada IE.

Funciona en el celular y en el computador, **sin señal** (guarda en el dispositivo y sube cuando vuelve el internet) y exporta todo a Excel para cargarlo a EduData.

## Tecnologías

| Parte | Tecnología |
|---|---|
| App | React 19 + TypeScript + Vite, instalable como PWA |
| Datos sin señal | IndexedDB (Dexie) con una cola de cambios pendientes |
| Nube | Supabase: PostgreSQL, Storage (Excel de docentes) y Auth (una cuenta del equipo) |
| Excel | SheetJS |
| Publicación | Vercel |

## Estructura

```
src/
├─ App.tsx            → entrada con código del equipo, menú y rutas
├─ modules/
│  ├─ inicio/         → avance (92 puntos), buscador, IE por terminar
│  ├─ instituciones/  → lista por comuna, filtros
│  ├─ ficha-ie/       → visita, sedes y espacios, docentes, notas
│  ├─ catalogo/       → revisar y unir tipos de espacio nuevos
│  └─ datos/          → exportar a Excel, cargar la base, equipo
├─ shared/            → componentes, textos, cálculo de avance
└─ data/
   ├─ supabase.ts     → conexión
   ├─ local-db.ts     → base local
   ├─ sync.ts         → sincronización (subir pendientes, bajar todo)
   └─ repos.ts        → operaciones de guardado
supabase/schema.sql   → tablas, vista de avance, seguridad y datos fijos
```

## Configuración (una sola vez)

### 1. Supabase
1. Crear el proyecto en supabase.com (región São Paulo).
2. **SQL Editor → New query**: pegar `supabase/schema.sql` y dar **Run**.
3. **Authentication → Users → Add user**: crear el usuario del equipo (correo + contraseña). La contraseña es el "código del equipo".
4. **Authentication → Sign In / Providers**: desactivar "Allow new users to sign up".
5. **Project Settings → API**: copiar el *Project URL* y la llave *anon public*.

### 2. Variables de entorno
Copiar `.env.example` como `.env` y llenar:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_TEAM_EMAIL=...   (el correo del usuario del equipo)
```

### 3. Correr en el computador
Requiere Node.js 20 o superior.

```bash
npm install
npm run dev
```

Abrir http://localhost:5173

### 4. Publicar en Vercel
1. En vercel.com → **Add New → Project** → importar este repositorio.
2. En **Environment Variables** agregar las tres variables del `.env`.
3. **Deploy**. Cada `git push` vuelve a publicar solo.

## Primer uso
1. Entrar con el código del equipo (la primera vez necesita internet; ahí se descargan las categorías y tipos de espacio).
2. **Descargar y datos → Cargar la base de IE y sedes**: subir el Excel o CSV con columnas `comuna`, `ie`, `sede`, `dane`.
3. **Descargar y datos → Equipo**: agregar los nombres de quienes registran.

## Cómo funciona la sincronización
- Cada cambio se guarda primero en el dispositivo y queda en una cola.
- Con internet, la cola se sube en orden y luego se descarga todo lo de los demás.
- Sin internet se sigue trabajando normal; el menú muestra cuántos cambios faltan por subir.
- El Excel de docentes sí necesita internet para subirse.

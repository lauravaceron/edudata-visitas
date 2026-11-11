-- =============================================================
-- EduData Cali · Visitas a las IE
-- Esquema de base de datos para Supabase (PostgreSQL)
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar todo → Run
-- =============================================================

-- ---------- Tablas ----------
create table if not exists comunas (
  id     text primary key,          -- '1'..'22' o 'Rural'
  nombre text not null,
  orden  int  not null
);

create table if not exists equipo (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists instituciones (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  comuna_id      text not null references comunas(id),
  dane           text,
  fecha_visita   date,
  registrado_por text,
  atendio        text,
  notas          text not null default '',
  updated_at     timestamptz not null default now(),
  updated_by     text
);

create table if not exists sedes (
  id             uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references instituciones(id) on delete cascade,
  nombre         text not null,
  principal      boolean not null default false,
  bloques        int  not null default 0 check (bloques >= 0),
  internet_mbps  numeric check (internet_mbps >= 0),
  computadores   int check (computadores >= 0),
  orden          int not null default 0,
  updated_at     timestamptz not null default now(),
  updated_by     text
);

create table if not exists categorias_espacio (
  id        text primary key,
  nombre    text not null,
  color     text not null,
  prioridad boolean not null default false,
  orden     int not null
);

create table if not exists tipos_espacio (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  categoria_id text not null references categorias_espacio(id),
  oficial      boolean not null default false,   -- false = creado en campo, por revisar
  creado_en_ie text,
  created_at   timestamptz not null default now()
);
create unique index if not exists tipos_espacio_nombre_uq on tipos_espacio (lower(nombre));

create table if not exists espacios_sede (
  id             uuid primary key default gen_random_uuid(),
  sede_id        uuid not null references sedes(id) on delete cascade,
  tipo_espacio_id uuid not null references tipos_espacio(id),
  created_at     timestamptz not null default now(),
  created_by     text
);

create table if not exists archivos_docentes (
  id             uuid primary key default gen_random_uuid(),
  institucion_id uuid not null unique references instituciones(id) on delete cascade,
  ruta_archivo   text not null,      -- ruta dentro del bucket 'docentes'
  nombre         text not null,
  tamano         bigint,
  subido_en      timestamptz not null default now(),
  subido_por     text
);

create index if not exists sedes_ie_idx on sedes(institucion_id);
create index if not exists espacios_sede_idx on espacios_sede(sede_id);

-- ---------- updated_at automático ----------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_ie_updated on instituciones;
create trigger trg_ie_updated before update on instituciones for each row execute function set_updated_at();
drop trigger if exists trg_sede_updated on sedes;
create trigger trg_sede_updated before update on sedes for each row execute function set_updated_at();

-- ---------- Vista de avance ----------
-- Completa = tiene fecha de visita + sede principal con bloques y al menos un espacio + Excel de docentes
create or replace view avance_ie as
select
  i.id,
  i.nombre,
  i.comuna_id,
  (i.fecha_visita is not null)                                         as visita_ok,
  coalesce(sp.bloques > 0 and sp.n_espacios > 0, false)                as espacios_ok,
  (ad.id is not null)                                                  as docentes_ok,
  case
    when i.fecha_visita is null and coalesce(sp.n_espacios,0) = 0 and ad.id is null then 'sin_visitar'
    when i.fecha_visita is not null and coalesce(sp.bloques > 0 and sp.n_espacios > 0,false) and ad.id is not null then 'completa'
    else 'en_curso'
  end as estado
from instituciones i
left join lateral (
  select s.bloques, (select count(*) from espacios_sede e where e.sede_id = s.id) as n_espacios
  from sedes s where s.institucion_id = i.id and s.principal limit 1
) sp on true
left join archivos_docentes ad on ad.institucion_id = i.id;

-- ---------- Seguridad: solo la cuenta del equipo ----------
alter table comunas            enable row level security;
alter table equipo             enable row level security;
alter table instituciones      enable row level security;
alter table sedes              enable row level security;
alter table categorias_espacio enable row level security;
alter table tipos_espacio      enable row level security;
alter table espacios_sede      enable row level security;
alter table archivos_docentes  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['comunas','equipo','instituciones','sedes','categorias_espacio','tipos_espacio','espacios_sede','archivos_docentes']
  loop
    execute format('drop policy if exists equipo_todo on %I', t);
    execute format('create policy equipo_todo on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ---------- Archivos (Excel de docentes) ----------
insert into storage.buckets (id, name, public)
values ('docentes', 'docentes', false)
on conflict (id) do nothing;

drop policy if exists docentes_equipo on storage.objects;
create policy docentes_equipo on storage.objects for all to authenticated
  using (bucket_id = 'docentes') with check (bucket_id = 'docentes');

-- ---------- Datos fijos ----------
insert into comunas (id, nombre, orden)
select g::text, 'Comuna ' || g, g from generate_series(1,22) g
on conflict (id) do nothing;
insert into comunas (id, nombre, orden) values ('Rural','Zona rural',23) on conflict (id) do nothing;

insert into categorias_espacio (id, nombre, color, prioridad, orden) values
  ('lectura',      'Biblioteca y lectura', '#EFA02F', true,  1),
  ('laboratorios', 'Laboratorios',         '#1F5FAD', true,  2),
  ('tecnologia',   'Tecnología',           '#0E8A9A', false, 3),
  ('agro',         'Agro y ambiental',     '#2B8763', false, 4),
  ('deporte',      'Deporte y recreación', '#D4553A', false, 5),
  ('accesibilidad','Accesibilidad',        '#B4467A', false, 6),
  ('servicios',    'Servicios',            '#6A55B8', false, 7),
  ('otro',         'Otro',                 '#7A869C', false, 8)
on conflict (id) do nothing;

insert into tipos_espacio (nombre, categoria_id, oficial) values
  ('Biblioteca','lectura',true),('Sala de lectura','lectura',true),('Ludoteca','lectura',true),
  ('Laboratorio de física','laboratorios',true),('Laboratorio de química','laboratorios',true),('Aula de bilingüismo','laboratorios',true),
  ('Laboratorio de biología','laboratorios',true),('Laboratorio de ciencias integrado','laboratorios',true),
  ('Sala de sistemas','tecnologia',true),('Robótica','tecnologia',true),
  ('Huerta escolar','agro',true),('Zonas verdes','agro',true),
  ('Cancha múltiple','deporte',true),('Cancha de fútbol','deporte',true),('Coliseo o cancha cubierta','deporte',true),('Patio de recreo','deporte',true),('Parque infantil','deporte',true),
  ('Rampas para personas con discapacidad','accesibilidad',true),('Baño accesible','accesibilidad',true),('Ascensor o plataforma','accesibilidad',true),('Barandas y pasamanos','accesibilidad',true),
  ('Parqueadero','servicios',true),('Restaurante escolar','servicios',true),('Baños','servicios',true),('Enfermería','servicios',true),('Aula múltiple o auditorio','servicios',true)
on conflict do nothing;

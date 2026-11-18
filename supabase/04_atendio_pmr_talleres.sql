-- =============================================================
-- EduData Cali · Visitas a las IE
-- 04: cargo y cédula de quien atendió, Accesibilidad (PMR) y categoría Talleres
-- Correr UNA sola vez en Supabase → SQL Editor → New query → Run
-- =============================================================

-- ---------- 1. Quién atendió la visita: cargo y cédula ----------
alter table instituciones add column if not exists atendio_cargo  text;
alter table instituciones add column if not exists atendio_cedula text;

-- ---------- 2. Accesibilidad para personas con movilidad reducida ----------
update categorias_espacio set nombre = 'Accesibilidad (PMR)' where id = 'accesibilidad';

-- ---------- 3. Nueva categoría: Talleres ----------
-- Se ubica después de Tecnología; se corre el orden de las siguientes
update categorias_espacio set orden = orden + 1 where orden >= 4 and id <> 'talleres';
insert into categorias_espacio (id, nombre, color, prioridad, orden)
values ('talleres', 'Talleres', '#8A5A2B', false, 4)
on conflict (id) do nothing;

insert into tipos_espacio (nombre, categoria_id, oficial) values
  ('Taller de música',        'talleres', true),
  ('Taller de arte',          'talleres', true),
  ('Taller de dibujo',        'talleres', true),
  ('Taller de danza',         'talleres', true),
  ('Taller de teatro',        'talleres', true),
  ('Taller de cocina',        'talleres', true),
  ('Taller de modistería',    'talleres', true),
  ('Taller de carpintería',   'talleres', true),
  ('Taller de electricidad',  'talleres', true),
  ('Taller de mecánica',      'talleres', true)
on conflict do nothing;

-- ---------- 4. Vistas actualizadas ----------
create or replace view dim_institucion with (security_invoker = true) as
select
  i.id                         as institucion_id,      -- PK
  i.nombre                     as institucion,
  i.dane                       as dane_institucion,
  i.comuna_id,
  c.nombre                     as comuna,
  case when i.comuna_id = 'Rural' then 'Rural' else 'Urbana' end as zona,
  i.fecha_visita,
  i.registrado_por,
  i.atendio,
  (ad.id is not null)          as docentes_entregado,
  ad.subido_en::date           as fecha_docentes,
  i.atendio_cargo,
  i.atendio_cedula
from instituciones i
join comunas c on c.id = i.comuna_id
left join archivos_docentes ad on ad.institucion_id = i.id;

drop view if exists base_edudata;
create view base_edudata with (security_invoker = true) as
select
  c.nombre                      as comuna,
  i.nombre                      as ie,
  i.dane                        as dane_ie,
  s.nombre                      as sede,
  s.principal                   as sede_principal,
  s.bloques,
  s.internet_mbps,
  s.computadores,
  i.fecha_visita,
  i.registrado_por,
  i.atendio,
  i.atendio_cargo,
  (ad.id is not null)           as docentes_entregado,
  coalesce(bool_or(t.nombre = 'Biblioteca'), false)             as biblioteca,
  coalesce(bool_or(t.nombre = 'Sala de lectura'), false)        as sala_lectura,
  coalesce(bool_or(t.nombre = 'Laboratorio de física'), false)  as lab_fisica,
  coalesce(bool_or(t.nombre = 'Laboratorio de química'), false) as lab_quimica,
  coalesce(bool_or(t.nombre = 'Aula de bilingüismo'), false)    as bilinguismo,
  count(e.id) filter (where t.categoria_id = 'lectura')        as n_lectura,
  count(e.id) filter (where t.categoria_id = 'laboratorios')   as n_laboratorios,
  count(e.id) filter (where t.categoria_id = 'tecnologia')     as n_tecnologia,
  count(e.id) filter (where t.categoria_id = 'talleres')       as n_talleres,
  count(e.id) filter (where t.categoria_id = 'agro')           as n_agro,
  count(e.id) filter (where t.categoria_id = 'deporte')        as n_deporte,
  count(e.id) filter (where t.categoria_id = 'accesibilidad')  as n_accesibilidad_pmr,
  count(e.id) filter (where t.categoria_id = 'servicios')      as n_servicios,
  count(e.id)                                                   as n_espacios,
  string_agg(t.nombre || coalesce(' (' || case when e.bloque = 0 then 'Zona abierta' when e.bloque > 0 then 'Bloque ' || e.bloque end || ')', ''),
             ', ' order by t.nombre)                            as espacios
from sedes s
join instituciones i       on i.id = s.institucion_id
join comunas c             on c.id = i.comuna_id
left join espacios_sede e  on e.sede_id = s.id
left join tipos_espacio t  on t.id = e.tipo_espacio_id
left join archivos_docentes ad on ad.institucion_id = i.id
group by c.nombre, c.orden, i.nombre, i.dane, s.id, s.nombre, s.principal,
         s.bloques, s.internet_mbps, s.computadores, i.fecha_visita, i.registrado_por,
         i.atendio, i.atendio_cargo, ad.id
order by c.orden, i.nombre, s.principal desc, s.nombre;

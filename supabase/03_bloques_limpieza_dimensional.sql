-- =============================================================
-- EduData Cali · Visitas a las IE
-- 03: bloque de cada espacio, limpieza de pruebas y modelo dimensional
-- Correr UNA sola vez en Supabase → SQL Editor → New query → Run
-- =============================================================


-- ---------- 1. Bloque donde está cada espacio ----------
-- 1, 2, 3… = número de bloque · 0 = zona abierta · vacío = sin asignar
alter table espacios_sede add column if not exists bloque int check (bloque >= 0);


-- ---------- 2. Limpieza de los datos de prueba ----------
-- Deja las 92 IE y sus sedes como recién cargadas, sin nada registrado.
begin;

-- Espacios y Excel de docentes registrados en las pruebas
delete from espacios_sede;
delete from archivos_docentes;

-- Tipos de espacio creados en campo (PRUEBITA, Talleres, etc.)
delete from tipos_espacio where not oficial;

-- IE creadas a mano en las pruebas (las de la base oficial tienen código DANE)
delete from instituciones where dane is null or trim(dane) = '';

-- Sedes agregadas con "Otra sede" que quedaron con el nombre automático ("Sede 2", "Sede 3"…)
delete from sedes where nombre ~ '^Sede [0-9]+$';

-- Datos de visita en blanco
update instituciones set fecha_visita = null, registrado_por = null, atendio = null, notas = '';
update sedes set bloques = 0, internet_mbps = null, computadores = null;

commit;


-- ---------- 3. Modelo dimensional (esquema estrella) para análisis ----------
-- Son vistas: no copian datos, se arman solas con lo que registra la app.
-- Cada una tiene su llave primaria (*_id) y la tabla de hechos apunta a cada dimensión.

-- Dimensión: institución
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
  ad.subido_en::date           as fecha_docentes
from instituciones i
join comunas c on c.id = i.comuna_id
left join archivos_docentes ad on ad.institucion_id = i.id;

-- Dimensión: sede
create or replace view dim_sede with (security_invoker = true) as
select
  s.id                         as sede_id,             -- PK
  s.institucion_id,                                    -- FK → dim_institucion
  s.nombre                     as sede,
  s.principal                  as sede_principal,
  s.bloques,
  s.internet_mbps,
  s.computadores
from sedes s;

-- Dimensión: tipo de espacio (con su categoría)
create or replace view dim_tipo_espacio with (security_invoker = true) as
select
  t.id                         as tipo_espacio_id,     -- PK
  t.nombre                     as tipo_espacio,
  t.categoria_id,
  c.nombre                     as categoria,
  c.prioridad                  as categoria_prioritaria,
  t.oficial
from tipos_espacio t
join categorias_espacio c on c.id = t.categoria_id;

-- Hechos: un espacio encontrado, en una sede, en un bloque (este es el "grano")
create or replace view fact_espacio with (security_invoker = true) as
select
  e.id                         as espacio_id,          -- PK
  e.sede_id,                                           -- FK → dim_sede
  s.institucion_id,                                    -- FK → dim_institucion
  e.tipo_espacio_id,                                   -- FK → dim_tipo_espacio
  e.bloque,
  case when e.bloque is null then 'Sin asignar'
       when e.bloque = 0     then 'Zona abierta'
       else 'Bloque ' || e.bloque end as ubicacion,
  i.fecha_visita,
  1                            as cantidad
from espacios_sede e
join sedes s         on s.id = e.sede_id
join instituciones i on i.id = s.institucion_id;


-- ---------- 4. Tabla única (one big table) para consultar sin joins ----------
create or replace view base_edudata with (security_invoker = true) as
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
  (ad.id is not null)           as docentes_entregado,
  coalesce(bool_or(t.nombre = 'Biblioteca'), false)             as biblioteca,
  coalesce(bool_or(t.nombre = 'Sala de lectura'), false)        as sala_lectura,
  coalesce(bool_or(t.nombre = 'Laboratorio de física'), false)  as lab_fisica,
  coalesce(bool_or(t.nombre = 'Laboratorio de química'), false) as lab_quimica,
  coalesce(bool_or(t.nombre = 'Aula de bilingüismo'), false)    as bilinguismo,
  count(e.id) filter (where t.categoria_id = 'lectura')        as n_lectura,
  count(e.id) filter (where t.categoria_id = 'laboratorios')   as n_laboratorios,
  count(e.id) filter (where t.categoria_id = 'tecnologia')     as n_tecnologia,
  count(e.id) filter (where t.categoria_id = 'agro')           as n_agro,
  count(e.id) filter (where t.categoria_id = 'deporte')        as n_deporte,
  count(e.id) filter (where t.categoria_id = 'accesibilidad')  as n_accesibilidad,
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
         s.bloques, s.internet_mbps, s.computadores, i.fecha_visita, i.registrado_por, ad.id
order by c.orden, i.nombre, s.principal desc, s.nombre;

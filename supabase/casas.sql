-- ============================================================
-- Spec-004: registro de vecinos / casas del condominio
-- Lista oficial entregada por el responsable (24 casas)
-- ============================================================

create table if not exists casas (
  id uuid primary key default gen_random_uuid(),
  numero int not null unique check (numero > 0),
  vecino_nombre text not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

-- Renombres no rompen el histórico: el id interno persiste (RF-4)
create index if not exists idx_casas_numero on casas(numero);

-- Lectura solo vía API del servidor (mismo criterio que reservas)
alter table casas enable row level security;

insert into casas (numero, vecino_nombre) values
  (1,  'Silvia Trigo'),
  (2,  'Rydy Iliver Saavedra Pereira'),
  (3,  'Isrrael Peñaranda Pardo'),
  (4,  'Oswaldo Ariel Villaz'),
  (5,  'Rivera Vargas Jose'),
  (6,  'Orellana Laime Vaneza'),
  (7,  'Thaine Galindo Cinthia Valeria Andrea'),
  (8,  'Evelyn Eulalia Torrez Monasterios'),
  (9,  'Almanza Santa Cruz Marlen Gloria'),
  (10, 'Lizarazu Angulo Adriana'),
  (11, 'Fatima Zambrana'),
  (12, 'Jose Gerling Crespo'),
  (13, 'Salazar Arze Andry Carlos'),
  (14, 'Fatima Crespo Gonzales Prada'),
  (15, 'Carlos Marcelo Prado Loayza'),
  (16, 'Chirveches Iriarte Jose Alfonso'),
  (17, 'Herbas C Andrea'),
  (18, 'Daniel Richard Lozada Tordoya'),
  (19, 'Estela Mercado'),
  (20, 'Marcelo Ariel Telleria'),
  (21, 'Romelia Jessica Salazar'),
  (22, 'Diego Fernando Quir'),
  (23, 'Soriano Cardenas Litzi Daniela'),
  (24, 'Ana Maria Soliz')
on conflict (numero) do nothing;

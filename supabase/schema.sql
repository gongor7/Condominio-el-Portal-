-- ============================================================
-- Condominio El Portal — Esquema Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Config del condominio: código de vecinos (fijo) y PIN del responsable
create table if not exists config (
  id int primary key default 1 check (id = 1),
  nombre_condominio text not null default 'Condominio El Portal',
  codigo_vecino text not null,
  pin_responsable text not null,
  creado_en timestamptz not null default now()
);

-- Gestiones: cada una con su responsable y período
create table if not exists gestiones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,                    -- ej. 'Gestión 2025-2026'
  responsable_nombre text not null,
  responsable_casa text,
  fecha_inicio date not null,
  fecha_fin date,
  cerrada boolean not null default false,
  saldo_inicial numeric(12,2) not null default 0,
  creado_en timestamptz not null default now()
);

-- Transacciones: ingresos y egresos del responsable
create table if not exists transacciones (
  id uuid primary key default gen_random_uuid(),
  gestion_id uuid not null references gestiones(id),
  tipo text not null check (tipo in ('ingreso','egreso')),
  monto numeric(12,2) not null check (monto > 0),
  categoria text not null default 'otros',
  descripcion text not null default '',
  fecha date not null,
  comprobante_url text,
  autor text not null default 'responsable',
  anulado boolean not null default false,
  anulado_motivo text,
  creado_en timestamptz not null default now()
);

-- Campañas de recaudación
create table if not exists campanas (
  id uuid primary key default gen_random_uuid(),
  gestion_id uuid not null references gestiones(id),
  titulo text not null,
  descripcion text not null default '',
  meta numeric(12,2),                      -- null = recaudación abierta
  estado text not null default 'activa' check (estado in ('activa','cerrada')),
  creado_en timestamptz not null default now()
);

-- Aportes de vecinos a campañas (nombre + monto públicos)
create table if not exists aportes (
  id uuid primary key default gen_random_uuid(),
  campana_id uuid not null references campanas(id),
  vecino_nombre text not null,
  monto numeric(12,2) not null check (monto > 0),
  comprobante_url text,
  fecha date not null default current_date,
  creado_en timestamptz not null default now()
);

-- Gastos vinculados a una campaña (para calcular sobra/falta)
create table if not exists campana_gastos (
  id uuid primary key default gen_random_uuid(),
  campana_id uuid not null references campanas(id),
  transaccion_id uuid references transacciones(id),
  monto numeric(12,2) not null check (monto > 0),
  descripcion text not null default '',
  fecha date not null default current_date,
  comprobante_url text,
  creado_en timestamptz not null default now()
);

-- Índices
create index if not exists idx_trans_gestion on transacciones(gestion_id);
create index if not exists idx_campanas_gestion on campanas(gestion_id);
create index if not exists idx_aportes_campana on aportes(campana_id);
create index if not exists idx_gastos_campana on campana_gastos(campana_id);

-- ============================================================
-- Delta v2 (Spec-001: cierre de gestión, estado de campaña, anulación)
-- ============================================================
alter table gestiones   add column if not exists fecha_cierre date;
alter table gestiones   add column if not exists cierre_nota text;
alter table campanas    add column if not exists cerrada_en timestamptz;
alter table aportes     add column if not exists anulado boolean not null default false;
alter table aportes     add column if not exists anulado_motivo text;
alter table aportes     add column if not exists anulado_en timestamptz;
alter table campana_gastos add column if not exists anulado boolean not null default false;
alter table campana_gastos add column if not exists anulado_motivo text;
alter table campana_gastos add column if not exists anulado_en timestamptz;
alter table transacciones add column if not exists anulado_en timestamptz;

-- ============================================================
-- Delta v3 (Spec-008: historial de ediciones del libro)
-- ============================================================
create table if not exists ediciones_transacciones (
  id uuid primary key default gen_random_uuid(),
  transaccion_id uuid not null references transacciones(id),
  campo text not null,
  anterior text,
  nuevo text,
  autor text not null default 'responsable',
  motivo text,
  creado_en timestamptz not null default now()
);

create index if not exists idx_ediciones_transaccion
  on ediciones_transacciones(transaccion_id);

-- ============================================================
-- Datos iniciales (EDITAR los códigos antes de ejecutar)
-- ============================================================
insert into config (codigo_vecino, pin_responsable)
values ('PORTAL2025', '4821')
on conflict (id) do nothing;

insert into gestiones (nombre, responsable_nombre, responsable_casa, fecha_inicio)
values ('Gestión 2025-2026', 'Irrael Peñaranda Pardo', 'Casa 3', '2025-07-01')
on conflict do nothing;

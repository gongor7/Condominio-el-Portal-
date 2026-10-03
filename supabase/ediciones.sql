-- ============================================================
-- Spec-008: historial de ediciones del libro contable
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

create table if not exists ediciones_transacciones (
  id uuid primary key default gen_random_uuid(),
  transaccion_id uuid not null references transacciones(id),
  campo text not null,                  -- monto | fecha | categoria | descripcion | comprobante_url
  anterior text,
  nuevo text,
  autor text not null default 'responsable',
  motivo text,
  creado_en timestamptz not null default now()
);

create index if not exists idx_ediciones_transaccion
  on ediciones_transacciones(transaccion_id);

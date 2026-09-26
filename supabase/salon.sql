-- ============================================================
-- Spec-003: módulo de reservas del salón de eventos
-- ============================================================

create table if not exists reservas (
  id uuid primary key default gen_random_uuid(),
  gestion_id uuid not null references gestiones(id),
  fecha date not null,
  vecino_nombre text not null,
  vecino_casa text not null default '',
  monto numeric(12,2) not null default 0 check (monto >= 0),
  descripcion text not null default '',
  estado text not null default 'vigente' check (estado in ('vigente','anulada')),
  transaccion_id uuid references transacciones(id),
  comprobante_url text,
  anulado_motivo text,
  anulado_tipo text check (anulado_tipo in ('devolucion','retencion')),
  anulado_en timestamptz,
  creado_en timestamptz not null default now()
);

-- RF-4: una sola reserva vigente por fecha, incluso ante creaciones simultáneas
create unique index if not exists uq_reservas_fecha_vigente
  on reservas(fecha) where estado = 'vigente';

create index if not exists idx_reservas_gestion on reservas(gestion_id);

-- Lectura solo vía API del servidor; anon no toca la tabla directamente
alter table reservas enable row level security;

-- ============================================================
-- RF-5: creación transaccional de reserva + ingreso contable
-- ============================================================
create or replace function crear_reserva_con_ingreso(
  p_gestion_id uuid,
  p_fecha date,
  p_vecino_nombre text,
  p_vecino_casa text,
  p_monto numeric,
  p_descripcion text,
  p_comprobante_url text
) returns reservas
language plpgsql
security definer
as $$
declare
  r reservas;
begin
  insert into reservas (gestion_id, fecha, vecino_nombre, vecino_casa, monto, descripcion, comprobante_url)
  values (p_gestion_id, p_fecha, p_vecino_nombre, coalesce(p_vecino_casa, ''), p_monto, coalesce(p_descripcion, ''), p_comprobante_url)
  returning * into r;

  if p_monto > 0 then
    insert into transacciones (gestion_id, tipo, monto, categoria, descripcion, fecha, comprobante_url, autor)
    values (p_gestion_id, 'ingreso', p_monto, 'alquiler salón',
            'Reserva salón: ' || coalesce(nullif(p_descripcion, ''), p_vecino_nombre), p_fecha, p_comprobante_url, 'responsable')
    returning id into r.transaccion_id;

    update reservas set transaccion_id = r.transaccion_id where id = r.id;
  end if;

  return r;
end;
$$;

-- ============================================================
-- Spec-004: módulo de expensas mensuales
-- ============================================================

create table if not exists periodos_expensas (
  id uuid primary key default gen_random_uuid(),
  gestion_id uuid not null references gestiones(id),
  mes text not null check (mes ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  monto numeric(12,2) not null check (monto > 0),
  creado_en timestamptz not null default now(),
  unique (gestion_id, mes)
);

create table if not exists pagos_expensas (
  id uuid primary key default gen_random_uuid(),
  gestion_id uuid not null references gestiones(id),
  casa_id uuid not null references casas(id),
  monto_total numeric(12,2) not null check (monto_total > 0),
  comprobante_url text,
  fecha_pago date not null,
  estado text not null default 'vigente' check (estado in ('vigente','anulado')),
  anulado_motivo text,
  anulado_en timestamptz,
  autor text not null default 'vecino',
  creado_en timestamptz not null default now()
);

-- Un pago se descompone en una fila por mes cubierto (decisión M2-A)
create table if not exists pagos_expensas_meses (
  id uuid primary key default gen_random_uuid(),
  pago_id uuid not null references pagos_expensas(id),
  casa_id uuid not null, -- denormalizada para el índice único
  mes text not null check (mes ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  monto_mes numeric(12,2) not null check (monto_mes > 0),
  transaccion_id uuid references transacciones(id),
  vigente boolean not null default true
);

-- RF-8: una casa no puede tener dos meses pagados vigentes (bloqueo real a duplicados)
create unique index if not exists uq_pago_casa_mes_vigente
  on pagos_expensas_meses(casa_id, mes) where vigente;

create index if not exists idx_pagos_expensas_gestion on pagos_expensas(gestion_id);
create index if not exists idx_pagos_meses_pago on pagos_expensas_meses(pago_id);

alter table periodos_expensas enable row level security;
alter table pagos_expensas enable row level security;
alter table pagos_expensas_meses enable row level security;

-- ============================================================
-- RF-10: registro atómico pago + meses + ingresos contables
-- ============================================================
create or replace function registrar_pago_expensas(
  p_gestion_id uuid,
  p_casa_id uuid,
  p_meses text[],
  p_montos_mes numeric[],
  p_monto_total numeric,
  p_comprobante_url text,
  p_fecha_pago date
) returns pagos_expensas
language plpgsql
security definer
as $$
declare
  pago pagos_expensas;
  casa_num int;
  tid uuid;
begin
  if array_length(p_meses, 1) is null or array_length(p_meses, 1) <> array_length(p_montos_mes, 1) then
    raise exception 'meses y montos no coinciden';
  end if;

  select numero into casa_num from casas where id = p_casa_id;
  if casa_num is null then
    raise exception 'casa inexistente';
  end if;

  -- RF-8: rechazar si algún mes ya está pagado (vigente) por esta casa
  if exists (
    select 1 from pagos_expensas_meses pm
    where pm.casa_id = p_casa_id and pm.vigente and pm.mes = any(p_meses)
  ) then
    raise exception 'mes ya pagado por esta casa';
  end if;

  -- Los meses deben tener período definido en la gestión
  if exists (
    select 1 from unnest(p_meses) m
    where not exists (
      select 1 from periodos_expensas pe
      where pe.gestion_id = p_gestion_id and pe.mes = m
    )
  ) then
    raise exception 'mes sin periodo definido';
  end if;

  insert into pagos_expensas (gestion_id, casa_id, monto_total, comprobante_url, fecha_pago)
  values (p_gestion_id, p_casa_id, p_monto_total, p_comprobante_url, p_fecha_pago)
  returning * into pago;

  for i in 1 .. array_length(p_meses, 1) loop
    insert into transacciones (gestion_id, tipo, monto, categoria, descripcion, fecha, comprobante_url, autor)
    values (p_gestion_id, 'ingreso', p_montos_mes[i], 'expensas',
            'Expensa ' || p_meses[i] || ' — Casa ' || casa_num, p_fecha_pago, p_comprobante_url, 'vecino')
    returning id into tid;

    insert into pagos_expensas_meses (pago_id, casa_id, mes, monto_mes, transaccion_id)
    values (pago.id, p_casa_id, p_meses[i], p_montos_mes[i], tid);
  end loop;

  return pago;
end;
$$;

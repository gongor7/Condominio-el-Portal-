-- ============================================================
-- Spec-005: multas, fecha límite, modalidad de reservas, casa en aportes
-- ============================================================

create table if not exists multas (
  id uuid primary key default gen_random_uuid(),
  gestion_id uuid not null references gestiones(id),
  casa_id uuid not null references casas(id),
  monto numeric(12,2) not null check (monto > 0),
  motivo text not null,
  estado text not null default 'impaga' check (estado in ('impaga','pagada','anulada')),
  fecha date not null default current_date,
  comprobante_url text,
  fecha_pago date,
  transaccion_id uuid references transacciones(id),
  anulado_motivo text,
  anulado_en timestamptz,
  autor text not null default 'responsable',
  creado_en timestamptz not null default now()
);

create index if not exists idx_multas_casa_estado on multas(casa_id, estado);

alter table multas enable row level security;

-- Fecha límite de pago por período (null = nunca vence)
alter table periodos_expensas add column if not exists fecha_limite date;

-- Reservas: casa vinculada y modalidad casa|todos
alter table reservas add column if not exists casa_id uuid references casas(id);
alter table reservas add column if not exists modalidad text not null default 'casa'
  check (modalidad in ('casa','todos'));

-- Aportes de campaña vinculados a casa (históricos siguen con nombre libre)
alter table aportes add column if not exists casa_id uuid references casas(id);

-- ============================================================
-- RF-3: pago de multa atómico (marca pagada + ingreso "multas")
-- El ingreso se registra en la gestión que pase el llamador
-- (multas impagas persisten entre gestiones).
-- ============================================================
create or replace function pagar_multa(
  p_multa_id uuid,
  p_gestion_id uuid,
  p_comprobante_url text,
  p_fecha_pago date,
  p_monto numeric
) returns multas
language plpgsql
security definer
as $$
declare
  m multas;
  tid uuid;
  casa_num int;
begin
  select * into m from multas where id = p_multa_id for update;
  if m.id is null then
    raise exception 'multa inexistente';
  end if;
  if m.estado <> 'impaga' then
    raise exception 'la multa no está impaga';
  end if;
  if p_monto < m.monto - 0.005 then
    raise exception 'pago incompleto: la multa es %', m.monto;
  end if;

  select numero into casa_num from casas where id = m.casa_id;

  insert into transacciones (gestion_id, tipo, monto, categoria, descripcion, fecha, comprobante_url, autor)
  values (p_gestion_id, 'ingreso', p_monto, 'multas',
          'Multa Casa ' || casa_num || ': ' || m.motivo, p_fecha_pago, p_comprobante_url, 'vecino')
  returning id into tid;

  update multas
  set estado = 'pagada', comprobante_url = p_comprobante_url,
      fecha_pago = p_fecha_pago, transaccion_id = tid
  where id = p_multa_id
  returning * into m;

  return m;
end;
$$;

-- ============================================================
-- crear_reserva_con_ingreso v2: modalidad 'todos' (RF-9) y casa obligatoria
-- con pago en modalidad 'casa' (RF-8: sin gratuitas).
-- ============================================================
create or replace function crear_reserva_con_ingreso(
  p_gestion_id uuid,
  p_fecha date,
  p_vecino_nombre text,
  p_vecino_casa text,
  p_monto numeric,
  p_descripcion text,
  p_comprobante_url text,
  p_casa_id uuid default null,
  p_modalidad text default 'casa'
) returns reservas
language plpgsql
security definer
as $$
declare
  r reservas;
begin
  if p_modalidad = 'todos' then
    if p_monto is null or p_monto <> 0 then
      raise exception 'la reserva comunitaria no lleva monto';
    end if;
    insert into reservas (gestion_id, fecha, vecino_nombre, vecino_casa, monto, descripcion, modalidad, casa_id)
    values (p_gestion_id, p_fecha, 'Todos los vecinos', '', 0, coalesce(p_descripcion, ''), 'todos', null)
    returning * into r;
    return r;
  end if;

  -- modalidad 'casa': pago obligatorio (RF-8)
  if p_monto is null or p_monto <= 0 then
    raise exception 'las reservas de casa exigen monto mayor a cero';
  end if;

  insert into reservas (gestion_id, fecha, vecino_nombre, vecino_casa, monto, descripcion, comprobante_url, modalidad, casa_id)
  values (p_gestion_id, p_fecha, p_vecino_nombre, coalesce(p_vecino_casa, ''), p_monto, coalesce(p_descripcion, ''), p_comprobante_url, 'casa', p_casa_id)
  returning * into r;

  insert into transacciones (gestion_id, tipo, monto, categoria, descripcion, fecha, comprobante_url, autor)
  values (p_gestion_id, 'ingreso', p_monto, 'alquiler salón',
          'Reserva salón: ' || coalesce(nullif(p_descripcion, ''), p_vecino_nombre), p_fecha, p_comprobante_url, 'responsable')
  returning id into r.transaccion_id;

  update reservas set transaccion_id = r.transaccion_id where id = r.id;
  return r;
end;
$$;

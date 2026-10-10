-- Endurecimiento del acceso (aditivo): conteo de intentos por IP + retos captcha
create table if not exists acceso_intentos (
  ip text primary key,
  fallos int not null default 0,
  actualizado_en timestamptz not null default now()
);
create table if not exists captcha_reto (
  id uuid primary key default gen_random_uuid(),
  respuesta text not null,
  expira timestamptz not null default (now() + interval '10 minutes')
);
alter table acceso_intentos enable row level security;
alter table captcha_reto enable row level security;

-- Incremento atómico de fallos por IP
create or replace function incrementar_fallos(p_ip text) returns void
language sql security definer as $$
  insert into acceso_intentos (ip, fallos) values (p_ip, 1)
  on conflict (ip) do update set fallos = acceso_intentos.fallos + 1, actualizado_en = now();
$$;

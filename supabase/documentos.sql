-- Spec-009: documentos del condominio (contratos, papeles) — 100% aditivo
create table if not exists documentos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text not null default '',
  categoria text not null default 'otro' check (categoria in ('contrato','escritura','plano','recibo','otro')),
  archivo_url text not null,
  archivo_tipo text not null default 'application/pdf',
  subido_por text not null default 'responsable',
  creado_en timestamptz not null default now()
);
create index if not exists idx_documentos_creado on documentos(creado_en desc);
alter table documentos enable row level security;
insert into storage.buckets (id, name, public) values ('documentos','documentos', true)
on conflict (id) do nothing;

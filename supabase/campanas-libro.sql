-- Spec-011: enlace de campaña a su ingreso consolidado en el libro (aditivo)
alter table campanas add column if not exists transaccion_id uuid references transacciones(id);

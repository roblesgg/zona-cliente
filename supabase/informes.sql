-- =============================================================
-- Zona Cliente — INFORMES (PDF) para proveedores
--
-- Un informe: se genera para un PROVEEDOR (persona tipo 'proveedor'),
-- con un nombre y una fecha, y contiene una selección de oportunidades
-- (agrupadas por fase). El PDF se guarda en un bucket público (se comparte
-- por enlace) y el detalle de lo seleccionado queda en `contenido` (jsonb).
--
-- Idempotente. Supabase -> SQL Editor -> pega -> Run (o conexión directa).
-- =============================================================

create table if not exists informes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  proveedor_id uuid references personas(id) on delete set null,
  nombre       text not null,
  fecha        date not null default current_date,
  pdf_ruta     text,                                  -- ruta en el bucket público 'informes'
  contenido    jsonb not null default '{}'::jsonb,    -- snapshot: oportunidades y campos elegidos
  creado_en    timestamptz not null default now(),
  borrado_en   timestamptz
);

alter table informes enable row level security;
drop policy if exists "propios" on informes;
create policy "propios" on informes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists idx_informes_user      on informes(user_id);
create index if not exists idx_informes_proveedor on informes(proveedor_id);

-- Bucket PÚBLICO para los PDFs (se envían por enlace a WhatsApp/correo).
-- La ruta lleva el uid del dueño como primera carpeta y un id aleatorio,
-- así el enlace es privado por ser inadivinable, pero accesible por quien lo reciba.
insert into storage.buckets (id, name, public) values ('informes','informes', true)
  on conflict (id) do nothing;

-- Escritura (subir/reemplazar/borrar): solo el dueño en su carpeta. Lectura: pública.
drop policy if exists "informes_escritura" on storage.objects;
create policy "informes_escritura" on storage.objects for all to authenticated
  using (bucket_id='informes' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id='informes' and (storage.foldername(name))[1] = auth.uid()::text);

-- Purga de la papelera: incluir también los informes borrados a los 3 meses.
alter table informes add column if not exists borrado_en timestamptz;

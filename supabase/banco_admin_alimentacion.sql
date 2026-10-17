-- Migración: Soporte para datos bancarios centralizados de la administración (Cobro de Alimentación / Menús)
-- Archivo: supabase/banco_admin_alimentacion.sql

-- 1. Agregar columna banco_identificacion a configuracion_general (si no existe)
ALTER TABLE IF EXISTS public.configuracion_general
  ADD COLUMN IF NOT EXISTS banco_identificacion TEXT;

COMMENT ON COLUMN public.configuracion_general.banco_identificacion IS 'Cédula o NIT del titular de la cuenta bancaria de la administración Paraíso Terrenal para cobro de alimentación y menús';

-- 2. Asegurar que las columnas de banco en configuracion_general existan
ALTER TABLE IF EXISTS public.configuracion_general
  ADD COLUMN IF NOT EXISTS banco_nombre TEXT DEFAULT 'Bancolombia',
  ADD COLUMN IF NOT EXISTS banco_tipo_cuenta TEXT DEFAULT 'Ahorros',
  ADD COLUMN IF NOT EXISTS banco_cuenta TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS banco_titular TEXT DEFAULT 'Administración Paraíso Terrenal';

-- 3. Notificación de éxito
DO $$
BEGIN
  RAISE NOTICE 'Columnas bancarias de la administración verificadas y migradas exitosamente en configuracion_general.';
END $$;

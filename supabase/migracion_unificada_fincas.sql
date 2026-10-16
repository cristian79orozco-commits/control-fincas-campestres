-- =============================================================================
-- MIGRACIÓN UNIFICADA: CAPACIDAD MÍNIMA, VALOR MASCOTA Y DATOS BANCARIOS EN FINCAS
-- Control de Fincas Campestres
-- Ejecutar en el SQL Editor del dashboard de Supabase (https://supabase.com/dashboard)
-- =============================================================================

-- 1. Agregar columnas a la tabla fincas si aún no existen
ALTER TABLE public.fincas 
  ADD COLUMN IF NOT EXISTS capacidad_minima INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS valor_mascota NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS banco_nombre TEXT DEFAULT 'Bancolombia',
  ADD COLUMN IF NOT EXISTS banco_tipo_cuenta TEXT DEFAULT 'Ahorros',
  ADD COLUMN IF NOT EXISTS banco_cuenta TEXT,
  ADD COLUMN IF NOT EXISTS banco_titular TEXT,
  ADD COLUMN IF NOT EXISTS banco_identificacion TEXT;

-- 2. Asegurar que las fincas existentes tengan valores iniciales válidos
UPDATE public.fincas
SET capacidad_minima = 1
WHERE capacidad_minima IS NULL OR capacidad_minima < 1;

UPDATE public.fincas
SET valor_mascota = 0
WHERE valor_mascota IS NULL;

-- 3. Documentar las columnas
COMMENT ON COLUMN public.fincas.capacidad_minima IS 'Capacidad mínima de personas requerida para poder cotizar o reservar la finca campestre';
COMMENT ON COLUMN public.fincas.valor_mascota IS 'Valor adicional por mascota cuando la política es con costo';
COMMENT ON COLUMN public.fincas.banco_nombre IS 'Nombre del banco o entidad financiera donde se consigna el anticipo al dueño';
COMMENT ON COLUMN public.fincas.banco_tipo_cuenta IS 'Tipo de cuenta: Ahorros, Corriente, Billetera digital';
COMMENT ON COLUMN public.fincas.banco_cuenta IS 'Número de cuenta o celular donde se consigna el anticipo';
COMMENT ON COLUMN public.fincas.banco_titular IS 'Nombre completo del titular / dueño de la finca';
COMMENT ON COLUMN public.fincas.banco_identificacion IS 'Cédula o NIT del titular para transferencias interbancarias';


-- =============================================================================
-- MIGRACIÓN: CAPACIDAD MÍNIMA DE PERSONAS PARA FINCAS CAMPESTRES
-- Control de Fincas Campestres
-- =============================================================================

-- 1. Agregar columna capacidad_minima a la tabla fincas si no existe
ALTER TABLE public.fincas 
  ADD COLUMN IF NOT EXISTS capacidad_minima INTEGER DEFAULT 1;

-- 2. Asegurar que las fincas existentes tengan al menos 1 persona como mínimo
UPDATE public.fincas
SET capacidad_minima = 1
WHERE capacidad_minima IS NULL OR capacidad_minima < 1;

-- 3. Documentar la columna
COMMENT ON COLUMN public.fincas.capacidad_minima IS 'Capacidad mínima de personas requerida para poder cotizar o reservar la finca campestre';

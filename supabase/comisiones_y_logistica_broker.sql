-- =============================================================================
-- MIGRACIÓN: COMISIONES DEL BROKER Y LOGÍSTICA DE ALIMENTACIÓN
-- Control de Fincas Campestres
-- =============================================================================

-- 1. Añadir columnas de comisión y contacto del dueño a la tabla fincas
ALTER TABLE public.fincas 
  ADD COLUMN IF NOT EXISTS porcentaje_comision NUMERIC(5,2) DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS tipo_comision TEXT DEFAULT 'porcentaje',
  ADD COLUMN IF NOT EXISTS valor_comision_fija NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS propietario_nombre TEXT,
  ADD COLUMN IF NOT EXISTS propietario_telefono TEXT;

-- 2. Añadir seguimiento de comisión y compras a la tabla reservas
ALTER TABLE public.reservas 
  ADD COLUMN IF NOT EXISTS comision_porcentaje NUMERIC(5,2) DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS comision_monto NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS comision_estado TEXT DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS comision_fecha_cobro TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS alimentacion_compras_listas BOOLEAN DEFAULT FALSE;

-- 3. Crear índices para búsquedas ultra-rápidas a 60 FPS
CREATE INDEX IF NOT EXISTS idx_reservas_comision_estado ON public.reservas(comision_estado);
CREATE INDEX IF NOT EXISTS idx_reservas_alimentacion_compras ON public.reservas(alimentacion_compras_listas);


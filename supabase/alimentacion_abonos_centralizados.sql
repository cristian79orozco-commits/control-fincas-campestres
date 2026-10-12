-- =============================================================================
-- MIGRACIÓN: ABONOS Y ESTADOS DE ALIMENTACIÓN EN RESERVAS
-- Control de Fincas Campestres
-- =============================================================================

-- 1. Agregar columnas a la tabla reservas para control explícito de alimentación
ALTER TABLE IF EXISTS public.reservas
  ADD COLUMN IF NOT EXISTS estado_alimentacion TEXT DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS monto_pagado_alimentacion NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saldo_pendiente_alimentacion NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_pago_alimentacion TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metodo_pago_alimentacion TEXT;

-- 2. Asegurar comentarios explicativos para documentación y administración
COMMENT ON COLUMN public.reservas.estado_alimentacion IS 'Estado del servicio de alimentación: pendiente, parcial, pagada, cancelada';
COMMENT ON COLUMN public.reservas.monto_pagado_alimentacion IS 'Monto total efectivamente abonado por concepto de alimentación';
COMMENT ON COLUMN public.reservas.saldo_pendiente_alimentacion IS 'Saldo restante por cobrar de alimentación a favor de la administración';
COMMENT ON COLUMN public.reservas.fecha_pago_alimentacion IS 'Fecha/hora del último pago o abono registrado para alimentación';
COMMENT ON COLUMN public.reservas.metodo_pago_alimentacion IS 'Método de pago utilizado para el abono de alimentación';

-- 3. Índices para agilizar consultas y reportes
CREATE INDEX IF NOT EXISTS idx_reservas_estado_alimentacion ON public.reservas(estado_alimentacion);

-- 4. Sincronizar datos históricos existentes desde cotizacion_snapshot si aplica
UPDATE public.reservas
SET
  estado_alimentacion = COALESCE(estado_alimentacion, cotizacion_snapshot->>'estado_alimentacion', CASE WHEN costo_alimentacion > 0 THEN 'pendiente' ELSE NULL END),
  monto_pagado_alimentacion = COALESCE(monto_pagado_alimentacion, (cotizacion_snapshot->>'monto_pagado_alimentacion')::numeric, CASE WHEN cotizacion_snapshot->>'estado_alimentacion' = 'pagada' THEN costo_alimentacion ELSE 0 END),
  saldo_pendiente_alimentacion = COALESCE(saldo_pendiente_alimentacion, (cotizacion_snapshot->>'saldo_pendiente_alimentacion')::numeric, CASE WHEN cotizacion_snapshot->>'estado_alimentacion' = 'pagada' THEN 0 ELSE costo_alimentacion END),
  fecha_pago_alimentacion = COALESCE(fecha_pago_alimentacion, (cotizacion_snapshot->>'fecha_pago_alimentacion')::timestamptz),
  metodo_pago_alimentacion = COALESCE(metodo_pago_alimentacion, cotizacion_snapshot->>'metodo_pago_alimentacion')
WHERE cotizacion_snapshot IS NOT NULL;

-- ========================================================================
-- Migración: Columnas para Regla Operativa de Alimentación en Grupos
-- Tabla objetivo: configuracion_general
-- Permite configurar la regla de requisito mínimo de planes de alimentación
-- para grupos pequeños (ej. grupos de hasta 10 personas requieren 2 servicios)
-- ========================================================================

ALTER TABLE IF EXISTS public.configuracion_general
  ADD COLUMN IF NOT EXISTS regla_alimentacion_activa BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS regla_alimentacion_max_personas INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS regla_alimentacion_min_servicios INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS regla_alimentacion_mensaje TEXT DEFAULT 'Para grupos de hasta 10 personas, como mínimo se debe contratar servicio de desayuno y almuerzo (mínimo 2 servicios de alimentación complementaria).';

COMMENT ON COLUMN public.configuracion_general.regla_alimentacion_activa IS 'Indica si la regla de servicio mínimo de alimentación para grupos pequeños está activa';
COMMENT ON COLUMN public.configuracion_general.regla_alimentacion_max_personas IS 'Umbral máximo de personas en el grupo para que aplique la regla (ej: 10)';
COMMENT ON COLUMN public.configuracion_general.regla_alimentacion_min_servicios IS 'Cantidad mínima de servicios de alimentación que debe contratar el grupo (ej: 2)';
COMMENT ON COLUMN public.configuracion_general.regla_alimentacion_mensaje IS 'Mensaje informativo o justificación de rentabilidad para el cliente';

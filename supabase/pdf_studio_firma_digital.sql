-- =============================================================================
-- MIGRACIÓN: PDF STUDIO PRO, FIRMA DIGITAL & CALIBRACIÓN DINÁMICA
-- Proyecto: Control de Fincas Campestres — Paraíso Terrenal
-- Archivo: supabase/pdf_studio_firma_digital.sql
-- =============================================================================

-- 1. Asegurar que las columnas principales existan en configuracion_general
ALTER TABLE IF EXISTS public.configuracion_general
  ADD COLUMN IF NOT EXISTS plantillas_pdf JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS firma_digital_url TEXT DEFAULT '';

-- 2. Enriquecer el JSONB de plantillas_pdf con las nuevas claves de diseño y calibración
--    sin sobreescribir los textos o títulos que el usuario ya haya configurado.
UPDATE public.configuracion_general
SET plantillas_pdf = jsonb_build_object(
  'firma_posicion', 'centro',
  'firma_escala', 1.0,
  'firma_ancho_mm', 48,
  'firma_alto_mm', 16,
  'firma_mostrar_linea', true,
  'firma_mostrar_cargo', true,
  'firma_mostrar_leyenda', true,
  'firma_leyenda_personalizada', 'Firma Autorizada Paraíso Terrenal',
  'tema_color_primario', '#1a6b5e',
  'tema_color_acento', '#d4ac3f',
  'estilo_encabezado', 'corporativo',
  'mostrar_marca_agua', false,
  'texto_marca_agua', 'COPIA OFICIAL',
  'tamano_fuente_cuerpo', 'estandar'
) || COALESCE(plantillas_pdf, '{}'::jsonb)
WHERE id = 'general';

-- 3. Asegurar que configuracion_general esté vinculada a la suscripción en tiempo real
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.configuracion_general;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- 4. Notificar finalización
COMMENT ON COLUMN public.configuracion_general.plantillas_pdf IS 'Plantillas PDF con soporte de firma digital proporcional, temas cromáticos y marcas de agua';

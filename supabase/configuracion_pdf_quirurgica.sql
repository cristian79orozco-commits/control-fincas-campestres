-- =============================================================================
-- MIGRACIÓN QUIRÚRGICA: CONFIGURACIÓN GENERAL Y PLANTILLAS PDF
-- Proyecto: Control de Fincas Campestres — Paraíso Terrenal
-- Archivo: supabase/configuracion_pdf_quirurgica.sql
-- =============================================================================

-- 1. Asegurar columna plantillas_pdf en configuracion_general
ALTER TABLE IF EXISTS public.configuracion_general
  ADD COLUMN IF NOT EXISTS plantillas_pdf JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.configuracion_general.plantillas_pdf IS 'Configuraciones y textos personalizados por tipo de documento PDF (títulos, vigencia, cláusulas, políticas, firmas)';

-- 2. Asegurar columnas bancarias de la administración Paraíso Terrenal (Cobro de Alimentación / Menús)
ALTER TABLE IF EXISTS public.configuracion_general
  ADD COLUMN IF NOT EXISTS banco_nombre TEXT DEFAULT 'Bancolombia',
  ADD COLUMN IF NOT EXISTS banco_tipo_cuenta TEXT DEFAULT 'Ahorros',
  ADD COLUMN IF NOT EXISTS banco_cuenta TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS banco_titular TEXT DEFAULT 'Administración Paraíso Terrenal',
  ADD COLUMN IF NOT EXISTS banco_identificacion TEXT DEFAULT '';

-- 3. Asegurar columnas de regla operativa de alimentación mínima
ALTER TABLE IF EXISTS public.configuracion_general
  ADD COLUMN IF NOT EXISTS regla_alimentacion_activa BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS regla_alimentacion_max_personas INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS regla_alimentacion_min_servicios INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS regla_alimentacion_mensaje TEXT DEFAULT 'Para grupos de hasta 10 personas, como mínimo se debe contratar servicio de desayuno y almuerzo (mínimo 2 servicios de alimentación complementaria).';

-- 4. Actualizar o insertar registro base con valores predeterminados de fábrica si está vacío
INSERT INTO public.configuracion_general (
  id,
  nombre_empresa,
  nit,
  eslogan,
  telefono,
  whatsapp,
  correo,
  direccion,
  ciudad,
  sitio_web,
  banco_nombre,
  banco_tipo_cuenta,
  banco_cuenta,
  banco_titular,
  banco_identificacion,
  plantillas_pdf
) VALUES (
  'general',
  'Paraíso Terrenal',
  '900.123.456-7',
  'Fincas de Alquiler · Experiencias exclusivas y descanso en la naturaleza',
  '+57 317 682 7093',
  '573176827093',
  'reservas@fincascampestres.com',
  'Santa Elena, El Cerrito, Valle del Cauca',
  'Valle del Cauca, Colombia',
  'https://fincascampestres.com',
  'Bancolombia',
  'Ahorros',
  '',
  'Paraíso Terrenal - Fincas de Alquiler',
  '',
  '{
    "titulo_cotizacion": "COTIZACIÓN FORMAL DE SERVICIOS",
    "titulo_separacion": "DOCUMENTO DE SEPARACIÓN",
    "titulo_abono": "COMPROBANTE DE ABONO / PAGO",
    "titulo_estado_cuenta": "ESTADO DE CUENTA CONSOLIDADO",
    "titulo_paz_salvo": "CERTIFICADO DE PAZ Y SALVO",
    "titulo_propuesta_menu": "PROPUESTA DE SERVICIO GASTRONÓMICO",
    "instruccion_abono_cotizacion": "ABONO REQUERIDO (50% ALOJAMIENTO PARA BLOQUEAR DISPONIBILIDAD)",
    "vigencia_cotizacion": "• Esta cotización tiene una vigencia de 5 días hábiles a partir de su emisión.\n• Para formalizar y bloquear la disponibilidad de las fechas se requiere un anticipo del 50%.\n• Los precios pactados se respetan únicamente con la confirmación oportuna de la reserva.",
    "clausulas_separacion": "• La separación garantiza la disponibilidad de la finca para las fechas pactadas.\n• El saldo restante de alojamiento debe cancelarse al momento del check-in directamente al propietario.\n• En caso de cancelación por el cliente, el anticipo no será reembolsable salvo acuerdo formal previo.\n• El huésped es responsable del cuidado del inmueble, enseres e inventario entregados.",
    "politicas_cancelacion": "Cancelaciones con más de 15 días calendario de anticipación permiten reprogramación sujeta a disponibilidad dentro del mismo año. Cancelaciones posteriores conllevan la pérdida de la suma de separación pactada.",
    "texto_paz_salvo": "En consecuencia, se expide el presente paz y salvo a plena conformidad de las partes.",
    "condiciones_gastronomicas": "• Preparación artesanal con ingredientes frescos seleccionados.\n• Se requiere anticipo del 50% de alimentación para garantizar compras e insumos.\n• Modificaciones en número de comensales deben avisarse con 48 horas de anticipación.\n• Incluye menaje campestre y servicio en mesa durante los horarios acordados.",
    "pie_firma_admin": "Administración • Paraíso Terrenal",
    "pie_firma_cliente": "Firma del Cliente"
  }'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  banco_nombre = COALESCE(public.configuracion_general.banco_nombre, EXCLUDED.banco_nombre),
  banco_tipo_cuenta = COALESCE(public.configuracion_general.banco_tipo_cuenta, EXCLUDED.banco_tipo_cuenta),
  banco_titular = COALESCE(public.configuracion_general.banco_titular, EXCLUDED.banco_titular),
  plantillas_pdf = COALESCE(public.configuracion_general.plantillas_pdf, EXCLUDED.plantillas_pdf);

-- 5. Garantizar Políticas de Seguridad Row Level Security (RLS)
ALTER TABLE public.configuracion_general ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica configuracion general" ON public.configuracion_general;
CREATE POLICY "Lectura publica configuracion general"
  ON public.configuracion_general FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin gestion total configuracion general" ON public.configuracion_general;
CREATE POLICY "Admin gestion total configuracion general"
  ON public.configuracion_general FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Insercion/actualizacion anonima configuracion general" ON public.configuracion_general;
CREATE POLICY "Insercion/actualizacion anonima configuracion general"
  ON public.configuracion_general FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- 6. Garantizar que configuracion_general esté en la publicación de Realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.configuracion_general;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

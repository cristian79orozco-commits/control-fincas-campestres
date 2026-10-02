-- ================================================================
-- FASE 4 — Configuración General (Empresa y Documentos)
-- Migración: tabla configuracion_general, valores por defecto y políticas RLS
-- ================================================================

CREATE TABLE IF NOT EXISTS public.configuracion_general (
    id TEXT PRIMARY KEY DEFAULT 'general',
    
    -- 1. Datos de Empresa
    nombre_empresa TEXT NOT NULL DEFAULT 'Control de Fincas Campestres',
    nit TEXT DEFAULT '900.123.456-7',
    eslogan TEXT DEFAULT 'Experiencias exclusivas y descanso en la naturaleza',
    logo_url TEXT,
    telefono TEXT DEFAULT '+57 317 682 7093',
    whatsapp TEXT NOT NULL DEFAULT '573176827093',
    correo TEXT DEFAULT 'reservas@fincascampestres.com',
    direccion TEXT DEFAULT 'Santa Elena, El Cerrito, Valle del Cauca',
    ciudad TEXT DEFAULT 'Valle del Cauca, Colombia',
    sitio_web TEXT DEFAULT 'https://fincascampestres.com',
    redes_sociales JSONB DEFAULT '{"facebook": "https://facebook.com", "instagram": "https://instagram.com", "tiktok": "https://tiktok.com"}'::jsonb,

    -- 2. Configuración de Documentos
    doc_logo_url TEXT,
    doc_encabezado TEXT DEFAULT 'CONTROL DE FINCAS CAMPESTRES — ALQUILER Y SERVICIOS TURÍSTICOS',
    doc_pie_pagina TEXT DEFAULT 'Control de Fincas Campestres • Documento oficial generado automáticamente • Santa Elena, Valle del Cauca',
    doc_contacto_info TEXT DEFAULT 'WhatsApp: +57 317 682 7093 | reservas@fincascampestres.com | Santa Elena, Valle',
    terminos_condiciones TEXT DEFAULT '• La separación garantiza la reserva y bloquea la disponibilidad para las fechas pactadas.
• El saldo pendiente debe cancelarse en su totalidad antes del ingreso a la finca.
• En caso de cancelación por el cliente, el anticipo no será reembolsable salvo acuerdo formal previo.
• El huésped es responsable del cuidado del inmueble, enseres e inventario entregados.
• La capacidad máxima de personas pactada en este documento debe respetarse estrictamente.',
    textos_legales TEXT DEFAULT 'Documento expedido de conformidad con las disposiciones turísticas y comerciales colombianas vigentes. Válido como soporte contractual de reserva de finca campestre y servicios complementarios.',
    politicas_cancelacion TEXT DEFAULT 'Cancelaciones con más de 15 días calendario de anticipación permiten reprogramación sujeta a disponibilidad dentro del mismo año. Cancelaciones posteriores conllevan la pérdida de la suma de separación.',

    -- 3. Numeración y Consecutivos
    prefijo_cotizacion TEXT NOT NULL DEFAULT 'COT-',
    siguiente_cotizacion INTEGER NOT NULL DEFAULT 1001,
    prefijo_separacion TEXT NOT NULL DEFAULT 'SEP-',
    siguiente_separacion INTEGER NOT NULL DEFAULT 1001,
    prefijo_abono TEXT NOT NULL DEFAULT 'PAG-',
    siguiente_abono INTEGER NOT NULL DEFAULT 1001,
    prefijo_estado_cuenta TEXT NOT NULL DEFAULT 'EC-',
    siguiente_estado_cuenta INTEGER NOT NULL DEFAULT 1001,
    prefijo_paz_salvo TEXT NOT NULL DEFAULT 'PS-',
    siguiente_paz_salvo INTEGER NOT NULL DEFAULT 1001,
    prefijo_propuesta_menu TEXT NOT NULL DEFAULT 'PROP-',
    siguiente_propuesta_menu INTEGER NOT NULL DEFAULT 1001,

    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS set_configuracion_general_updated_at ON public.configuracion_general;
CREATE TRIGGER set_configuracion_general_updated_at
    BEFORE UPDATE ON public.configuracion_general
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Registro inicial por defecto si no existe
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
    doc_encabezado,
    doc_pie_pagina,
    doc_contacto_info,
    prefijo_cotizacion,
    siguiente_cotizacion,
    prefijo_separacion,
    siguiente_separacion,
    prefijo_abono,
    siguiente_abono,
    prefijo_estado_cuenta,
    siguiente_estado_cuenta,
    prefijo_paz_salvo,
    siguiente_paz_salvo,
    prefijo_propuesta_menu,
    siguiente_propuesta_menu
)
VALUES (
    'general',
    'Control de Fincas Campestres',
    '900.123.456-7',
    'Experiencias exclusivas y descanso en la naturaleza',
    '+57 317 682 7093',
    '573176827093',
    'reservas@fincascampestres.com',
    'Santa Elena, El Cerrito, Valle del Cauca',
    'Valle del Cauca, Colombia',
    'https://fincascampestres.com',
    'CONTROL DE FINCAS CAMPESTRES — ALQUILER Y SERVICIOS TURÍSTICOS',
    'Control de Fincas Campestres • Documento oficial generado automáticamente • Santa Elena, Valle del Cauca',
    'WhatsApp: +57 317 682 7093 | reservas@fincascampestres.com | Santa Elena, Valle',
    'COT-',
    1001,
    'SEP-',
    1001,
    'PAG-',
    1001,
    'EC-',
    1001,
    'PS-',
    1001,
    'PROP-',
    1001
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ---------------------------------------------------------------
ALTER TABLE public.configuracion_general ENABLE ROW LEVEL SECURITY;

-- Lectura pública para que todo el sistema y clientes lean datos de empresa y documentos
DROP POLICY IF EXISTS "Lectura publica configuracion general" ON public.configuracion_general;
CREATE POLICY "Lectura publica configuracion general"
    ON public.configuracion_general FOR SELECT
    TO anon, authenticated
    USING (true);

-- Administradores autenticados tienen control total
DROP POLICY IF EXISTS "Admin gestion total configuracion general" ON public.configuracion_general;
CREATE POLICY "Admin gestion total configuracion general"
    ON public.configuracion_general FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Permiso de inserción/actualización de respaldo
DROP POLICY IF EXISTS "Insercion/actualizacion anonima configuracion general" ON public.configuracion_general;
CREATE POLICY "Insercion/actualizacion anonima configuracion general"
    ON public.configuracion_general FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

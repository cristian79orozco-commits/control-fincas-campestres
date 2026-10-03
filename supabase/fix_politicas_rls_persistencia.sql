-- ==============================================================================
-- SCRIPT DE MIGRACIÓN: CORRECCIÓN COMPLETA DE POLÍTICAS RLS Y PERSISTENCIA
-- Proyecto: Control de Fincas Campestres
-- Ejecutar en: Supabase SQL Editor
-- ==============================================================================

-- 0. Función de utilidad para timestamps automáticos
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Asegurar existencia de tabla COMUNICACIONES
CREATE TABLE IF NOT EXISTS public.comunicaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    reserva_id UUID REFERENCES public.reservas(id) ON DELETE SET NULL,
    cotizacion_id UUID REFERENCES public.cotizaciones(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL DEFAULT 'general',
    destinatario TEXT,
    telefono TEXT,
    mensaje TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'enviado',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comunicaciones_cliente ON public.comunicaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_comunicaciones_reserva ON public.comunicaciones(reserva_id);

-- 2. Asegurar existencia de tabla CIERRES_RESERVAS
CREATE TABLE IF NOT EXISTS public.cierres_reservas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reserva_id UUID NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
    fecha_cierre TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    responsable TEXT DEFAULT 'Administrador',
    estado_cierre TEXT NOT NULL DEFAULT 'completada'
        CHECK (estado_cierre IN ('completada', 'cancelada', 'no_show')),
    calificacion INTEGER CHECK (calificacion BETWEEN 1 AND 5),
    estado_entrega_finca TEXT DEFAULT 'excelente'
        CHECK (estado_entrega_finca IN ('excelente', 'bueno', 'con_observaciones', 'danos_reportados')),
    deposito_garantia_devuelto BOOLEAN DEFAULT true,
    valor_deposito_devuelto NUMERIC(12,2) DEFAULT 0,
    notas_cierre TEXT,
    observaciones_entrega TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_cierre_reserva UNIQUE (reserva_id)
);

CREATE INDEX IF NOT EXISTS idx_cierres_reserva_id ON public.cierres_reservas(reserva_id);
CREATE INDEX IF NOT EXISTS idx_cierres_fecha ON public.cierres_reservas(fecha_cierre);
CREATE INDEX IF NOT EXISTS idx_cierres_estado ON public.cierres_reservas(estado_cierre);

-- 3. Asegurar existencia de tabla CONFIGURACION_GENERAL
CREATE TABLE IF NOT EXISTS public.configuracion_general (
    id TEXT PRIMARY KEY DEFAULT 'general',
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
    prefijo_cotizacion TEXT NOT NULL DEFAULT '',
    siguiente_cotizacion INTEGER NOT NULL DEFAULT 1001,
    prefijo_separacion TEXT NOT NULL DEFAULT '',
    siguiente_separacion INTEGER NOT NULL DEFAULT 1001,
    prefijo_abono TEXT NOT NULL DEFAULT '',
    siguiente_abono INTEGER NOT NULL DEFAULT 1001,
    prefijo_estado_cuenta TEXT NOT NULL DEFAULT '',
    siguiente_estado_cuenta INTEGER NOT NULL DEFAULT 1001,
    prefijo_paz_salvo TEXT NOT NULL DEFAULT '',
    siguiente_paz_salvo INTEGER NOT NULL DEFAULT 1001,
    prefijo_propuesta_menu TEXT NOT NULL DEFAULT '',
    siguiente_propuesta_menu INTEGER NOT NULL DEFAULT 1001,
    banco_nombre TEXT DEFAULT 'Bancolombia',
    banco_tipo_cuenta TEXT DEFAULT 'Ahorros',
    banco_cuenta TEXT DEFAULT '',
    banco_titular TEXT DEFAULT 'Control de Fincas Campestres',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insertar configuración inicial si no existe
INSERT INTO public.configuracion_general (id) 
VALUES ('general') 
ON CONFLICT (id) DO NOTHING;

-- 4. Asegurar existencia de tabla CONTENIDO_SITIO
CREATE TABLE IF NOT EXISTS public.contenido_sitio (
    id TEXT PRIMARY KEY DEFAULT 'principal',
    orden_secciones JSONB NOT NULL DEFAULT '["banner", "hero", "destacados", "estado", "filtros", "catalogo", "menus", "faq"]'::jsonb,
    banner_visible BOOLEAN NOT NULL DEFAULT true,
    banner_texto TEXT NOT NULL DEFAULT '🌿 ¡Reserva directa sin comisiones! Consulta fechas libres en nuestro calendario y cotiza al instante por WhatsApp.',
    banner_link_texto TEXT DEFAULT 'Ver disponibilidad',
    banner_link_url TEXT DEFAULT '#catalogo',
    banner_tipo TEXT NOT NULL DEFAULT 'promo',
    hero_visible BOOLEAN NOT NULL DEFAULT true,
    hero_eyebrow TEXT NOT NULL DEFAULT 'Reserva directa sin comisiones',
    hero_titulo TEXT NOT NULL DEFAULT 'Tu escapada campestre empieza aquí',
    hero_subtitulo TEXT NOT NULL DEFAULT 'Elige la finca ideal en Santa Elena, consulta la disponibilidad en tiempo real en nuestro calendario y cotiza tu reserva instantáneamente por WhatsApp.',
    hero_cta_texto TEXT NOT NULL DEFAULT 'Explorar fincas disponibles',
    hero_cta_secundario_texto TEXT DEFAULT 'Conocer gastronomía',
    hero_mostrar_metricas BOOLEAN NOT NULL DEFAULT true,
    hero_mostrar_pasos BOOLEAN NOT NULL DEFAULT true,
    hero_paso_1 TEXT NOT NULL DEFAULT 'Elige tus fechas',
    hero_paso_2 TEXT NOT NULL DEFAULT 'Consulta el calendario',
    hero_paso_3 TEXT NOT NULL DEFAULT 'Cotiza por WhatsApp',
    hero_imagen_url TEXT,
    hero_badge_ubicacion TEXT DEFAULT 'Santa Elena, El Cerrito, Valle',
    destacados_visible BOOLEAN NOT NULL DEFAULT true,
    destacados_titulo TEXT NOT NULL DEFAULT '¿Por qué reservar con nosotros?',
    destacados_subtitulo TEXT NOT NULL DEFAULT 'Garantizamos tranquilidad, transparencia y el mejor descanso en el Valle del Cauca',
    destacados_items JSONB,
    estado_visible BOOLEAN NOT NULL DEFAULT true,
    estado_titulo TEXT NOT NULL DEFAULT 'Ocupación de Fincas en Tiempo Real',
    estado_subtitulo TEXT NOT NULL DEFAULT 'Revisa la ocupación actual para planear tu descanso',
    menus_visible BOOLEAN NOT NULL DEFAULT true,
    menus_titulo TEXT NOT NULL DEFAULT 'Planes de Alimentación & Menús Campestres',
    menus_subtitulo TEXT NOT NULL DEFAULT 'Complementa tu estadía con gastronomía casera de la más alta calidad',
    faq_visible BOOLEAN NOT NULL DEFAULT true,
    faq_titulo TEXT NOT NULL DEFAULT 'Preguntas Frecuentes',
    faq_subtitulo TEXT NOT NULL DEFAULT 'Todo lo que necesitas saber antes de reservar tu estadía',
    faq_items JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insertar contenido inicial si no existe
INSERT INTO public.contenido_sitio (id) 
VALUES ('principal') 
ON CONFLICT (id) DO NOTHING;

-- 5. Asegurar que disponibilidad soporte 'ocupado', 'libre' y 'bloqueado'
ALTER TABLE public.disponibilidad DROP CONSTRAINT IF EXISTS disponibilidad_estado_check;
ALTER TABLE public.disponibilidad DROP CONSTRAINT IF EXISTS check_fechas;

ALTER TABLE public.disponibilidad 
    ADD CONSTRAINT disponibilidad_estado_check 
    CHECK (estado IN ('ocupado', 'libre', 'bloqueado'));

ALTER TABLE public.disponibilidad 
    ADD CONSTRAINT check_fechas 
    CHECK (fecha_fin >= fecha_inicio);

-- 6. Habilitar RLS en todas las tablas
ALTER TABLE public.fincas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disponibilidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cierres_reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_general ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contenido_sitio ENABLE ROW LEVEL SECURITY;

-- 7. POLÍTICAS COMPLETAS DE LECTURA Y ESCRITURA (anon + authenticated)
-- Permite que el sistema opere fluidamente tanto con Supabase Auth como con el modo administrativo de respaldo.

-- RESERVAS:
DROP POLICY IF EXISTS "Acceso total reservas anon y auth" ON public.reservas;
DROP POLICY IF EXISTS "Admin gestion total reservas" ON public.reservas;
CREATE POLICY "Acceso total reservas anon y auth"
    ON public.reservas FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- PAGOS:
DROP POLICY IF EXISTS "Acceso total pagos anon y auth" ON public.pagos;
DROP POLICY IF EXISTS "Admin gestion total pagos" ON public.pagos;
CREATE POLICY "Acceso total pagos anon y auth"
    ON public.pagos FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- DISPONIBILIDAD:
DROP POLICY IF EXISTS "Acceso total disponibilidad anon y auth" ON public.disponibilidad;
DROP POLICY IF EXISTS "Lectura pública de disponibilidad" ON public.disponibilidad;
DROP POLICY IF EXISTS "Admin gestión total disponibilidad" ON public.disponibilidad;
CREATE POLICY "Acceso total disponibilidad anon y auth"
    ON public.disponibilidad FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- CLIENTES:
DROP POLICY IF EXISTS "Acceso total clientes anon y auth" ON public.clientes;
DROP POLICY IF EXISTS "Admin gestion total clientes" ON public.clientes;
DROP POLICY IF EXISTS "Insercion publica clientes" ON public.clientes;
DROP POLICY IF EXISTS "Lectura publica clientes por telefono" ON public.clientes;
DROP POLICY IF EXISTS "Actualizacion publica clientes" ON public.clientes;
CREATE POLICY "Acceso total clientes anon y auth"
    ON public.clientes FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- COTIZACIONES:
DROP POLICY IF EXISTS "Acceso total cotizaciones anon y auth" ON public.cotizaciones;
DROP POLICY IF EXISTS "Admin gestion total cotizaciones" ON public.cotizaciones;
DROP POLICY IF EXISTS "Insercion publica cotizaciones" ON public.cotizaciones;
DROP POLICY IF EXISTS "Lectura publica cotizaciones" ON public.cotizaciones;
CREATE POLICY "Acceso total cotizaciones anon y auth"
    ON public.cotizaciones FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- COMUNICACIONES:
DROP POLICY IF EXISTS "Acceso total comunicaciones anon y auth" ON public.comunicaciones;
DROP POLICY IF EXISTS "Admin gestion total comunicaciones" ON public.comunicaciones;
DROP POLICY IF EXISTS "Insercion controlada comunicaciones" ON public.comunicaciones;
DROP POLICY IF EXISTS "Lectura anonima comunicaciones" ON public.comunicaciones;
CREATE POLICY "Acceso total comunicaciones anon y auth"
    ON public.comunicaciones FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- CIERRES_RESERVAS:
DROP POLICY IF EXISTS "Acceso total cierres_reservas anon y auth" ON public.cierres_reservas;
DROP POLICY IF EXISTS "Admin gestion total cierres_reservas" ON public.cierres_reservas;
DROP POLICY IF EXISTS "Lectura publica cierres_reservas" ON public.cierres_reservas;
CREATE POLICY "Acceso total cierres_reservas anon y auth"
    ON public.cierres_reservas FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- FINCAS Y RELACIONADAS:
DROP POLICY IF EXISTS "Acceso total fincas anon y auth" ON public.fincas;
CREATE POLICY "Acceso total fincas anon y auth"
    ON public.fincas FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- CONFIGURACIÓN GENERAL Y CONTENIDO SITIO:
DROP POLICY IF EXISTS "Acceso total configuracion anon y auth" ON public.configuracion_general;
CREATE POLICY "Acceso total configuracion anon y auth"
    ON public.configuracion_general FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total contenido anon y auth" ON public.contenido_sitio;
CREATE POLICY "Acceso total contenido anon y auth"
    ON public.contenido_sitio FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 8. HABILITAR REPLICACIÓN REALTIME (Transmisión instantánea a dispositivos)
-- Permite que los clientes con la página abierta reciban cambios de disponibilidad en vivo sin recargar
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.disponibilidad;
    EXCEPTION WHEN duplicate_object THEN
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.reservas;
    EXCEPTION WHEN duplicate_object THEN
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.cotizaciones;
    EXCEPTION WHEN duplicate_object THEN
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.contenido_sitio;
    EXCEPTION WHEN duplicate_object THEN
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.configuracion_general;
    EXCEPTION WHEN duplicate_object THEN
    END;
END $$;

-- 9. Recargar esquema de cache de Supabase PostgREST
NOTIFY pgrst, 'reload schema';

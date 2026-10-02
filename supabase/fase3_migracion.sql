-- ================================================================
-- FASE 3 — WhatsApp y Comunicaciones
-- Migración: tabla comunicaciones, auditoría de envíos y políticas RLS
-- ================================================================

CREATE TABLE IF NOT EXISTS public.comunicaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    reserva_id UUID REFERENCES public.reservas(id) ON DELETE SET NULL,
    cotizacion_id UUID REFERENCES public.cotizaciones(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL CHECK (
        tipo IN (
            'cotizacion',
            'separacion',
            'abono',
            'estado_cuenta',
            'paz_salvo',
            'menu',
            'recordatorio_pago',
            'bienvenida',
            'personalizado'
        )
    ),
    destinatario TEXT NOT NULL,
    telefono TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'enviado' CHECK (estado IN ('enviado', 'preparado', 'fallido')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_comunicaciones_cliente ON public.comunicaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_comunicaciones_reserva ON public.comunicaciones(reserva_id);
CREATE INDEX IF NOT EXISTS idx_comunicaciones_cotizacion ON public.comunicaciones(cotizacion_id);
CREATE INDEX IF NOT EXISTS idx_comunicaciones_tipo ON public.comunicaciones(tipo);
CREATE INDEX IF NOT EXISTS idx_comunicaciones_created ON public.comunicaciones(created_at DESC);

-- ---------------------------------------------------------------
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ---------------------------------------------------------------
ALTER TABLE public.comunicaciones ENABLE ROW LEVEL SECURITY;

-- Comunicaciones: administración total para usuarios autenticados
DROP POLICY IF EXISTS "Admin gestion total comunicaciones" ON public.comunicaciones;
CREATE POLICY "Admin gestion total comunicaciones"
    ON public.comunicaciones FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Permiso de inserción/lectura anónima controlada para clientes si se requiere registrar mensaje desde web
DROP POLICY IF EXISTS "Insercion controlada comunicaciones" ON public.comunicaciones;
CREATE POLICY "Insercion controlada comunicaciones"
    ON public.comunicaciones FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Lectura anonima comunicaciones" ON public.comunicaciones;
CREATE POLICY "Lectura anonima comunicaciones"
    ON public.comunicaciones FOR SELECT
    TO anon, authenticated
    USING (true);

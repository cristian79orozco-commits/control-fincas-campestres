-- ================================================================
-- FASE 1 — Panel Administrativo y Gestión de Reservas
-- Migración: tablas clientes, cotizaciones, reservas, pagos
-- ================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------
-- 0. LIMPIEZA PREVIA (Asegurar esquema limpio para Fase 1)
-- ---------------------------------------------------------------
DROP TABLE IF EXISTS public.pagos CASCADE;
DROP TABLE IF EXISTS public.reservas CASCADE;
DROP TABLE IF EXISTS public.cotizaciones CASCADE;
DROP TABLE IF EXISTS public.clientes CASCADE;

-- ---------------------------------------------------------------
-- 1. TABLA: CLIENTES
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    apellido TEXT,
    telefono TEXT,
    whatsapp TEXT,
    correo TEXT,
    observaciones TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

DROP TRIGGER IF EXISTS set_clientes_updated_at ON public.clientes;
CREATE TRIGGER set_clientes_updated_at
    BEFORE UPDATE ON public.clientes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------
-- 2. TABLA: COTIZACIONES
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cotizaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    finca_id UUID NOT NULL REFERENCES public.fincas(id) ON DELETE RESTRICT,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    personas INTEGER NOT NULL DEFAULT 1,
    noches INTEGER GENERATED ALWAYS AS (
        GREATEST(1, (fecha_fin - fecha_inicio))
    ) STORED,
    alimentacion TEXT DEFAULT 'Sin alimentacion',
    precio_base_pp NUMERIC(12,2) NOT NULL DEFAULT 0,
    subtotal_alojamiento NUMERIC(12,2) NOT NULL DEFAULT 0,
    costo_alimentacion NUMERIC(12,2) NOT NULL DEFAULT 0,
    descuento NUMERIC(12,2) NOT NULL DEFAULT 0,
    recargo NUMERIC(12,2) NOT NULL DEFAULT 0,
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    estado TEXT NOT NULL DEFAULT 'borrador'
        CHECK (estado IN ('borrador','cotizada','enviada','pendiente','confirmada','cancelada','vencida')),
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_fechas_cotizacion CHECK (fecha_fin > fecha_inicio)
);

DROP TRIGGER IF EXISTS set_cotizaciones_updated_at ON public.cotizaciones;
CREATE TRIGGER set_cotizaciones_updated_at
    BEFORE UPDATE ON public.cotizaciones
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_cotizaciones_cliente ON public.cotizaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_finca ON public.cotizaciones(finca_id);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_estado ON public.cotizaciones(estado);

-- ---------------------------------------------------------------
-- 3. TABLA: RESERVAS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reservas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cotizacion_id UUID REFERENCES public.cotizaciones(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE RESTRICT,
    finca_id UUID NOT NULL REFERENCES public.fincas(id) ON DELETE RESTRICT,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    personas INTEGER NOT NULL DEFAULT 1,
    valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    separacion NUMERIC(12,2) NOT NULL DEFAULT 0,
    estado TEXT NOT NULL DEFAULT 'activa'
        CHECK (estado IN ('activa','completada','cancelada','no_show')),
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_fechas_reserva CHECK (fecha_fin > fecha_inicio)
);

DROP TRIGGER IF EXISTS set_reservas_updated_at ON public.reservas;
CREATE TRIGGER set_reservas_updated_at
    BEFORE UPDATE ON public.reservas
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_reservas_cliente ON public.reservas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_reservas_finca ON public.reservas(finca_id);
CREATE INDEX IF NOT EXISTS idx_reservas_estado ON public.reservas(estado);
CREATE INDEX IF NOT EXISTS idx_reservas_fechas ON public.reservas(finca_id, fecha_inicio, fecha_fin);

-- ---------------------------------------------------------------
-- 4. TABLA: PAGOS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reserva_id UUID NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL DEFAULT 'abono'
        CHECK (tipo IN ('separacion','abono','pago_total','devolucion')),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    valor NUMERIC(12,2) NOT NULL DEFAULT 0,
    observacion TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pagos_reserva ON public.pagos(reserva_id);

-- ---------------------------------------------------------------
-- 5. RLS (Row Level Security)
-- ---------------------------------------------------------------

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gestion total clientes" ON public.clientes;
CREATE POLICY "Admin gestion total clientes"
    ON public.clientes FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admin gestion total cotizaciones" ON public.cotizaciones;
CREATE POLICY "Admin gestion total cotizaciones"
    ON public.cotizaciones FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admin gestion total reservas" ON public.reservas;
CREATE POLICY "Admin gestion total reservas"
    ON public.reservas FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admin gestion total pagos" ON public.pagos;
CREATE POLICY "Admin gestion total pagos"
    ON public.pagos FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ---------------------------------------------------------------
-- 6. FUNCION: saldo real de una reserva (basado en pagos)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.saldo_reserva(p_reserva_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_total NUMERIC;
    v_pagado NUMERIC;
BEGIN
    SELECT valor_total INTO v_total FROM public.reservas WHERE id = p_reserva_id;
    SELECT COALESCE(SUM(
        CASE tipo
            WHEN 'devolucion' THEN -valor
            ELSE valor
        END
    ), 0) INTO v_pagado FROM public.pagos WHERE reserva_id = p_reserva_id;
    RETURN v_total - v_pagado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

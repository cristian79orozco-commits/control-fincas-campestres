-- ================================================================
-- FASE 6 — Historial y Cierre de Reservas
-- Migración: tabla cierres_reservas, snapshots inmutables en reservas,
-- funciones y políticas RLS para garantizar la integridad histórica
-- ante modificaciones o desactivaciones de clientes o fincas.
-- ================================================================

-- ---------------------------------------------------------------
-- 1. AGREGAR COLUMNAS DE SNAPSHOT Y CIERRE A TABLA RESERVAS
-- ---------------------------------------------------------------
-- Estas columnas preservan de forma inmutable los datos del cliente,
-- finca y cotización al momento de la reserva o de su cierre formal,
-- asegurando que si un cliente o finca es modificado o desactivado
-- (activo = false) en el futuro, el expediente histórico permanezca
-- 100% íntegro e inalterable.

ALTER TABLE public.reservas
    ADD COLUMN IF NOT EXISTS cliente_snapshot JSONB,
    ADD COLUMN IF NOT EXISTS finca_snapshot JSONB,
    ADD COLUMN IF NOT EXISTS cotizacion_snapshot JSONB,
    ADD COLUMN IF NOT EXISTS fecha_cierre TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cerrada_por TEXT,
    ADD COLUMN IF NOT EXISTS notas_cierre TEXT;

-- ---------------------------------------------------------------
-- 2. TABLA: CIERRES_RESERVAS (Actas de cierre formal de operaciones)
-- ---------------------------------------------------------------
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

-- Trigger de updated_at para cierres_reservas
DROP TRIGGER IF EXISTS set_cierres_reservas_updated_at ON public.cierres_reservas;
CREATE TRIGGER set_cierres_reservas_updated_at
    BEFORE UPDATE ON public.cierres_reservas
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------
-- 3. FUNCION Y TRIGGER PARA AUTO-LLENAR SNAPSHOTS EN RESERVAS
-- ---------------------------------------------------------------
-- Si al crear o actualizar una reserva los snapshots están vacíos,
-- se obtienen automáticamente los datos actuales del cliente y finca.
CREATE OR REPLACE FUNCTION public.fn_preservar_snapshot_reserva()
RETURNS TRIGGER AS $$
DECLARE
    v_cliente RECORD;
    v_finca RECORD;
    v_cotizacion RECORD;
BEGIN
    -- Snapshot de Cliente
    IF NEW.cliente_snapshot IS NULL AND NEW.cliente_id IS NOT NULL THEN
        SELECT id, nombre, apellido, whatsapp, telefono, correo
        INTO v_cliente
        FROM public.clientes
        WHERE id = NEW.cliente_id;

        IF FOUND THEN
            NEW.cliente_snapshot := jsonb_build_object(
                'id', v_cliente.id,
                'nombre', v_cliente.nombre,
                'apellido', v_cliente.apellido,
                'whatsapp', v_cliente.whatsapp,
                'telefono', v_cliente.telefono,
                'correo', v_cliente.correo
            );
        END IF;
    END IF;

    -- Snapshot de Finca
    IF NEW.finca_snapshot IS NULL AND NEW.finca_id IS NOT NULL THEN
        SELECT id, nombre, zona, capacidad, precio_pp
        INTO v_finca
        FROM public.fincas
        WHERE id = NEW.finca_id;

        IF FOUND THEN
            NEW.finca_snapshot := jsonb_build_object(
                'id', v_finca.id,
                'nombre', v_finca.nombre,
                'zona', v_finca.zona,
                'capacidad', v_finca.capacidad,
                'precio_pp', v_finca.precio_pp
            );
        END IF;
    END IF;

    -- Snapshot de Cotización (si existe)
    IF NEW.cotizacion_snapshot IS NULL AND NEW.cotizacion_id IS NOT NULL THEN
        SELECT id, subtotal_alojamiento, costo_alimentacion, descuento, recargo, total, alimentacion
        INTO v_cotizacion
        FROM public.cotizaciones
        WHERE id = NEW.cotizacion_id;

        IF FOUND THEN
            NEW.cotizacion_snapshot := jsonb_build_object(
                'id', v_cotizacion.id,
                'subtotal_alojamiento', v_cotizacion.subtotal_alojamiento,
                'costo_alimentacion', v_cotizacion.costo_alimentacion,
                'descuento', v_cotizacion.descuento,
                'recargo', v_cotizacion.recargo,
                'total', v_cotizacion.total,
                'alimentacion', v_cotizacion.alimentacion
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_preservar_snapshot_reserva ON public.reservas;
CREATE TRIGGER trg_preservar_snapshot_reserva
    BEFORE INSERT OR UPDATE ON public.reservas
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_preservar_snapshot_reserva();

-- ---------------------------------------------------------------
-- 4. POBLAR SNAPSHOTS DE RESERVAS HISTÓRICAS EXISTENTES
-- ---------------------------------------------------------------
UPDATE public.reservas r
SET
    cliente_snapshot = jsonb_build_object(
        'id', c.id,
        'nombre', c.nombre,
        'apellido', c.apellido,
        'whatsapp', c.whatsapp,
        'telefono', c.telefono,
        'correo', c.correo
    )
FROM public.clientes c
WHERE r.cliente_id = c.id
  AND (r.cliente_snapshot IS NULL OR r.cliente_snapshot = '{}'::jsonb);

UPDATE public.reservas r
SET
    finca_snapshot = jsonb_build_object(
        'id', f.id,
        'nombre', f.nombre,
        'zona', f.zona,
        'capacidad', f.capacidad,
        'precio_pp', f.precio_pp
    )
FROM public.fincas f
WHERE r.finca_id = f.id
  AND (r.finca_snapshot IS NULL OR r.finca_snapshot = '{}'::jsonb);

-- ---------------------------------------------------------------
-- 5. RLS (Row Level Security) PARA CIERRES_RESERVAS
-- ---------------------------------------------------------------
ALTER TABLE public.cierres_reservas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gestion total cierres_reservas" ON public.cierres_reservas;
CREATE POLICY "Admin gestion total cierres_reservas"
    ON public.cierres_reservas FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Permitir lectura anónima si se requiere para consulta interna
DROP POLICY IF EXISTS "Lectura publica cierres_reservas" ON public.cierres_reservas;
CREATE POLICY "Lectura publica cierres_reservas"
    ON public.cierres_reservas FOR SELECT
    TO anon
    USING (true);

-- =============================================================================
-- ETAPA 2 — MIGRACIÓN SQL
-- Control de Fincas Campestres
-- Aplicar en Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- =============================================================================

-- 1. Columnas nuevas en tabla cotizaciones
ALTER TABLE public.cotizaciones
  ADD COLUMN IF NOT EXISTS consecutivo TEXT UNIQUE;

ALTER TABLE public.cotizaciones
  ADD COLUMN IF NOT EXISTS menu_id UUID REFERENCES public.menus(id) ON DELETE SET NULL;

ALTER TABLE public.cotizaciones
  ADD COLUMN IF NOT EXISTS cantidad_alimentacion INTEGER DEFAULT 1;

-- 2. Columna consecutivo en tabla reservas
ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS consecutivo TEXT UNIQUE;

-- 3. Función SQL atómica para consecutivo de cotizaciones
CREATE OR REPLACE FUNCTION public.siguiente_consecutivo_cotizacion()
RETURNS TEXT AS $$
DECLARE
  v_prefijo TEXT;
  v_numero  INTEGER;
BEGIN
  SELECT prefijo_cotizacion, siguiente_cotizacion
  INTO v_prefijo, v_numero
  FROM public.configuracion_general
  WHERE id = 'general'
  FOR UPDATE;

  UPDATE public.configuracion_general
  SET siguiente_cotizacion = siguiente_cotizacion + 1
  WHERE id = 'general';

  RETURN v_prefijo || LPAD(v_numero::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función SQL atómica para consecutivo de reservas
CREATE OR REPLACE FUNCTION public.siguiente_consecutivo_reserva()
RETURNS TEXT AS $$
DECLARE
  v_numero INTEGER;
BEGIN
  SELECT siguiente_separacion
  INTO v_numero
  FROM public.configuracion_general
  WHERE id = 'general'
  FOR UPDATE;

  UPDATE public.configuracion_general
  SET siguiente_separacion = siguiente_separacion + 1
  WHERE id = 'general';

  RETURN 'RES-' || LPAD(v_numero::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5a. Los clientes anónimos pueden insertar cotizaciones
DROP POLICY IF EXISTS "Insercion publica cotizaciones" ON public.cotizaciones;
CREATE POLICY "Insercion publica cotizaciones"
  ON public.cotizaciones FOR INSERT
  TO anon
  WITH CHECK (true);

-- 5b. Los clientes anónimos pueden insertar nuevos clientes
DROP POLICY IF EXISTS "Insercion publica clientes" ON public.clientes;
CREATE POLICY "Insercion publica clientes"
  ON public.clientes FOR INSERT
  TO anon
  WITH CHECK (true);

-- 5c. Los clientes anónimos pueden leer clientes (para evitar duplicados por teléfono)
DROP POLICY IF EXISTS "Lectura publica clientes por telefono" ON public.clientes;
CREATE POLICY "Lectura publica clientes por telefono"
  ON public.clientes FOR SELECT
  TO anon
  USING (true);

-- 5d. GRANT EXECUTE para usuarios anónimos en funciones de consecutivo
GRANT EXECUTE ON FUNCTION public.siguiente_consecutivo_cotizacion() TO anon;
GRANT EXECUTE ON FUNCTION public.siguiente_consecutivo_reserva() TO anon;

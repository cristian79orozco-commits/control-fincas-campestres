-- =============================================================================
-- ETAPA 2 - MIGRACION SQL
-- Control de Fincas Campestres
-- Estado: APLICADA en Supabase
-- =============================================================================

-- 1. Columnas nuevas en tabla cotizaciones
--    menu_id sin FK directa (tabla menus puede no existir segun orden de migraciones)
ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS consecutivo TEXT UNIQUE;
ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS menu_id UUID;
ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS cantidad_alimentacion INTEGER DEFAULT 1;

-- 2. Columna consecutivo en tabla reservas
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS consecutivo TEXT UNIQUE;

-- 3. Funcion SQL atomica para consecutivo de cotizaciones
--    Usa FOR UPDATE para bloquear la fila y evitar duplicados en concurrencia
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

-- 4. Funcion SQL atomica para consecutivo de reservas
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

-- 5a. Insercion publica de cotizaciones (usuarios anonimos)
DROP POLICY IF EXISTS "Insercion publica cotizaciones" ON public.cotizaciones;
CREATE POLICY "Insercion publica cotizaciones"
  ON public.cotizaciones FOR INSERT
  TO anon
  WITH CHECK (true);

-- 5b. Insercion publica de clientes (usuarios anonimos)
DROP POLICY IF EXISTS "Insercion publica clientes" ON public.clientes;
CREATE POLICY "Insercion publica clientes"
  ON public.clientes FOR INSERT
  TO anon
  WITH CHECK (true);

-- 5c. Lectura publica de clientes (para deduplicar por telefono)
DROP POLICY IF EXISTS "Lectura publica clientes por telefono" ON public.clientes;
CREATE POLICY "Lectura publica clientes por telefono"
  ON public.clientes FOR SELECT
  TO anon
  USING (true);

-- 5d. GRANT EXECUTE para usuarios anonimos
GRANT EXECUTE ON FUNCTION public.siguiente_consecutivo_cotizacion() TO anon;
GRANT EXECUTE ON FUNCTION public.siguiente_consecutivo_reserva() TO anon;

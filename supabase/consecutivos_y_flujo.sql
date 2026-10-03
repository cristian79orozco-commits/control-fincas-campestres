-- =============================================================================
-- MIGRACIÓN: CONSECUTIVOS ORDENADOS DESDE 1001 Y SINERGIA DE FLUJO
-- Control de Fincas Campestres
-- =============================================================================

-- 1. Asegurar campos de consecutivo único en cotizaciones y reservas
ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS consecutivo TEXT UNIQUE;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS consecutivo TEXT UNIQUE;

-- 2. Asegurar que los contadores en configuracion_general inicien al menos en 1001
UPDATE public.configuracion_general
SET
  siguiente_cotizacion = GREATEST(1001, COALESCE(siguiente_cotizacion, 1001)),
  siguiente_separacion = GREATEST(1001, COALESCE(siguiente_separacion, 1001)),
  prefijo_cotizacion = COALESCE(prefijo_cotizacion, 'COT-'),
  prefijo_separacion = COALESCE(prefijo_separacion, 'RES-')
WHERE id = 'general';

-- 3. Función atómica para consecutivo de cotizaciones (inicia en 1001 sin ceros extras)
CREATE OR REPLACE FUNCTION public.siguiente_consecutivo_cotizacion()
RETURNS TEXT AS $$
DECLARE
  v_prefijo TEXT;
  v_numero  INTEGER;
BEGIN
  SELECT COALESCE(prefijo_cotizacion, 'COT-'), GREATEST(1001, COALESCE(siguiente_cotizacion, 1001))
  INTO v_prefijo, v_numero
  FROM public.configuracion_general
  WHERE id = 'general'
  FOR UPDATE;

  -- Si no existe fila en configuracion_general, crearla con valor base 1001
  IF NOT FOUND THEN
    INSERT INTO public.configuracion_general (id, prefijo_cotizacion, siguiente_cotizacion)
    VALUES ('general', 'COT-', 1002);
    RETURN 'COT-1001';
  END IF;

  UPDATE public.configuracion_general
  SET siguiente_cotizacion = v_numero + 1
  WHERE id = 'general';

  RETURN v_prefijo || v_numero::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función atómica para consecutivo de reservas (inicia en 1001 sin ceros extras)
CREATE OR REPLACE FUNCTION public.siguiente_consecutivo_reserva()
RETURNS TEXT AS $$
DECLARE
  v_prefijo TEXT;
  v_numero INTEGER;
BEGIN
  SELECT COALESCE(prefijo_separacion, 'RES-'), GREATEST(1001, COALESCE(siguiente_separacion, 1001))
  INTO v_prefijo, v_numero
  FROM public.configuracion_general
  WHERE id = 'general'
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.configuracion_general (id, prefijo_separacion, siguiente_separacion)
    VALUES ('general', 'RES-', 1002);
    RETURN 'RES-1001';
  END IF;

  UPDATE public.configuracion_general
  SET siguiente_separacion = v_numero + 1
  WHERE id = 'general';

  RETURN v_prefijo || v_numero::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Otorgar permisos de ejecución a roles anónimos y autenticados
GRANT EXECUTE ON FUNCTION public.siguiente_consecutivo_cotizacion() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.siguiente_consecutivo_reserva() TO anon, authenticated;

-- 6. Políticas de RLS para garantizar flujo público de clientes y cotizaciones
DROP POLICY IF EXISTS "Insercion publica cotizaciones" ON public.cotizaciones;
CREATE POLICY "Insercion publica cotizaciones"
  ON public.cotizaciones FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Insercion publica clientes" ON public.clientes;
CREATE POLICY "Insercion publica clientes"
  ON public.clientes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Lectura publica clientes por telefono" ON public.clientes;
CREATE POLICY "Lectura publica clientes por telefono"
  ON public.clientes FOR SELECT
  TO anon, authenticated
  USING (true);

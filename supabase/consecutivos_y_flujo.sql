-- =============================================================================
-- MIGRACIÓN: CONSECUTIVOS PURAMENTE NUMÉRICOS DESDE 1001 (SIN LETRAS)
-- Y POLÍTICAS RLS ROBUSTAS PARA CAPTACIÓN DE CLIENTES Y COTIZACIONES
-- Control de Fincas Campestres
-- =============================================================================

-- 1. Asegurar columnas de consecutivo único en cotizaciones y reservas
ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS consecutivo TEXT UNIQUE;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS consecutivo TEXT UNIQUE;

-- 2. Limpiar registros históricos existentes para eliminar prefijos de letras (ej: COT-1001 -> 1001, RES-1002 -> 1002)
UPDATE public.cotizaciones
SET consecutivo = regexp_replace(consecutivo, '^[A-Za-z\-]+', '')
WHERE consecutivo ~ '^[A-Za-z]';

UPDATE public.reservas
SET consecutivo = regexp_replace(consecutivo, '^[A-Za-z\-]+', '')
WHERE consecutivo ~ '^[A-Za-z]';

-- 3. Asegurar que los contadores en configuracion_general inicien al menos en 1001 y sin prefijos de letras
UPDATE public.configuracion_general
SET
  siguiente_cotizacion = GREATEST(1001, COALESCE(siguiente_cotizacion, 1001)),
  siguiente_separacion = GREATEST(1001, COALESCE(siguiente_separacion, 1001)),
  prefijo_cotizacion = '',
  prefijo_separacion = ''
WHERE id = 'general';

-- 4. Función atómica para consecutivo de cotizaciones: devuelve puramente el número '1001', '1002', etc. (sin letras)
CREATE OR REPLACE FUNCTION public.siguiente_consecutivo_cotizacion()
RETURNS TEXT AS $$
DECLARE
  v_numero INTEGER;
BEGIN
  SELECT GREATEST(1001, COALESCE(siguiente_cotizacion, 1001))
  INTO v_numero
  FROM public.configuracion_general
  WHERE id = 'general'
  FOR UPDATE;

  -- Si no existe fila en configuracion_general, crearla con valor base 1001
  IF NOT FOUND THEN
    INSERT INTO public.configuracion_general (id, prefijo_cotizacion, siguiente_cotizacion)
    VALUES ('general', '', 1002);
    RETURN '1001';
  END IF;

  UPDATE public.configuracion_general
  SET siguiente_cotizacion = v_numero + 1
  WHERE id = 'general';

  RETURN v_numero::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Función atómica para consecutivo de reservas: devuelve puramente el número '1001', '1002', etc. (sin letras)
CREATE OR REPLACE FUNCTION public.siguiente_consecutivo_reserva()
RETURNS TEXT AS $$
DECLARE
  v_numero INTEGER;
BEGIN
  SELECT GREATEST(1001, COALESCE(siguiente_separacion, 1001))
  INTO v_numero
  FROM public.configuracion_general
  WHERE id = 'general'
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.configuracion_general (id, prefijo_separacion, siguiente_separacion)
    VALUES ('general', '', 1002);
    RETURN '1001';
  END IF;

  UPDATE public.configuracion_general
  SET siguiente_separacion = v_numero + 1
  WHERE id = 'general';

  RETURN v_numero::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Otorgar permisos de ejecución a roles anónimos y autenticados
GRANT EXECUTE ON FUNCTION public.siguiente_consecutivo_cotizacion() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.siguiente_consecutivo_reserva() TO anon, authenticated;

-- 7. Políticas de RLS para garantizar flujo público y administración de clientes y cotizaciones
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;

-- CLIENTES: Inserción, lectura y actualización permitida para anon y authenticated
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

DROP POLICY IF EXISTS "Actualizacion publica clientes" ON public.clientes;
CREATE POLICY "Actualizacion publica clientes"
  ON public.clientes FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- COTIZACIONES: Inserción y lectura permitida para anon y authenticated
DROP POLICY IF EXISTS "Insercion publica cotizaciones" ON public.cotizaciones;
CREATE POLICY "Insercion publica cotizaciones"
  ON public.cotizaciones FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Lectura publica cotizaciones" ON public.cotizaciones;
CREATE POLICY "Lectura publica cotizaciones"
  ON public.cotizaciones FOR SELECT
  TO anon, authenticated
  USING (true);

-- 8. Asegurar que las tablas emitan eventos a través de Supabase Realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cotizaciones;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clientes;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reservas;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;


-- ==============================================================================
-- SCRIPT MAESTRO DE SEGURIDAD Y BLINDAJE RLS PARA PRODUCCIÓN (100% IDEMPOTENTE)
-- Proyecto: Paraíso Terrenal · Control de Fincas Campestres
-- Ejecutar en: Supabase SQL Editor (Cero conflictos con políticas existentes)
-- ==============================================================================

-- 1. HABILITAR ROW LEVEL SECURITY (RLS) EN TODAS LAS TABLAS DE NEGOCIO
ALTER TABLE public.fincas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finca_imagenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finca_planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finca_amenidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_imagenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disponibilidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cierres_reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_general ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contenido_sitio ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. LIMPIEZA TOTAL DINÁMICA DE TODAS LAS POLÍTICAS PREVIAS EN TABLAS PÚBLICAS
-- (Garantiza ejecución sin errores de tipo 'policy already exists')
-- ==============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN (
              'fincas', 'finca_imagenes', 'finca_planes', 'finca_amenidades',
              'menus', 'menu_imagenes', 'disponibilidad', 'clientes',
              'cotizaciones', 'reservas', 'pagos', 'comunicaciones',
              'cierres_reservas', 'configuracion_general', 'contenido_sitio'
          )
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ==============================================================================
-- 3. POLÍTICAS DEFENSIVAS BASADAS EN MÍNIMO PRIVILEGIO (LEAST PRIVILEGE)
-- ==============================================================================

-- A. FINCAS: Lectura pública de fincas activas; gestión completa solo autenticados
DROP POLICY IF EXISTS "Lectura publica de fincas" ON public.fincas;
CREATE POLICY "Lectura publica de fincas"
    ON public.fincas FOR SELECT
    TO anon, authenticated
    USING (activo = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin gestion total fincas" ON public.fincas;
CREATE POLICY "Admin gestion total fincas"
    ON public.fincas FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- B. RECURSOS COMPLEMENTARIOS DE FINCAS (Imágenes, Planes, Amenidades)
DROP POLICY IF EXISTS "Lectura publica de finca_imagenes" ON public.finca_imagenes;
CREATE POLICY "Lectura publica de finca_imagenes"
    ON public.finca_imagenes FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Admin gestion total finca_imagenes" ON public.finca_imagenes;
CREATE POLICY "Admin gestion total finca_imagenes"
    ON public.finca_imagenes FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Lectura publica de finca_planes" ON public.finca_planes;
CREATE POLICY "Lectura publica de finca_planes"
    ON public.finca_planes FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Admin gestion total finca_planes" ON public.finca_planes;
CREATE POLICY "Admin gestion total finca_planes"
    ON public.finca_planes FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Lectura publica de finca_amenidades" ON public.finca_amenidades;
CREATE POLICY "Lectura publica de finca_amenidades"
    ON public.finca_amenidades FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Admin gestion total finca_amenidades" ON public.finca_amenidades;
CREATE POLICY "Admin gestion total finca_amenidades"
    ON public.finca_amenidades FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- C. MENÚS Y GASTRONOMÍA
DROP POLICY IF EXISTS "Lectura publica de menus" ON public.menus;
CREATE POLICY "Lectura publica de menus"
    ON public.menus FOR SELECT
    TO anon, authenticated
    USING (activo = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin gestion total menus" ON public.menus;
CREATE POLICY "Admin gestion total menus"
    ON public.menus FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Lectura publica de menu_imagenes" ON public.menu_imagenes;
CREATE POLICY "Lectura publica de menu_imagenes"
    ON public.menu_imagenes FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Admin gestion total menu_imagenes" ON public.menu_imagenes;
CREATE POLICY "Admin gestion total menu_imagenes"
    ON public.menu_imagenes FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- D. DISPONIBILIDAD (Calendario público)
DROP POLICY IF EXISTS "Lectura publica de disponibilidad" ON public.disponibilidad;
CREATE POLICY "Lectura publica de disponibilidad"
    ON public.disponibilidad FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Admin gestion total disponibilidad" ON public.disponibilidad;
CREATE POLICY "Admin gestion total disponibilidad"
    ON public.disponibilidad FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- E. CONFIGURACIÓN GENERAL Y CONTENIDO DEL SITIO
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

DROP POLICY IF EXISTS "Lectura publica contenido sitio" ON public.contenido_sitio;
CREATE POLICY "Lectura publica contenido sitio"
    ON public.contenido_sitio FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Admin gestion total contenido sitio" ON public.contenido_sitio;
CREATE POLICY "Admin gestion total contenido sitio"
    ON public.contenido_sitio FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- F. CLIENTES (Protección estricta de PII - Habeas Data / Ley 1581)
DROP POLICY IF EXISTS "Admin gestion total clientes" ON public.clientes;
CREATE POLICY "Admin gestion total clientes"
    ON public.clientes FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Insercion publica controlada de clientes" ON public.clientes;
CREATE POLICY "Insercion publica controlada de clientes"
    ON public.clientes FOR INSERT
    TO anon
    WITH CHECK (nombre IS NOT NULL AND length(trim(nombre)) >= 2);

-- G. COTIZACIONES
DROP POLICY IF EXISTS "Admin gestion total cotizaciones" ON public.cotizaciones;
CREATE POLICY "Admin gestion total cotizaciones"
    ON public.cotizaciones FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Insercion publica de cotizaciones" ON public.cotizaciones;
CREATE POLICY "Insercion publica de cotizaciones"
    ON public.cotizaciones FOR INSERT
    TO anon
    WITH CHECK (fecha_inicio IS NOT NULL AND fecha_fin IS NOT NULL);

-- H. RESERVAS (Acceso restringido exclusivamente a administradores)
DROP POLICY IF EXISTS "Admin gestion total reservas" ON public.reservas;
CREATE POLICY "Admin gestion total reservas"
    ON public.reservas FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- I. PAGOS (Información financiera privada)
DROP POLICY IF EXISTS "Admin gestion total pagos" ON public.pagos;
CREATE POLICY "Admin gestion total pagos"
    ON public.pagos FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- J. COMUNICACIONES Y CIERRES
DROP POLICY IF EXISTS "Admin gestion total comunicaciones" ON public.comunicaciones;
CREATE POLICY "Admin gestion total comunicaciones"
    ON public.comunicaciones FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admin gestion total cierres_reservas" ON public.cierres_reservas;
CREATE POLICY "Admin gestion total cierres_reservas"
    ON public.cierres_reservas FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- 4. BUCKET DE ALMACENAMIENTO (SUPABASE STORAGE)
-- ==============================================================================

DO $$
BEGIN
    -- Asegurar bucket publico para entrega de imágenes
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('finca-imagenes', 'finca-imagenes', true)
    ON CONFLICT (id) DO UPDATE SET public = true;

    -- Eliminar cualquier política previa en storage.objects para evitar duplicados
    DROP POLICY IF EXISTS "Acceso publico lectura finca-imagenes" ON storage.objects;
    DROP POLICY IF EXISTS "Insercion total finca-imagenes" ON storage.objects;
    DROP POLICY IF EXISTS "Actualizacion total finca-imagenes" ON storage.objects;
    DROP POLICY IF EXISTS "Eliminacion total finca-imagenes" ON storage.objects;
    DROP POLICY IF EXISTS "Imágenes de fincas públicas" ON storage.objects;
    DROP POLICY IF EXISTS "Subida de imágenes autenticada" ON storage.objects;
    DROP POLICY IF EXISTS "Eliminación de imágenes autenticada" ON storage.objects;
    DROP POLICY IF EXISTS "Lectura publica finca-imagenes" ON storage.objects;
    DROP POLICY IF EXISTS "Insercion autenticada finca-imagenes" ON storage.objects;
    DROP POLICY IF EXISTS "Actualizacion autenticada finca-imagenes" ON storage.objects;
    DROP POLICY IF EXISTS "Eliminacion autenticada finca-imagenes" ON storage.objects;

    -- 1. Lectura pública de objetos del bucket finca-imagenes
    CREATE POLICY "Lectura publica finca-imagenes"
        ON storage.objects FOR SELECT
        TO anon, authenticated
        USING (bucket_id = 'finca-imagenes');

    -- 2. Inserción solo por usuarios autenticados
    CREATE POLICY "Insercion autenticada finca-imagenes"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'finca-imagenes');

    -- 3. Actualización solo por usuarios autenticados
    CREATE POLICY "Actualizacion autenticada finca-imagenes"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (bucket_id = 'finca-imagenes')
        WITH CHECK (bucket_id = 'finca-imagenes');

    -- 4. Eliminación solo por usuarios autenticados
    CREATE POLICY "Eliminacion autenticada finca-imagenes"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = 'finca-imagenes');
END $$;

-- ==============================================================================
-- 5. FUNCIÓN RPC SEGURA PARA CONSULTA DE HUÉSPED (PORTAL CLIENTE)
-- Permite al cliente consultar ÚNICAMENTE su reserva o cotización con su número
-- de consecutivo y su teléfono, sin exponer la base de datos completa.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.consultar_reserva_publica(
    p_consecutivo TEXT,
    p_telefono TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_consecutivo_clean TEXT;
    v_telefono_clean TEXT;
    v_resultado JSONB;
BEGIN
    v_consecutivo_clean := trim(COALESCE(p_consecutivo, ''));
    v_telefono_clean := regexp_replace(COALESCE(p_telefono, ''), '\D', '', 'g');

    IF length(v_consecutivo_clean) < 3 OR length(v_telefono_clean) < 4 THEN
        RETURN jsonb_build_object('encontrado', false, 'mensaje', 'Datos de consulta incompletos');
    END IF;

    -- 1. Buscar en reservas activas o históricas
    SELECT jsonb_build_object(
        'encontrado', true,
        'tipo', 'reserva',
        'consecutivo', r.consecutivo,
        'estado', r.estado,
        'fecha_inicio', r.fecha_inicio,
        'fecha_fin', r.fecha_fin,
        'personas', r.personas,
        'valor_total', r.valor_total,
        'separacion', r.separacion,
        'finca_nombre', COALESCE(f.nombre, (r.finca_snapshot->>'nombre')),
        'cliente_nombre', COALESCE(c.nombre, (r.cliente_snapshot->>'nombre')),
        'estado_alimentacion', r.estado_alimentacion
    ) INTO v_resultado
    FROM public.reservas r
    LEFT JOIN public.clientes c ON r.cliente_id = c.id
    LEFT JOIN public.fincas f ON r.finca_id = f.id
    WHERE (
        lower(r.consecutivo) = lower(v_consecutivo_clean)
        OR r.consecutivo ILIKE '%' || v_consecutivo_clean
    )
    AND (
        regexp_replace(COALESCE(c.whatsapp, c.telefono, (r.cliente_snapshot->>'whatsapp'), ''), '\D', '', 'g') LIKE '%' || v_telefono_clean
    )
    ORDER BY r.created_at DESC
    LIMIT 1;

    IF v_resultado IS NOT NULL THEN
        RETURN v_resultado;
    END IF;

    -- 2. Si no es reserva, buscar en cotizaciones
    SELECT jsonb_build_object(
        'encontrado', true,
        'tipo', 'cotizacion',
        'consecutivo', cot.consecutivo,
        'estado', cot.estado,
        'fecha_inicio', cot.fecha_inicio,
        'fecha_fin', cot.fecha_fin,
        'personas', cot.personas,
        'total', cot.total,
        'finca_nombre', f.nombre,
        'cliente_nombre', c.nombre,
        'alimentacion', cot.alimentacion
    ) INTO v_resultado
    FROM public.cotizaciones cot
    LEFT JOIN public.clientes c ON cot.cliente_id = c.id
    LEFT JOIN public.fincas f ON cot.finca_id = f.id
    WHERE (
        lower(cot.consecutivo) = lower(v_consecutivo_clean)
        OR cot.consecutivo ILIKE '%' || v_consecutivo_clean
    )
    AND (
        regexp_replace(COALESCE(c.whatsapp, c.telefono, ''), '\D', '', 'g') LIKE '%' || v_telefono_clean
    )
    ORDER BY cot.created_at DESC
    LIMIT 1;

    IF v_resultado IS NOT NULL THEN
        RETURN v_resultado;
    END IF;

    RETURN jsonb_build_object('encontrado', false, 'mensaje', 'No se encontró ninguna reserva o cotización con los datos ingresados');
END;
$$;

-- Permitir ejecución anónima controlada del RPC de consulta
GRANT EXECUTE ON FUNCTION public.consultar_reserva_publica(TEXT, TEXT) TO anon, authenticated;

-- ==============================================================================
-- 6. RECARGA DE POSTGREST SCHEMA CACHE
-- ==============================================================================
NOTIFY pgrst, 'reload schema';

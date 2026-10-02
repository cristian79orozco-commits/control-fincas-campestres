-- ================================================================
-- FASE 5 — Control del Contenido del Cliente (Sitio Público)
-- Migración: tabla contenido_sitio, valores por defecto y políticas RLS
-- ================================================================

CREATE TABLE IF NOT EXISTS public.contenido_sitio (
    id TEXT PRIMARY KEY DEFAULT 'principal',

    -- Orden de las secciones públicas
    orden_secciones JSONB NOT NULL DEFAULT '["banner", "hero", "destacados", "estado", "filtros", "catalogo", "menus", "faq"]'::jsonb,

    -- 1. Banner Superior de Aviso / Promoción
    banner_visible BOOLEAN NOT NULL DEFAULT true,
    banner_texto TEXT NOT NULL DEFAULT '🌿 ¡Reserva directa sin comisiones! Consulta fechas libres en nuestro calendario y cotiza al instante por WhatsApp.',
    banner_link_texto TEXT DEFAULT 'Ver disponibilidad',
    banner_link_url TEXT DEFAULT '#catalogo',
    banner_tipo TEXT NOT NULL DEFAULT 'promo',

    -- 2. Hero Section
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

    -- 3. Información Destacada / Beneficios
    destacados_visible BOOLEAN NOT NULL DEFAULT true,
    destacados_titulo TEXT NOT NULL DEFAULT '¿Por qué reservar con nosotros?',
    destacados_subtitulo TEXT NOT NULL DEFAULT 'Garantizamos tranquilidad, transparencia y el mejor descanso en el Valle del Cauca',
    destacados_items JSONB NOT NULL DEFAULT '[
        {
            "id": "ben-1",
            "icono": "🌿",
            "titulo": "Espacios 100% Campestres",
            "descripcion": "Fincas privadas rodeadas de naturaleza, piscinas cristalinas, zonas verdes y máxima tranquilidad para tu familia o grupo."
        },
        {
            "id": "ben-2",
            "icono": "📅",
            "titulo": "Disponibilidad en Tiempo Real",
            "descripcion": "Calendario sincronizado al instante. Puedes verificar fechas ocupadas y libres antes de cotizar sin esperas innecesarias."
        },
        {
            "id": "ben-3",
            "icono": "🍽️",
            "titulo": "Gastronomía Opcional Integrada",
            "descripcion": "Menús típicos vallunos, desayunos campestres y parrilladas preparados directamente en tu estadía con cotización formal."
        },
        {
            "id": "ben-4",
            "icono": "🛡️",
            "titulo": "Trato Directo y Seguro",
            "descripcion": "Sin intermediarios ni sobrecostos. Documentos oficiales de separación, estado de cuenta y confirmación por WhatsApp."
        }
    ]'::jsonb,

    -- 4. Estado Actual (Resumen de fincas)
    estado_visible BOOLEAN NOT NULL DEFAULT true,
    estado_titulo TEXT NOT NULL DEFAULT 'Estado actual · Fincas disponibles',
    estado_subtitulo TEXT NOT NULL DEFAULT 'propiedades registradas en Santa Elena, Valle',
    estado_badge_texto TEXT NOT NULL DEFAULT 'Sistema operativo',
    estado_ayuda_texto TEXT NOT NULL DEFAULT 'Toca Ver y cotizar en cualquier finca para consultar el calendario interactivo y obtener tu cotización directa para WhatsApp.',

    -- 5. Filtros de Búsqueda
    filtros_visible BOOLEAN NOT NULL DEFAULT true,
    filtros_titulo TEXT NOT NULL DEFAULT 'Buscar disponibilidad',
    filtros_subtitulo TEXT NOT NULL DEFAULT 'Filtra por fechas y capacidad para encontrar fincas libres',
    filtros_badge_titulo TEXT NOT NULL DEFAULT '📍 Ubicación privilegiada',
    filtros_badge_texto TEXT NOT NULL DEFAULT 'Todas nuestras fincas campestres están ubicadas en Santa Elena, El Cerrito, Valle del Cauca.',

    -- 6. Catálogo de Fincas
    catalogo_visible BOOLEAN NOT NULL DEFAULT true,
    catalogo_titulo TEXT NOT NULL DEFAULT 'Fincas disponibles',
    catalogo_subtitulo TEXT NOT NULL DEFAULT 'Selecciona una propiedad para ver fotografías en alta calidad y cotizar',
    catalogo_vacio_texto TEXT NOT NULL DEFAULT 'No se encontraron fincas disponibles para los criterios seleccionados.',

    -- 7. Menús Campestres (Portal Público)
    menus_visible BOOLEAN NOT NULL DEFAULT true,
    menus_titulo TEXT NOT NULL DEFAULT 'Gastronomía y Menús Campestres',
    menus_subtitulo TEXT NOT NULL DEFAULT 'Complementa tu descanso con deliciosas opciones de alimentación tradicional para todo tu grupo',
    menus_badge_texto TEXT NOT NULL DEFAULT 'Servicio Adicional Opcional',

    -- 8. Preguntas Frecuentes (FAQ)
    faq_visible BOOLEAN NOT NULL DEFAULT true,
    faq_titulo TEXT NOT NULL DEFAULT 'Preguntas Frecuentes',
    faq_subtitulo TEXT NOT NULL DEFAULT 'Todo lo que necesitas saber antes de programar tu viaje campestre',
    faq_items JSONB NOT NULL DEFAULT '[
        {
            "id": "faq-1",
            "pregunta": "¿Cómo confirmo y aseguro mi reserva?",
            "respuesta": "Una vez elijas la finca y fechas en el cotizador, te comunicarás con nosotros vía WhatsApp. Tu fecha quedará formalmente reservada con el abono del porcentaje de separación pactado (habitualmente el 50%) y la expedición del documento oficial de separación."
        },
        {
            "id": "faq-2",
            "pregunta": "¿Cuáles son los horarios de Check-in y Check-out?",
            "respuesta": "El ingreso regular es a partir de las 9:00 AM y la salida se realiza habitualmente a las 5:00 PM del último día pactado. Horarios específicos pueden coordinarse previamente según la programación y disponibilidad."
        },
        {
            "id": "faq-3",
            "pregunta": "¿Podemos incluir el servicio de alimentación?",
            "respuesta": "¡Claro que sí! Contamos con menús de desayunos, almuerzos campestres, parrilladas y cenas. Puedes cotizarlos directamente desde la finca o solicitar la propuesta gastronómica a nuestro asesor por WhatsApp."
        },
        {
            "id": "faq-4",
            "pregunta": "¿Se admiten mascotas en las instalaciones?",
            "respuesta": "La gran mayoría de nuestras fincas son pet-friendly. Al momento de generar tu cotización indícanos si llevarás mascotas para verificar las condiciones y cuidados específicos de la finca elegida."
        },
        {
            "id": "faq-5",
            "pregunta": "¿Qué métodos de pago reciben?",
            "respuesta": "Aceptamos transferencias bancarias directas (Bancolombia, Nequi, Daviplata) y pagos según las instrucciones oficiales consignadas en tu documento de cotización."
        }
    ]'::jsonb,

    -- 9. Pie de página (Footer)
    footer_visible BOOLEAN NOT NULL DEFAULT true,
    footer_titulo TEXT NOT NULL DEFAULT 'Control de Fincas Campestres',
    footer_subtitulo TEXT NOT NULL DEFAULT 'Alquiler exclusivo de fincas de recreo y descanso en Santa Elena, El Cerrito, Valle del Cauca.',
    footer_whatsapp_cta TEXT NOT NULL DEFAULT '¿Tienes alguna duda especial? Escríbenos directamente a WhatsApp',

    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger para updated_at automático
DROP TRIGGER IF EXISTS set_contenido_sitio_updated_at ON public.contenido_sitio;
CREATE TRIGGER set_contenido_sitio_updated_at
    BEFORE UPDATE ON public.contenido_sitio
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Registro inicial por defecto si no existe
INSERT INTO public.contenido_sitio (
    id,
    banner_texto,
    hero_titulo,
    hero_subtitulo,
    hero_cta_texto,
    destacados_titulo,
    estado_titulo,
    filtros_titulo,
    catalogo_titulo,
    menus_titulo,
    faq_titulo,
    footer_titulo
)
VALUES (
    'principal',
    '🌿 ¡Reserva directa sin comisiones! Consulta fechas libres en nuestro calendario y cotiza al instante por WhatsApp.',
    'Tu escapada campestre empieza aquí',
    'Elige la finca ideal en Santa Elena, consulta la disponibilidad en tiempo real en nuestro calendario y cotiza tu reserva instantáneamente por WhatsApp.',
    'Explorar fincas disponibles',
    '¿Por qué reservar con nosotros?',
    'Estado actual · Fincas disponibles',
    'Buscar disponibilidad',
    'Fincas disponibles',
    'Gastronomía y Menús Campestres',
    'Preguntas Frecuentes',
    'Control de Fincas Campestres'
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ---------------------------------------------------------------
ALTER TABLE public.contenido_sitio ENABLE ROW LEVEL SECURITY;

-- Lectura pública para que todos los visitantes vean el contenido configurado
DROP POLICY IF EXISTS "Lectura publica contenido sitio" ON public.contenido_sitio;
CREATE POLICY "Lectura publica contenido sitio"
    ON public.contenido_sitio FOR SELECT
    TO anon, authenticated
    USING (true);

-- Administradores autenticados tienen control total para actualizar contenido
DROP POLICY IF EXISTS "Admin gestion total contenido sitio" ON public.contenido_sitio;
CREATE POLICY "Admin gestion total contenido sitio"
    ON public.contenido_sitio FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Permiso de inserción/actualización de respaldo
DROP POLICY IF EXISTS "Insercion/actualizacion anonima contenido sitio" ON public.contenido_sitio;
CREATE POLICY "Insercion/actualizacion anonima contenido sitio"
    ON public.contenido_sitio FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

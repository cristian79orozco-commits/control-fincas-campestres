-- =====================================================================
-- ACTUALIZACIÓN QUIRÚRGICA: COLUMNAS DE PERSONALIZACIÓN Y PANEL CLIENTE
-- =====================================================================
-- Ejecuta este script en Supabase SQL Editor para habilitar persistencia
-- en base de datos de las nuevas opciones de visualización, gráficos y catálogo.
-- =====================================================================

ALTER TABLE public.contenido_sitio
  ADD COLUMN IF NOT EXISTS graficos_visible BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS graficos_titulo TEXT DEFAULT 'Análisis Visual & Calculadora de Presupuesto',
  ADD COLUMN IF NOT EXISTS graficos_subtitulo TEXT DEFAULT 'Compara capacidades, tarifas y simula tu inversión con ahorro directo en tiempo real',
  ADD COLUMN IF NOT EXISTS graficos_tipo TEXT DEFAULT 'ambos',
  ADD COLUMN IF NOT EXISTS comparador_visible BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS comparador_titulo TEXT DEFAULT 'Comparador de Fincas',
  ADD COLUMN IF NOT EXISTS comparador_subtitulo TEXT DEFAULT 'Compara especificaciones, comodidades y tarifas lado a lado',
  ADD COLUMN IF NOT EXISTS portal_cliente_visible BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS portal_cliente_titulo TEXT DEFAULT 'Consulta de Reserva & Cotización',
  ADD COLUMN IF NOT EXISTS portal_cliente_subtitulo TEXT DEFAULT 'Verifica el estado de tu reserva o cotización con tu número consecutivo o teléfono',
  ADD COLUMN IF NOT EXISTS catalogo_vista_predeterminada TEXT DEFAULT 'grid',
  ADD COLUMN IF NOT EXISTS catalogo_mostrar_badges BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS catalogo_mostrar_precio_total BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS personalizacion_visual JSONB DEFAULT '{"estilo_tarjeta":"moderno_3d","tema_color":"esmeralda"}'::jsonb;

-- Asegurar permisos de acceso
GRANT ALL ON public.contenido_sitio TO anon, authenticated, service_role;

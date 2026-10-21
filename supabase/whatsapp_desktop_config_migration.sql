-- ==============================================================================
-- Migración: Soporte para método de apertura de WhatsApp (Desktop PC vs Web)
-- Tabla objetivo: public.configuracion_general
-- Idempotente y seguro para producción (no altera políticas RLS existentes)
-- ==============================================================================

ALTER TABLE IF EXISTS public.configuracion_general 
ADD COLUMN IF NOT EXISTS metodo_whatsapp TEXT NOT NULL DEFAULT 'desktop';

COMMENT ON COLUMN public.configuracion_general.metodo_whatsapp 
IS 'Método de apertura para envíos de WhatsApp: desktop (App de PC whatsapp://) o web (WhatsApp Web https://)';

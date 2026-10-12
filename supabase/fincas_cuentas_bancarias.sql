-- =============================================================================
-- MIGRACIÓN: CUENTAS BANCARIAS DEL PROPIETARIO PARA SEPARACIÓN Y ABONOS
-- Control de Fincas Campestres
-- =============================================================================

-- 1. Agregar columnas a la tabla fincas para datos bancarios del dueño
ALTER TABLE public.fincas 
  ADD COLUMN IF NOT EXISTS banco_nombre TEXT DEFAULT 'Bancolombia',
  ADD COLUMN IF NOT EXISTS banco_tipo_cuenta TEXT DEFAULT 'Ahorros',
  ADD COLUMN IF NOT EXISTS banco_cuenta TEXT,
  ADD COLUMN IF NOT EXISTS banco_titular TEXT,
  ADD COLUMN IF NOT EXISTS banco_identificacion TEXT;

-- 2. Documentar las columnas mediante comentarios descriptivos
COMMENT ON COLUMN public.fincas.banco_nombre IS 'Nombre del banco o entidad financiera (ej: Bancolombia, Nequi, Daviplata, etc.) donde se consigna el abono';
COMMENT ON COLUMN public.fincas.banco_tipo_cuenta IS 'Tipo de cuenta bancaria: Ahorros, Corriente, Llave / Billetera digital';
COMMENT ON COLUMN public.fincas.banco_cuenta IS 'Número de cuenta o celular donde el cliente consigna el anticipo al dueño';
COMMENT ON COLUMN public.fincas.banco_titular IS 'Nombre completo del titular o beneficiario de la cuenta bancaria (dueño de la finca)';
COMMENT ON COLUMN public.fincas.banco_identificacion IS 'Cédula o NIT del titular de la cuenta para transferencias interbancarias';

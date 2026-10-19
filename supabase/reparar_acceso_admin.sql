-- ==============================================================================
-- SCRIPT DE REPARACIÓN Y ASIGNACIÓN DE CONTRASEÑA DE ADMINISTRADOR
-- Proyecto: Paraíso Terrenal
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Habilitar extensión criptográfica
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Reparar campos nulos y asignar la contraseña oficial 'Admin1234!'
UPDATE auth.users
SET 
    encrypted_password = crypt('Admin1234!', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    confirmation_token = '',
    recovery_token = '',
    email_change = '',
    email_change_token_new = '',
    phone_change = '',
    phone_change_token = '',
    raw_app_meta_data = '{"provider":"email","providers":["email"]}',
    raw_user_meta_data = '{"role":"admin"}',
    updated_at = NOW()
WHERE email = 'admin@fincas.com';

-- 3. En caso de que no existiera el usuario, crearlo completo y confirmado
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@fincas.com') THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            recovery_token,
            confirmation_token,
            email_change,
            email_change_token_new,
            phone_change,
            phone_change_token,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            'admin@fincas.com',
            crypt('Admin1234!', gen_salt('bf')),
            NOW(),
            '',
            '',
            '',
            '',
            '',
            '',
            '{"provider":"email","providers":["email"]}',
            '{"role":"admin"}',
            NOW(),
            NOW()
        );
    END IF;
END $$;

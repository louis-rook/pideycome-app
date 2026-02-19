-- 1. CREAR BUCKETS DE STORAGE (Requerido para subir imágenes)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('productos', 'productos', true, 52428800, '{image/*}'),
  ('avatars', 'avatars', true, 52428800, '{image/*}')
ON CONFLICT (id) DO NOTHING;

-- 2. DATOS DE NEGOCIO (Jerarquía Completa)

-- A. Cargo
INSERT INTO public.cargo ("NombreCargo") 
VALUES ('Administrador Sistema');

-- B. Tercero (La persona física)
INSERT INTO public.tercero ("Nombres", "Apellidos", "Email", "NumeroDocumento", "Direccion", "Telefono", "Activo") 
VALUES ('Sistema', 'Admin', 'admin@sistema.com', '999999999', 'Calle Principal #123', '3000000000', true);

-- C. Empleado (Vincula Tercero + Cargo)
INSERT INTO public.empleado ("TerceroID", "CargoID", "Activo")
VALUES (
    (SELECT "TerceroID" FROM public.tercero WHERE "Email" = 'admin@sistema.com' LIMIT 1),
    (SELECT "CargoID" FROM public.cargo WHERE "NombreCargo" = 'Administrador Sistema' LIMIT 1),
    true
);

-- D. Usuario de Sistema (Vincula Empleado. Aún sin Auth ID)
INSERT INTO public.usuario ("EmpleadoID", "Username", "auth_user_id", "Activo", "debecambiarpassword")
VALUES (
    (SELECT "EmpleadoID" FROM public.empleado e 
     JOIN public.tercero t ON e."TerceroID" = t."TerceroID" 
     WHERE t."Email" = 'admin@sistema.com' LIMIT 1),
    'admin_sys', -- Username interno
    NULL,        -- <--- IMPORTANTE: Lo actualizaremos en el paso 3
    true,
    false
);

UPDATE public.usuario 
SET auth_user_id = '7a23d38b-1cfb-41b5-be78-41f6e5939a7b' 
WHERE "Username" = 'admin_sys';
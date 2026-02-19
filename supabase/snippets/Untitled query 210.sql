select * from logoperaciones where "FechaHora" >= '2026-02-18 00:00:00' and "FechaHora" <= '2026-02-18 23:59:59' order by 1 desc

SET timezone = 'America/Bogota'; 

SELECT timeofday(); -- Devuelve la fecha/hora como texto [1, 10]

SELECT NOW() AT TIME ZONE 'America/Bogota'; -- Cambiar 'America/Bogota' por su zona horaria

-- Configurar la zona horaria de la base de datos a Colombia
ALTER DATABASE postgres SET timezone TO 'America/Bogota';

select * from producto


BEGIN;

-- 1. Activar seguridad RLS
ALTER TABLE public.producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precios ENABLE ROW LEVEL SECURITY;

-- 2. Borrar políticas viejas (para limpiar basura)
DROP POLICY IF EXISTS "Permisos productos" ON public.producto;
DROP POLICY IF EXISTS "Permisos precios" ON public.precios;
DROP POLICY IF EXISTS "Staff gestiona productos" ON public.producto;
DROP POLICY IF EXISTS "Staff gestiona precios" ON public.precios;

-- 3. CREAR POLÍTICAS PERMISIVAS
-- Permitimos que cualquier usuario autenticado (Líder, Admin, etc.) modifique estas tablas.
-- NOTA: La seguridad real de "Quién es Líder" ya la hace tu código TypeScript.
CREATE POLICY "Staff gestiona productos" 
ON public.producto 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Staff gestiona precios" 
ON public.precios 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

COMMIT;


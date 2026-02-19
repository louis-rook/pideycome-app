BEGIN;

-- 1. Habilitar RLS (Seguro puesto)
ALTER TABLE public.pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detallepedido ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- TABLA: PEDIDO
-- =========================================================

-- A. Limpiar políticas viejas peligrosas
DROP POLICY IF EXISTS "Crear pedidos publico" ON public.pedido;
DROP POLICY IF EXISTS "Insertar pedidos todos" ON public.pedido;
DROP POLICY IF EXISTS "Permiso total pedidos" ON public.pedido;

-- B. Regla para CLIENTES (Anon): Solo Insertar y solo en Estado '1'
CREATE POLICY "Clientes crean pedidos" 
ON public.pedido 
FOR INSERT 
TO public 
WITH CHECK (
    "EstadoID" = 1  -- 🔒 CANDADO: Solo pueden crear pedidos "Por Confirmar"
);

-- C. Regla para STAFF (Authenticated): Ver y Modificar todo
CREATE POLICY "Staff gestiona pedidos" 
ON public.pedido 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- =========================================================
-- TABLA: DETALLE PEDIDO
-- =========================================================

DROP POLICY IF EXISTS "Crear detalles publico" ON public.detallepedido;

-- A. Regla para CLIENTES: Solo Insertar detalles
CREATE POLICY "Clientes agregan productos" 
ON public.detallepedido 
FOR INSERT 
TO public 
WITH CHECK (true);

-- B. Regla para STAFF: Ver y Modificar
CREATE POLICY "Staff gestiona detalles" 
ON public.detallepedido 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

COMMIT;
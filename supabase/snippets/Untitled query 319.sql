CREATE OR REPLACE FUNCTION public.fn_registrar_log_operaciones()
RETURNS TRIGGER AS $$
DECLARE
    v_usuario_id bigint;
    v_detalles jsonb;
    v_user_uuid uuid;
BEGIN
    -- 1. OBTENER EL UUID DE SUPABASE (De forma segura)
    -- Usamos un bloque anónimo por si auth.uid() falla en algún contexto raro
    BEGIN
        v_user_uuid := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_uuid := NULL;
    END;

    -- 2. TRADUCIR UUID A ID LOCAL (La parte crítica)
    -- Buscamos el ID numérico en tu tabla de usuarios
    IF v_user_uuid IS NOT NULL THEN
        SELECT "UsuarioID" INTO v_usuario_id
        FROM public.usuario
        WHERE auth_user_id = v_user_uuid;
    ELSE
        v_usuario_id := NULL; -- Si no hay sesión (ej: script del sistema), queda null
    END IF;

    -- 3. CONSTRUIR EL JSON DE DETALLES
    IF (TG_OP = 'DELETE') THEN
        v_detalles := row_to_json(OLD)::jsonb;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Guardamos el estado anterior y el nuevo para ver qué cambió
        v_detalles := jsonb_build_object(
            'anterior', row_to_json(OLD),
            'nuevo', row_to_json(NEW)
        );
    ELSIF (TG_OP = 'INSERT') THEN
        v_detalles := row_to_json(NEW)::jsonb;
    END IF;

    -- 4. INSERTAR EN EL LOG
    INSERT INTO public.logoperaciones (
        "Tabla", 
        "Operacion", 
        "UsuarioID", 
        "Detalles", 
        "FechaHora"
    )
    VALUES (
        TG_TABLE_NAME, 
        TG_OP, 
        v_usuario_id, 
        v_detalles::text, -- Casteamos el jsonb a text porque tu tabla usa text
        now()
    );

    RETURN NULL; -- En triggers AFTER se retorna NULL
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 
-- ^^^ IMPORTANTE: SECURITY DEFINER permite leer la tabla de usuarios aunque haya RLS

-- 1. Trigger para PEDIDOS (Crucial para ver cambios de estado)
DROP TRIGGER IF EXISTS tr_log_pedido ON public.pedido;
CREATE TRIGGER tr_log_pedido
AFTER INSERT OR UPDATE OR DELETE ON public.pedido
FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_log_operaciones();

-- 2. Trigger para DETALLE PEDIDO
DROP TRIGGER IF EXISTS tr_log_detallepedido ON public.detallepedido;
CREATE TRIGGER tr_log_detallepedido
AFTER INSERT OR UPDATE OR DELETE ON public.detallepedido
FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_log_operaciones();

-- 3. Trigger para PRODUCTOS (Para saber quién cambió un precio o nombre)
DROP TRIGGER IF EXISTS tr_log_producto ON public.producto;
CREATE TRIGGER tr_log_producto
AFTER INSERT OR UPDATE OR DELETE ON public.producto
FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_log_operaciones();
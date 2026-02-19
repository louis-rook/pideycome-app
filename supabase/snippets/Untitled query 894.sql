BEGIN;

-- 1. BORRAR TODOS LOS TRIGGERS VIEJOS (Sin piedad)
DROP TRIGGER IF EXISTS tr_log_pedido ON public.pedido;
DROP TRIGGER IF EXISTS tr_cambio_estado_pedido ON public.pedido;
DROP TRIGGER IF EXISTS tr_audit_log ON public.pedido;
DROP TRIGGER IF EXISTS "tr_log_operaciones_pedido" ON public.pedido;
DROP TRIGGER IF EXISTS log_pedido_insert ON public.pedido;

-- También limpiamos los de detalle y tercero por si acaso
DROP TRIGGER IF EXISTS tr_log_detallepedido ON public.detallepedido;
DROP TRIGGER IF EXISTS tr_log_tercero ON public.tercero;
DROP TRIGGER IF EXISTS tr_log_cliente ON public.cliente;

-- 2. RECREAR EL ÚNICO TRIGGER NECESARIO (El Maestro)
-- Pedido
CREATE TRIGGER tr_log_pedido
AFTER INSERT OR UPDATE OR DELETE ON public.pedido
FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_log_operaciones();

-- Detalle Pedido
CREATE TRIGGER tr_log_detallepedido
AFTER INSERT OR UPDATE OR DELETE ON public.detallepedido
FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_log_operaciones();

-- Tercero (Opcional, si quieres auditar clientes)
CREATE TRIGGER tr_log_tercero
AFTER INSERT OR UPDATE OR DELETE ON public.tercero
FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_log_operaciones();

-- Cliente
CREATE TRIGGER tr_log_cliente
AFTER INSERT OR UPDATE OR DELETE ON public.cliente
FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_log_operaciones();

COMMIT;
set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.fn_registrar_log_operaciones()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_usuario_id bigint;
    v_detalles jsonb;
    v_user_uuid uuid;
BEGIN
    -- Capturar UUID de forma segura
    BEGIN
        v_user_uuid := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_uuid := NULL;
    END;

    -- Buscar ID numérico
    IF v_user_uuid IS NOT NULL THEN
        SELECT "UsuarioID" INTO v_usuario_id
        FROM public.usuario
        WHERE auth_user_id = v_user_uuid;
    ELSE
        v_usuario_id := NULL;
    END IF;

    -- Construir JSON
    IF (TG_OP = 'DELETE') THEN
        v_detalles := jsonb_build_object('anterior', row_to_json(OLD));
    ELSIF (TG_OP = 'UPDATE') THEN
        v_detalles := jsonb_build_object(
            'anterior', row_to_json(OLD),
            'nuevo', row_to_json(NEW)
        );
    ELSE
        v_detalles := row_to_json(NEW)::jsonb;
    END IF;

    -- Insertar Log
    INSERT INTO public.logoperaciones (
        "Tabla", "Operacion", "UsuarioID", "Detalles", "FechaHora"
    )
    VALUES (
        TG_TABLE_NAME, TG_OP, v_usuario_id, v_detalles::text, now()
    );

    RETURN NULL;
END;
$function$
;


  create policy "Clientes agregan productos"
  on "public"."detallepedido"
  as permissive
  for insert
  to public
with check (true);



  create policy "Staff gestiona detalles"
  on "public"."detallepedido"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Clientes crean pedidos"
  on "public"."pedido"
  as permissive
  for insert
  to public
with check (("EstadoID" = 1));



  create policy "Staff gestiona pedidos"
  on "public"."pedido"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Staff gestiona precios"
  on "public"."precios"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Staff gestiona productos"
  on "public"."producto"
  as permissive
  for all
  to authenticated
using (true)
with check (true);


CREATE TRIGGER tr_log_cliente AFTER INSERT OR DELETE OR UPDATE ON public.cliente FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_log_operaciones();

CREATE TRIGGER tr_log_detallepedido AFTER INSERT OR DELETE OR UPDATE ON public.detallepedido FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_log_operaciones();

CREATE TRIGGER tr_log_pedido AFTER INSERT OR DELETE OR UPDATE ON public.pedido FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_log_operaciones();

CREATE TRIGGER tr_log_producto AFTER INSERT OR DELETE OR UPDATE ON public.producto FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_log_operaciones();

CREATE TRIGGER tr_log_tercero AFTER INSERT OR DELETE OR UPDATE ON public.tercero FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_log_operaciones();



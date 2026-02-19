


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."es_administrador"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.usuario u
        INNER JOIN public.empleado e ON u."EmpleadoID" = e."EmpleadoID"
        INNER JOIN public.cargo c ON e."CargoID" = c."CargoID"
        WHERE u.auth_user_id = auth.uid()
        AND (c."NombreCargo" ILIKE '%admin%' OR c."NombreCargo" ILIKE '%sistema%')
    ) INTO is_admin;
    
    RETURN is_admin;
END;
$$;


ALTER FUNCTION "public"."es_administrador"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_registrar_auditoria"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_usuario_id bigint;
    v_detalles text;
    v_user_uuid uuid;
BEGIN
    -- 1. Intentar obtener el UUID del usuario logueado en Supabase
    -- (Funciona si la petición viene del Frontend o Server Actions autenticados)
    BEGIN
        v_user_uuid := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_uuid := NULL;
    END;

    -- 2. Traducir el UUID de Supabase al ID de tu tabla 'usuario' (BigInt)
    IF v_user_uuid IS NOT NULL THEN
        SELECT "UsuarioID" INTO v_usuario_id
        FROM public.usuario
        WHERE auth_user_id = v_user_uuid;
    END IF;

    -- 3. Construir el JSON de detalles según la operación
    IF (TG_OP = 'DELETE') THEN
        -- Si borran, guardamos qué se borró
        v_detalles := row_to_json(OLD)::text;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Si actualizan, guardamos ANTERIOR y NUEVO para comparar
        v_detalles := json_build_object(
            'cambio_anterior', row_to_json(OLD), 
            'cambio_nuevo', row_to_json(NEW)
        )::text;
    ELSE -- INSERT
        -- Si insertan, guardamos lo nuevo
        v_detalles := row_to_json(NEW)::text;
    END IF;

    -- 4. Insertar en la tabla de Logs
    INSERT INTO public.logoperaciones (
        "Tabla", 
        "Operacion", 
        "UsuarioID", 
        "Detalles", 
        "FechaHora"
    )
    VALUES (
        TG_TABLE_NAME, -- Nombre de la tabla automática
        TG_OP,         -- INSERT, UPDATE o DELETE
        v_usuario_id,  -- ID del usuario (o NULL si fue el sistema/admin sin sesión)
        v_detalles,    -- El JSON con los datos
        NOW()          -- Fecha actual
    );

    RETURN NULL; -- Resultado ignorado en triggers AFTER
END;
$$;


ALTER FUNCTION "public"."fn_registrar_auditoria"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generar_factura_al_pagar"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- CONDICIÓN: Se ejecuta solo cuando el Estado cambia a 2 (Pagado)
  IF (NEW."EstadoID" = 2 AND OLD."EstadoID" <> 2) THEN
    
    INSERT INTO public.factura (
        "PedidoID", 
        "FechaEmision", 
        "HoraEmision", 
        "MetodoPago",   
        "SubTotal", 
        "Impuestos", 
        "Total",
        "NumeroFactura"
    ) VALUES (
        NEW."PedidoID",
        CURRENT_DATE,
        CURRENT_TIME,
        NEW."MetodoPago", -- Usa el método que guardamos al crear el pedido
        NEW."Total",      
        0,                -- (Aquí podrías calcular IVA si tuvieras la lógica)
        NEW."Total",
        -- Genera un número consecutivo simple por ahora. 
        -- Más adelante puedes usar una secuencia real de facturación.
        'POS-' || TO_CHAR(NOW(), 'YYYY') || '-' || NEW."PedidoID"
    );
    
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generar_factura_al_pagar"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dashboard_kpis"("fecha_inicio" "text", "fecha_fin" "text", "usuario_filtro" bigint DEFAULT NULL::bigint) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_inicio date := fecha_inicio::date;
  v_fin date := fecha_fin::date;
  
  -- Variables
  total_ventas numeric;
  pedidos_totales int;
  pedidos_completados int;
  ticket_promedio numeric;
  
  -- Variables JSON
  ventas_por_dia json;
  ventas_por_categoria json;
  horas_pico json;
  top_productos json;
  metodos_pago json;
BEGIN

  -- 1. KPI FINANCIERO (Ventas)
  SELECT COALESCE(SUM(f."Total"), 0) INTO total_ventas
  FROM public.factura f
  LEFT JOIN public.pedido p ON f."PedidoID" = p."PedidoID"
  WHERE f."FechaEmision" >= v_inicio AND f."FechaEmision" <= v_fin
  AND (usuario_filtro IS NULL OR p."UsuarioID" = usuario_filtro);

  -- 2. KPI OPERATIVO (Conteo de Pedidos)
  SELECT 
    COUNT(*),
    -- ⚠️ CORRECCIÓN CLAVE: Cambiado a 5 (Entregado)
    -- Si quieres ver Listos (4) y Entregados (5) sumados, usa: WHERE "EstadoID" IN (4, 5)
    COUNT(*) FILTER (WHERE "EstadoID" = 5) 
  INTO pedidos_totales, pedidos_completados
  FROM public.pedido
  WHERE DATE("Fecha") >= v_inicio AND DATE("Fecha") <= v_fin
  AND (usuario_filtro IS NULL OR "UsuarioID" = usuario_filtro);

  -- 3. Ticket Promedio
  IF pedidos_completados > 0 THEN 
    ticket_promedio := total_ventas / pedidos_completados;
  ELSE 
    ticket_promedio := 0; 
  END IF;

  -- 4. Gráficos y Tablas (Se mantienen igual, asegurando el filtro de fechas)
  -- Ventas por Día
  SELECT json_agg(t) INTO ventas_por_dia FROM (
    SELECT TO_CHAR(f."FechaEmision", 'YYYY-MM-DD') as fecha, TO_CHAR(f."FechaEmision", 'Dy') as dia_nombre, SUM(f."Total") as total
    FROM public.factura f
    JOIN public.pedido p ON f."PedidoID" = p."PedidoID"
    WHERE f."FechaEmision" >= v_inicio AND f."FechaEmision" <= v_fin
    AND (usuario_filtro IS NULL OR p."UsuarioID" = usuario_filtro)
    GROUP BY fecha, dia_nombre ORDER BY fecha ASC
  ) t;

  -- Ventas por Categoría
  SELECT json_agg(t) INTO ventas_por_categoria FROM (
    SELECT c."Nombre" as categoria, SUM(dp."Cantidad") as cantidad
    FROM public.detallepedido dp
    JOIN public.pedido p ON dp."PedidoID" = p."PedidoID"
    JOIN public.producto prod ON dp."ProductoID" = prod."ProductoID"
    JOIN public.categoria c ON prod."CategoriaID" = c."CategoriaID"
    WHERE DATE(p."Fecha") >= v_inicio AND DATE(p."Fecha") <= v_fin
    AND (usuario_filtro IS NULL OR p."UsuarioID" = usuario_filtro)
    GROUP BY c."Nombre"
  ) t;

  -- Horas Pico
  SELECT json_agg(t) INTO horas_pico FROM (
    SELECT EXTRACT(HOUR FROM p."Fecha") as hora, COUNT(*) as cantidad_pedidos
    FROM public.pedido p
    WHERE DATE(p."Fecha") >= v_inicio AND DATE(p."Fecha") <= v_fin
    AND (usuario_filtro IS NULL OR p."UsuarioID" = usuario_filtro)
    GROUP BY hora ORDER BY hora ASC
  ) t;

  -- Top Productos
  SELECT json_agg(t) INTO top_productos FROM (
    SELECT prod."Nombre", SUM(dp."Cantidad") as cantidad
    FROM public.detallepedido dp
    JOIN public.pedido p ON dp."PedidoID" = p."PedidoID"
    JOIN public.producto prod ON dp."ProductoID" = prod."ProductoID"
    WHERE DATE(p."Fecha") >= v_inicio AND DATE(p."Fecha") <= v_fin
    AND (usuario_filtro IS NULL OR p."UsuarioID" = usuario_filtro)
    GROUP BY prod."Nombre" ORDER BY cantidad DESC LIMIT 5
  ) t;

  RETURN json_build_object(
    'total_ventas', total_ventas,
    'pedidos_totales', pedidos_totales,
    'pedidos_completados', pedidos_completados,
    'ticket_promedio', ticket_promedio,
    'ventas_por_dia', COALESCE(ventas_por_dia, '[]'::json),
    'ventas_por_categoria', COALESCE(ventas_por_categoria, '[]'::json),
    'horas_pico', COALESCE(horas_pico, '[]'::json),
    'top_productos', COALESCE(top_productos, '[]'::json)
  );
END;
$$;


ALTER FUNCTION "public"."get_dashboard_kpis"("fecha_inicio" "text", "fecha_fin" "text", "usuario_filtro" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."registrar_log_pedido"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_usuario_id bigint;
  v_username text;
BEGIN
  -- Intentamos obtener el UsuarioID del usuario logueado en Supabase Auth
  SELECT "UsuarioID", "Username" INTO v_usuario_id, v_username
  FROM public.usuario
  WHERE auth_user_id = auth.uid();

  -- Si es una actualización de ESTADO (Lo que nos interesa)
  IF (TG_OP = 'UPDATE' AND OLD."EstadoID" <> NEW."EstadoID") THEN
      INSERT INTO public.logoperaciones (
          "Tabla", 
          "Operacion", 
          "UsuarioID", 
          "Detalles", 
          "FechaHora"
      ) VALUES (
          'pedido',
          'CAMBIO ESTADO',
          v_usuario_id,
          'Pedido #' || NEW."PedidoID" || ' pasó de Estado ' || OLD."EstadoID" || ' a ' || NEW."EstadoID",
          now()
      );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."registrar_log_pedido"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."arqueo_caja" (
    "ArqueoID" bigint NOT NULL,
    "Fecha" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "UsuarioAuditorID" bigint NOT NULL,
    "UsuarioResponsableID" bigint,
    "TotalSistema" numeric NOT NULL,
    "TotalFisico" numeric NOT NULL,
    "Diferencia" numeric GENERATED ALWAYS AS (("TotalFisico" - "TotalSistema")) STORED,
    "Observaciones" "text",
    "Estado" "text" DEFAULT 'CERRADO'::"text",
    "DetallePagos" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."arqueo_caja" OWNER TO "postgres";


ALTER TABLE "public"."arqueo_caja" ALTER COLUMN "ArqueoID" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."arqueo_caja_ArqueoID_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."cargo" (
    "CargoID" bigint NOT NULL,
    "NombreCargo" "text" NOT NULL
);


ALTER TABLE "public"."cargo" OWNER TO "postgres";


ALTER TABLE "public"."cargo" ALTER COLUMN "CargoID" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cargo_CargoID_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."categoria" (
    "CategoriaID" bigint NOT NULL,
    "Nombre" "text" NOT NULL,
    "Descripcion" "text"
);


ALTER TABLE "public"."categoria" OWNER TO "postgres";


ALTER TABLE "public"."categoria" ALTER COLUMN "CategoriaID" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."categoria_CategoriaID_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."cliente" (
    "ClienteID" bigint NOT NULL,
    "TerceroID" bigint NOT NULL,
    "Activo" boolean DEFAULT true
);


ALTER TABLE "public"."cliente" OWNER TO "postgres";


ALTER TABLE "public"."cliente" ALTER COLUMN "ClienteID" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cliente_ClienteID_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."detallepedido" (
    "DetalleID" bigint NOT NULL,
    "PedidoID" bigint NOT NULL,
    "ProductoID" bigint NOT NULL,
    "Cantidad" integer NOT NULL,
    "PrecioUnit" numeric(12,2) NOT NULL,
    "Observaciones" "text"
);


ALTER TABLE "public"."detallepedido" OWNER TO "postgres";


ALTER TABLE "public"."detallepedido" ALTER COLUMN "DetalleID" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."detallepedido_DetalleID_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."empleado" (
    "EmpleadoID" bigint NOT NULL,
    "TerceroID" bigint NOT NULL,
    "CargoID" bigint NOT NULL,
    "Activo" boolean DEFAULT true
);


ALTER TABLE "public"."empleado" OWNER TO "postgres";


ALTER TABLE "public"."empleado" ALTER COLUMN "EmpleadoID" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."empleado_EmpleadoID_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."estado" (
    "EstadoID" bigint NOT NULL,
    "NombreEstado" "text" NOT NULL
);


ALTER TABLE "public"."estado" OWNER TO "postgres";


ALTER TABLE "public"."estado" ALTER COLUMN "EstadoID" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."estado_EstadoID_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."factura" (
    "FacturaID" bigint NOT NULL,
    "PedidoID" bigint NOT NULL,
    "FechaEmision" "date" NOT NULL,
    "HoraEmision" time without time zone NOT NULL,
    "MetodoPago" "text",
    "SubTotal" numeric(10,2) NOT NULL,
    "Impuestos" numeric(10,2) NOT NULL,
    "Total" numeric(10,2) NOT NULL,
    "NumeroFactura" "text"
);


ALTER TABLE "public"."factura" OWNER TO "postgres";


ALTER TABLE "public"."factura" ALTER COLUMN "FacturaID" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."factura_FacturaID_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."logoperaciones" (
    "LogID" bigint NOT NULL,
    "Tabla" "text" NOT NULL,
    "Operacion" "text" NOT NULL,
    "FechaHora" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "UsuarioID" bigint,
    "Detalles" "text"
);


ALTER TABLE "public"."logoperaciones" OWNER TO "postgres";


ALTER TABLE "public"."logoperaciones" ALTER COLUMN "LogID" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."logoperaciones_LogID_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."pedido" (
    "PedidoID" bigint NOT NULL,
    "ClienteID" bigint NOT NULL,
    "UsuarioID" bigint,
    "EstadoID" bigint NOT NULL,
    "Fecha" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "Total" numeric(10,2),
    "MetodoPago" "text",
    "FacturaElectronica" boolean DEFAULT false
);


ALTER TABLE "public"."pedido" OWNER TO "postgres";


ALTER TABLE "public"."pedido" ALTER COLUMN "PedidoID" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."pedido_PedidoID_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."precios" (
    "ProductoID" bigint NOT NULL,
    "FechaActivacion" "date" NOT NULL,
    "Precio" numeric(10,2) NOT NULL,
    "FechaModificacion" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "UsuarioCreacion" bigint NOT NULL,
    "UsuarioModificacion" bigint
);


ALTER TABLE "public"."precios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."producto" (
    "ProductoID" bigint NOT NULL,
    "CategoriaID" bigint NOT NULL,
    "Nombre" "text" NOT NULL,
    "Descripcion" "text",
    "Imagen" "text",
    "Ingredientes" "text",
    "activo" boolean DEFAULT true
);


ALTER TABLE "public"."producto" OWNER TO "postgres";


ALTER TABLE "public"."producto" ALTER COLUMN "ProductoID" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."producto_ProductoID_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."tercero" (
    "TerceroID" bigint NOT NULL,
    "Nombres" "text" NOT NULL,
    "Apellidos" "text",
    "Direccion" "text",
    "Telefono" "text",
    "Email" "text",
    "TipoDocumento" "text",
    "NumeroDocumento" "text",
    "Activo" boolean DEFAULT true
);


ALTER TABLE "public"."tercero" OWNER TO "postgres";


ALTER TABLE "public"."tercero" ALTER COLUMN "TerceroID" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."tercero_TerceroID_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."usuario" (
    "UsuarioID" bigint NOT NULL,
    "EmpleadoID" bigint NOT NULL,
    "Username" "text" NOT NULL,
    "FechaCreacion" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "auth_user_id" "uuid",
    "Activo" boolean DEFAULT true,
    "FotoPerfil" "text",
    "debecambiarpassword" boolean DEFAULT true
);


ALTER TABLE "public"."usuario" OWNER TO "postgres";


ALTER TABLE "public"."usuario" ALTER COLUMN "UsuarioID" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."usuario_UsuarioID_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."arqueo_caja"
    ADD CONSTRAINT "arqueo_pkey" PRIMARY KEY ("ArqueoID");



ALTER TABLE ONLY "public"."cargo"
    ADD CONSTRAINT "cargo_pkey" PRIMARY KEY ("CargoID");



ALTER TABLE ONLY "public"."categoria"
    ADD CONSTRAINT "categoria_pkey" PRIMARY KEY ("CategoriaID");



ALTER TABLE ONLY "public"."cliente"
    ADD CONSTRAINT "cliente_pkey" PRIMARY KEY ("ClienteID");



ALTER TABLE ONLY "public"."detallepedido"
    ADD CONSTRAINT "detallepedido_pkey" PRIMARY KEY ("DetalleID");



ALTER TABLE ONLY "public"."empleado"
    ADD CONSTRAINT "empleado_pkey" PRIMARY KEY ("EmpleadoID");



ALTER TABLE ONLY "public"."estado"
    ADD CONSTRAINT "estado_pkey" PRIMARY KEY ("EstadoID");



ALTER TABLE ONLY "public"."factura"
    ADD CONSTRAINT "factura_pkey" PRIMARY KEY ("FacturaID");



ALTER TABLE ONLY "public"."logoperaciones"
    ADD CONSTRAINT "logoperaciones_pkey" PRIMARY KEY ("LogID");



ALTER TABLE ONLY "public"."pedido"
    ADD CONSTRAINT "pedido_pkey" PRIMARY KEY ("PedidoID");



ALTER TABLE ONLY "public"."precios"
    ADD CONSTRAINT "precios_pkey" PRIMARY KEY ("ProductoID", "FechaActivacion", "Precio");



ALTER TABLE ONLY "public"."producto"
    ADD CONSTRAINT "producto_pkey" PRIMARY KEY ("ProductoID");



ALTER TABLE ONLY "public"."tercero"
    ADD CONSTRAINT "tercero_Email_key" UNIQUE ("Email");



ALTER TABLE ONLY "public"."tercero"
    ADD CONSTRAINT "tercero_NumeroDocumento_key" UNIQUE ("NumeroDocumento");



ALTER TABLE ONLY "public"."tercero"
    ADD CONSTRAINT "tercero_Telefono_key" UNIQUE ("Telefono");



ALTER TABLE ONLY "public"."tercero"
    ADD CONSTRAINT "tercero_pkey" PRIMARY KEY ("TerceroID");



ALTER TABLE ONLY "public"."usuario"
    ADD CONSTRAINT "usuario_Username_key" UNIQUE ("Username");



ALTER TABLE ONLY "public"."usuario"
    ADD CONSTRAINT "usuario_pkey" PRIMARY KEY ("UsuarioID");



CREATE OR REPLACE TRIGGER "trg_audit_cliente" AFTER INSERT OR DELETE OR UPDATE ON "public"."cliente" FOR EACH ROW EXECUTE FUNCTION "public"."fn_registrar_auditoria"();



CREATE OR REPLACE TRIGGER "trg_audit_pedido" AFTER INSERT OR DELETE OR UPDATE ON "public"."pedido" FOR EACH ROW EXECUTE FUNCTION "public"."fn_registrar_auditoria"();



CREATE OR REPLACE TRIGGER "trg_audit_precios" AFTER INSERT OR DELETE OR UPDATE ON "public"."precios" FOR EACH ROW EXECUTE FUNCTION "public"."fn_registrar_auditoria"();



CREATE OR REPLACE TRIGGER "trg_audit_producto" AFTER INSERT OR DELETE OR UPDATE ON "public"."producto" FOR EACH ROW EXECUTE FUNCTION "public"."fn_registrar_auditoria"();



CREATE OR REPLACE TRIGGER "trg_audit_tercero" AFTER INSERT OR DELETE OR UPDATE ON "public"."tercero" FOR EACH ROW EXECUTE FUNCTION "public"."fn_registrar_auditoria"();



CREATE OR REPLACE TRIGGER "trg_generar_factura" AFTER UPDATE ON "public"."pedido" FOR EACH ROW EXECUTE FUNCTION "public"."generar_factura_al_pagar"();



CREATE OR REPLACE TRIGGER "trg_log_pedido" AFTER UPDATE ON "public"."pedido" FOR EACH ROW EXECUTE FUNCTION "public"."registrar_log_pedido"();



ALTER TABLE ONLY "public"."arqueo_caja"
    ADD CONSTRAINT "arqueo_auditor_fkey" FOREIGN KEY ("UsuarioAuditorID") REFERENCES "public"."usuario"("UsuarioID");



ALTER TABLE ONLY "public"."arqueo_caja"
    ADD CONSTRAINT "arqueo_responsable_fkey" FOREIGN KEY ("UsuarioResponsableID") REFERENCES "public"."usuario"("UsuarioID");



ALTER TABLE ONLY "public"."cliente"
    ADD CONSTRAINT "cliente_TerceroID_fkey" FOREIGN KEY ("TerceroID") REFERENCES "public"."tercero"("TerceroID") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."detallepedido"
    ADD CONSTRAINT "detallepedido_PedidoID_fkey" FOREIGN KEY ("PedidoID") REFERENCES "public"."pedido"("PedidoID");



ALTER TABLE ONLY "public"."detallepedido"
    ADD CONSTRAINT "detallepedido_ProductoID_fkey" FOREIGN KEY ("ProductoID") REFERENCES "public"."producto"("ProductoID");



ALTER TABLE ONLY "public"."empleado"
    ADD CONSTRAINT "empleado_CargoID_fkey" FOREIGN KEY ("CargoID") REFERENCES "public"."cargo"("CargoID");



ALTER TABLE ONLY "public"."empleado"
    ADD CONSTRAINT "empleado_TerceroID_fkey" FOREIGN KEY ("TerceroID") REFERENCES "public"."tercero"("TerceroID") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."factura"
    ADD CONSTRAINT "factura_PedidoID_fkey" FOREIGN KEY ("PedidoID") REFERENCES "public"."pedido"("PedidoID");



ALTER TABLE ONLY "public"."logoperaciones"
    ADD CONSTRAINT "logoperaciones_UsuarioID_fkey" FOREIGN KEY ("UsuarioID") REFERENCES "public"."usuario"("UsuarioID");



ALTER TABLE ONLY "public"."pedido"
    ADD CONSTRAINT "pedido_ClienteID_fkey" FOREIGN KEY ("ClienteID") REFERENCES "public"."cliente"("ClienteID");



ALTER TABLE ONLY "public"."pedido"
    ADD CONSTRAINT "pedido_EstadoID_fkey" FOREIGN KEY ("EstadoID") REFERENCES "public"."estado"("EstadoID");



ALTER TABLE ONLY "public"."pedido"
    ADD CONSTRAINT "pedido_UsuarioID_fkey" FOREIGN KEY ("UsuarioID") REFERENCES "public"."usuario"("UsuarioID");



ALTER TABLE ONLY "public"."precios"
    ADD CONSTRAINT "precios_ProductoID_fkey" FOREIGN KEY ("ProductoID") REFERENCES "public"."producto"("ProductoID");



ALTER TABLE ONLY "public"."precios"
    ADD CONSTRAINT "precios_UsuarioCreacion_fkey" FOREIGN KEY ("UsuarioCreacion") REFERENCES "public"."usuario"("UsuarioID");



ALTER TABLE ONLY "public"."precios"
    ADD CONSTRAINT "precios_UsuarioModificacion_fkey" FOREIGN KEY ("UsuarioModificacion") REFERENCES "public"."usuario"("UsuarioID");



ALTER TABLE ONLY "public"."producto"
    ADD CONSTRAINT "producto_CategoriaID_fkey" FOREIGN KEY ("CategoriaID") REFERENCES "public"."categoria"("CategoriaID");



ALTER TABLE ONLY "public"."usuario"
    ADD CONSTRAINT "usuario_EmpleadoID_fkey" FOREIGN KEY ("EmpleadoID") REFERENCES "public"."empleado"("EmpleadoID");



ALTER TABLE ONLY "public"."usuario"
    ADD CONSTRAINT "usuario_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



CREATE POLICY "Admin Gestiona Empleados" ON "public"."empleado" TO "authenticated" USING ("public"."es_administrador"()) WITH CHECK ("public"."es_administrador"());



CREATE POLICY "Admin Gestiona Terceros" ON "public"."tercero" TO "authenticated" USING ("public"."es_administrador"()) WITH CHECK ("public"."es_administrador"());



CREATE POLICY "Lectura General Empleados" ON "public"."empleado" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Lectura General Terceros" ON "public"."tercero" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Lectura detalles autenticados" ON "public"."detallepedido" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Lectura precios autenticados" ON "public"."precios" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Lectura productos autenticados" ON "public"."producto" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Lectura publica categorias" ON "public"."categoria" FOR SELECT USING (true);



CREATE POLICY "Lectura publica precios" ON "public"."precios" FOR SELECT USING (true);



CREATE POLICY "Lectura publica productos" ON "public"."producto" FOR SELECT USING (true);



CREATE POLICY "Leer cargos" ON "public"."cargo" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Leer empleados" ON "public"."empleado" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Leer terceros" ON "public"."tercero" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Permitir lectura a autenticados" ON "public"."cliente" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Permitir lectura a autenticados" ON "public"."tercero" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Permitir lectura a autenticados" ON "public"."usuario" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Permitir lectura a usuarios autenticados" ON "public"."pedido" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON "public"."usuario" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "auth_user_id")) WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Ver propio usuario" ON "public"."usuario" FOR SELECT TO "authenticated" USING (("auth_user_id" = "auth"."uid"()));



ALTER TABLE "public"."arqueo_caja" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cargo" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categoria" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cliente" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."detallepedido" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."empleado" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."estado" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."factura" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pedido" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."precios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."producto" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tercero" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usuario" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."pedido";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."es_administrador"() TO "anon";
GRANT ALL ON FUNCTION "public"."es_administrador"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."es_administrador"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_registrar_auditoria"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_registrar_auditoria"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_registrar_auditoria"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generar_factura_al_pagar"() TO "anon";
GRANT ALL ON FUNCTION "public"."generar_factura_al_pagar"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generar_factura_al_pagar"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dashboard_kpis"("fecha_inicio" "text", "fecha_fin" "text", "usuario_filtro" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_dashboard_kpis"("fecha_inicio" "text", "fecha_fin" "text", "usuario_filtro" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_kpis"("fecha_inicio" "text", "fecha_fin" "text", "usuario_filtro" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."registrar_log_pedido"() TO "anon";
GRANT ALL ON FUNCTION "public"."registrar_log_pedido"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."registrar_log_pedido"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";


















GRANT ALL ON TABLE "public"."arqueo_caja" TO "anon";
GRANT ALL ON TABLE "public"."arqueo_caja" TO "authenticated";
GRANT ALL ON TABLE "public"."arqueo_caja" TO "service_role";



GRANT ALL ON SEQUENCE "public"."arqueo_caja_ArqueoID_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."arqueo_caja_ArqueoID_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."arqueo_caja_ArqueoID_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cargo" TO "anon";
GRANT ALL ON TABLE "public"."cargo" TO "authenticated";
GRANT ALL ON TABLE "public"."cargo" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cargo_CargoID_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cargo_CargoID_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cargo_CargoID_seq" TO "service_role";



GRANT ALL ON TABLE "public"."categoria" TO "anon";
GRANT ALL ON TABLE "public"."categoria" TO "authenticated";
GRANT ALL ON TABLE "public"."categoria" TO "service_role";



GRANT ALL ON SEQUENCE "public"."categoria_CategoriaID_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."categoria_CategoriaID_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."categoria_CategoriaID_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cliente" TO "anon";
GRANT ALL ON TABLE "public"."cliente" TO "authenticated";
GRANT ALL ON TABLE "public"."cliente" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cliente_ClienteID_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cliente_ClienteID_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cliente_ClienteID_seq" TO "service_role";



GRANT ALL ON TABLE "public"."detallepedido" TO "anon";
GRANT ALL ON TABLE "public"."detallepedido" TO "authenticated";
GRANT ALL ON TABLE "public"."detallepedido" TO "service_role";



GRANT ALL ON SEQUENCE "public"."detallepedido_DetalleID_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."detallepedido_DetalleID_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."detallepedido_DetalleID_seq" TO "service_role";



GRANT ALL ON TABLE "public"."empleado" TO "anon";
GRANT ALL ON TABLE "public"."empleado" TO "authenticated";
GRANT ALL ON TABLE "public"."empleado" TO "service_role";



GRANT ALL ON SEQUENCE "public"."empleado_EmpleadoID_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."empleado_EmpleadoID_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."empleado_EmpleadoID_seq" TO "service_role";



GRANT ALL ON TABLE "public"."estado" TO "anon";
GRANT ALL ON TABLE "public"."estado" TO "authenticated";
GRANT ALL ON TABLE "public"."estado" TO "service_role";



GRANT ALL ON SEQUENCE "public"."estado_EstadoID_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."estado_EstadoID_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."estado_EstadoID_seq" TO "service_role";



GRANT ALL ON TABLE "public"."factura" TO "anon";
GRANT ALL ON TABLE "public"."factura" TO "authenticated";
GRANT ALL ON TABLE "public"."factura" TO "service_role";



GRANT ALL ON SEQUENCE "public"."factura_FacturaID_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."factura_FacturaID_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."factura_FacturaID_seq" TO "service_role";



GRANT ALL ON TABLE "public"."logoperaciones" TO "anon";
GRANT ALL ON TABLE "public"."logoperaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."logoperaciones" TO "service_role";



GRANT ALL ON SEQUENCE "public"."logoperaciones_LogID_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."logoperaciones_LogID_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."logoperaciones_LogID_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pedido" TO "anon";
GRANT ALL ON TABLE "public"."pedido" TO "authenticated";
GRANT ALL ON TABLE "public"."pedido" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pedido_PedidoID_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pedido_PedidoID_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pedido_PedidoID_seq" TO "service_role";



GRANT ALL ON TABLE "public"."precios" TO "anon";
GRANT ALL ON TABLE "public"."precios" TO "authenticated";
GRANT ALL ON TABLE "public"."precios" TO "service_role";



GRANT ALL ON TABLE "public"."producto" TO "anon";
GRANT ALL ON TABLE "public"."producto" TO "authenticated";
GRANT ALL ON TABLE "public"."producto" TO "service_role";



GRANT ALL ON SEQUENCE "public"."producto_ProductoID_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."producto_ProductoID_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."producto_ProductoID_seq" TO "service_role";



GRANT ALL ON TABLE "public"."tercero" TO "anon";
GRANT ALL ON TABLE "public"."tercero" TO "authenticated";
GRANT ALL ON TABLE "public"."tercero" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tercero_TerceroID_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tercero_TerceroID_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tercero_TerceroID_seq" TO "service_role";



GRANT ALL ON TABLE "public"."usuario" TO "anon";
GRANT ALL ON TABLE "public"."usuario" TO "authenticated";
GRANT ALL ON TABLE "public"."usuario" TO "service_role";



GRANT ALL ON SEQUENCE "public"."usuario_UsuarioID_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."usuario_UsuarioID_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."usuario_UsuarioID_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































drop extension if exists "pg_net";


  create policy "Authenticated Update"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'productos'::text));



  create policy "Authenticated Upload"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'productos'::text));



  create policy "Avatar Auth Delete"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'avatars'::text));



  create policy "Avatar Auth Update"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'avatars'::text));



  create policy "Avatar Auth Upload"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'avatars'::text));



  create policy "Avatar Public Access"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



  create policy "Public Access"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'productos'::text));




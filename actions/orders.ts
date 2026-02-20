"use server";

// ============================================================================
// IMPORTACIONES
// ============================================================================
import { createAdminClient } from "@/utils/supabase/admin"; // Cliente con permisos totales (Ignora RLS)
import { createClient } from "@/utils/supabase/server"; // Cliente con contexto de sesión actual (Respeta RLS)
import { revalidatePath } from "next/cache";

// =========================================================
// 1. TIPOS E INTERFACES (Optimizados y Tipados)
// =========================================================
interface CartItem {
  ProductoID: number;
  cantidad: number;
  observaciones: string;
}

interface DatosCliente {
  nombres: string;
  apellidos: string;
  telefono: string;
  direccion: string;
  email?: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
}

interface CrearPedidoParams {
  cliente: DatosCliente;
  items: CartItem[];
  metodoPago: string;
  requiereFactura: boolean;
  turnstileToken: string; // SEGURIDAD: Token obligatorio generado por Cloudflare en el frontend
}

// Interface para tipar de forma segura los detalles de pago sin usar 'any'
interface DetallesPago {
  metodo: string;
  [key: string]: unknown;
}

// =========================================================
// 2. FUNCIÓN CREAR PEDIDO (CON PROTECCIÓN ANTI-BOTS)
// =========================================================
/**
 * Crea un pedido en la base de datos.
 * * REGLA DE NEGOCIO: Esta función es consumida públicamente por clientes no autenticados.
 * * SEGURIDAD: Implementa Cloudflare Turnstile para evitar ataques de spam/DDoS y 
 * recalcula los precios consultando la DB para evitar manipulaciones desde el navegador.
 * * ARQUITECTURA: Usa supabaseAdmin para poder escribir en tablas protegidas (tercero, cliente),
 * pero asocia el UsuarioID si la petición fue hecha por alguien del staff autenticado.
 */
export async function crearPedido({ cliente, items, metodoPago, requiereFactura, turnstileToken }: CrearPedidoParams) {
  
  // --------------------------------------------------------
  // 🛡️ SEGURIDAD FASE 1: VALIDACIÓN ANTI-BOTS (Cloudflare Turnstile)
  // --------------------------------------------------------
  // Validamos la presencia del token antes de hacer cualquier consulta a la base de datos.
  if (!turnstileToken) {
    return { success: false, message: "Validación de seguridad requerida. Por favor, recarga la página." };
  }

  try {
    const formData = new URLSearchParams();
    // Clave secreta configurada en .env.local
    formData.append('secret', process.env.TURNSTILE_SECRET_KEY || '');
    formData.append('response', turnstileToken);

    // Verificamos la autenticidad del token con los servidores de Cloudflare
    const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData
    });
    
    const turnstileData = await turnstileRes.json();

    // Si Cloudflare determina que es un bot, bloqueamos la ejecución.
    if (!turnstileData.success) {
      console.warn("🛡️ Intento de bot bloqueado al crear pedido.");
      return { success: false, message: "No pudimos verificar tu conexión segura. Intenta de nuevo." };
    }
  } catch (error) {
    console.error("❌ Error conectando con Cloudflare Turnstile:", error);
    return { success: false, message: "Error en el servicio de validación de seguridad." };
  }

  // --------------------------------------------------------
  // 🛡️ SEGURIDAD FASE 2: VALIDACIÓN DE INTEGRIDAD DE DATOS
  // --------------------------------------------------------
  if (!items || items.length === 0) {
    return { success: false, message: "El carrito no puede estar vacío." };
  }
  if (!cliente || !cliente.telefono) {
    return { success: false, message: "El teléfono del cliente es obligatorio." };
  }

  // Inicializamos clientes de base de datos
  const supabaseAdmin = createAdminClient();
  const supabaseAuth = await createClient();

  try {
    // --------------------------------------------------------
    // PASO PREVIO: DETECTAR USUARIO PARA AUDITORÍA
    // --------------------------------------------------------
    // Revisamos si la petición la hace un empleado logueado o un cliente público.
    let usuarioIDLogueado: number | null = null;
    const { data: { user } } = await supabaseAuth.auth.getUser();
    
    if (user) {
        const { data: uDB } = await supabaseAdmin
            .from('usuario')
            .select('UsuarioID')
            .eq('auth_user_id', user.id)
            .single();
        if (uDB) usuarioIDLogueado = uDB.UsuarioID;
    }

    // --------------------------------------------------------
    // A. GESTIÓN DE TERCERO (Upsert Lógico)
    // --------------------------------------------------------
    // Buscamos si el tercero ya existe por su teléfono (sanitizando espacios)
    const { data: terceroExistente } = await supabaseAdmin
      .from('tercero')
      .select('TerceroID')
      .eq('Telefono', cliente.telefono.trim())
      .maybeSingle();

    let terceroID: number;

    // Normalizamos los datos de entrada
    const datosTercero = {
      Nombres: cliente.nombres.trim(),
      Apellidos: cliente.apellidos.trim(),
      Direccion: cliente.direccion.trim(),
      Email: cliente.email?.trim() || null,
      Telefono: cliente.telefono.trim(),
      TipoDocumento: cliente.tipoDocumento || null,
      NumeroDocumento: cliente.numeroDocumento?.trim() || null,
      Activo: true
    };

    if (terceroExistente) {
      // Si existe, actualizamos su información con la más reciente
      terceroID = terceroExistente.TerceroID;
      await supabaseAdmin.from('tercero').update(datosTercero).eq('TerceroID', terceroID);
    } else {
      // Si no existe, lo creamos y recuperamos su ID
      const { data: nuevoTercero, error: errorInsert } = await supabaseAdmin
        .from('tercero')
        .insert(datosTercero)
        .select('TerceroID')
        .single();
      
      if (errorInsert) throw new Error(`Error creando tercero: ${errorInsert.message}`);
      terceroID = nuevoTercero.TerceroID;
    }

    // --------------------------------------------------------
    // B. GESTIÓN DE CLIENTE (Rol en el sistema)
    // --------------------------------------------------------
    const { data: clienteExistente } = await supabaseAdmin
      .from('cliente')
      .select('ClienteID')
      .eq('TerceroID', terceroID)
      .maybeSingle();

    let clienteID: number;

    if (clienteExistente) {
      clienteID = clienteExistente.ClienteID;
    } else {
      const { data: nuevoCliente, error: errorCliente } = await supabaseAdmin
        .from('cliente')
        .insert({ TerceroID: terceroID, Activo: true })
        .select('ClienteID')
        .single();
        
      if (errorCliente) throw new Error(`Error creando cliente: ${errorCliente.message}`);
      clienteID = nuevoCliente.ClienteID;
    }

    // --------------------------------------------------------
    // C. SEGURIDAD DE PRECIOS (Autoridad del Backend)
    // --------------------------------------------------------
    // NUNCA confiamos en el precio que envía el Frontend.
    // Consultamos los precios actuales de los productos directamente en la DB.
    const ids = items.map(i => i.ProductoID);
    const { data: productosDB } = await supabaseAdmin
      .from('producto')
      .select('ProductoID, precios ( Precio, FechaActivacion )')
      .in('ProductoID', ids);

    if (!productosDB) throw new Error("Error verificando catálogo de productos");

    let totalReal = 0;

    // Procesamos el carrito real con los precios de la base de datos
    const itemsProcesados = items.map(itemFront => {
      const prodDB = productosDB.find(p => p.ProductoID === itemFront.ProductoID);
      if (!prodDB) throw new Error(`Producto ID ${itemFront.ProductoID} no disponible`);

      // Obtenemos el precio activo más reciente. (Se asume FechaActivacion como string/Date)
      const precios = prodDB.precios?.sort((a: { FechaActivacion: string | Date }, b: { FechaActivacion: string | Date }) => 
        new Date(b.FechaActivacion).getTime() - new Date(a.FechaActivacion).getTime()
      );
      
      const precioReal = precios?.[0]?.Precio || 0;
      totalReal += (precioReal * itemFront.cantidad);

      return {
        ProductoID: itemFront.ProductoID,
        Cantidad: itemFront.cantidad,
        Precio: precioReal,
        Observaciones: itemFront.observaciones?.trim() || ''
      };
    });

    // --------------------------------------------------------
    // D. INSERTAR PEDIDO (Cabecera)
    // --------------------------------------------------------
    const { data: nuevoPedido, error: errorPedido } = await supabaseAdmin
      .from('pedido')
      .insert({
        ClienteID: clienteID,
        UsuarioID: usuarioIDLogueado, // Nulo si es cliente público, o el ID si es empleado
        Fecha: new Date().toISOString(),
        Total: totalReal,
        EstadoID: 1, // Estado inicial por defecto (ej. 'Recibido' o 'Pendiente')
        MetodoPago: metodoPago,
        FacturaElectronica: requiereFactura
      })
      .select('PedidoID')
      .single();

    if (errorPedido) throw new Error(`Error creando cabecera de pedido: ${errorPedido.message}`);

    // --------------------------------------------------------
    // E. INSERTAR DETALLES (Simulación de Transacción)
    // --------------------------------------------------------
    const detallesParaInsertar = itemsProcesados.map(item => ({
      PedidoID: nuevoPedido.PedidoID,
      ProductoID: item.ProductoID,
      Cantidad: item.Cantidad,
      PrecioUnit: item.Precio,
      Observaciones: item.Observaciones
    }));

    const { error: errorDetalles } = await supabaseAdmin
      .from('detallepedido')
      .insert(detallesParaInsertar);

    // ROLLBACK MANUAL: Si fallan los detalles, borramos la cabecera para mantener integridad
    if (errorDetalles) {
      await supabaseAdmin.from('pedido').delete().eq('PedidoID', nuevoPedido.PedidoID);
      throw new Error(`Error guardando líneas de detalle: ${errorDetalles.message}`);
    }

    // RENDIMIENTO: Invalidamos caché para que el panel de administración vea el nuevo pedido
    revalidatePath('/admin/pedidos');
    revalidatePath('/admin/dashboard');

    return { success: true, orderId: nuevoPedido.PedidoID };

  } catch (error: unknown) {
    // TIPADO: Se reemplazó 'any' por 'unknown' para mayor seguridad.
    const errorMessage = error instanceof Error ? error.message : "Error desconocido procesando la orden";
    console.error("❌ Error FATAL en crearPedido:", errorMessage);
    return { success: false, message: errorMessage };
  }
}

// =========================================================
// 3. FUNCIÓN CAMBIAR ESTADO (Flujo Kanban)
// =========================================================
/**
 * Actualiza el estado de un pedido (ej. De "Preparación" a "Entregado").
 * * SEGURIDAD RLS: Utiliza el cliente Auth (supabaseAuth) para realizar el update,
 * garantizando que las Row Level Security policies aplicadas al staff se respeten.
 * Solo personal autorizado podrá mover tarjetas en el Kanban.
 */
export async function cambiarEstadoPedido(pedidoID: number, nuevoEstadoID: number, detallesPago?: DetallesPago) {
  const supabaseAdmin = createAdminClient(); 
  const supabaseAuth = await createClient(); 

  try {
    // TIPADO SEGURO: Usamos Record<string, string | number> en lugar de 'any'
    const updateData: Record<string, string | number> = { EstadoID: nuevoEstadoID };

    // Si el estado implica un pago, registramos el método y quién registró el pago
    if (detallesPago && detallesPago.metodo) {
       updateData.MetodoPago = detallesPago.metodo;

       const { data: { user } } = await supabaseAuth.auth.getUser();
       if (user) {
           const { data: usuarioDB } = await supabaseAdmin
               .from('usuario')
               .select('UsuarioID')
               .eq('auth_user_id', user.id)
               .single();

           if (usuarioDB) updateData.UsuarioID = usuarioDB.UsuarioID;
       }
    }

    // Ejecutamos la actualización bajo el contexto del usuario autenticado (Respeta políticas RLS)
    const { error } = await supabaseAuth
        .from('pedido')
        .update(updateData)
        .eq('PedidoID', pedidoID);
    
    if (error) throw new Error(error.message);
    
    // Refrescamos la interfaz del administrador
    revalidatePath('/admin/pedidos');
    revalidatePath('/admin/dashboard');
    
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error al cambiar estado";
    console.error("❌ Error cambiarEstadoPedido:", errorMessage);
    return { success: false, message: errorMessage };
  }
}
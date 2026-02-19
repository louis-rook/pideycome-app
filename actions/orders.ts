"use server";

// ============================================================================
// IMPORTACIONES
// ============================================================================
import { createAdminClient } from "@/utils/supabase/admin"; // Cliente con permisos totales
import { createClient } from "@/utils/supabase/server"; // Cliente para identificar al usuario actual
import { revalidatePath } from "next/cache";

// =========================================================
// 1. TIPOS E INTERFACES
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
}

// =========================================================
// 2. FUNCIÓN CREAR PEDIDO (Optimizada para Logs)
// =========================================================
/**
 * Crea un pedido completo asegurando integridad de datos.
 * Mantiene el uso de ADMIN para evitar bloqueos RLS, pero inyecta el UsuarioID si existe.
 */
export async function crearPedido({ cliente, items, metodoPago, requiereFactura }: CrearPedidoParams) {
  const supabaseAdmin = createAdminClient();
  const supabaseAuth = await createClient(); // Necesario para saber si hay alguien logueado

  try {
    // --------------------------------------------------------
    // PASO PREVIO: DETECTAR USUARIO (Para el Log)
    // --------------------------------------------------------
    let usuarioIDLogueado = null;
    
    // Verificamos sesión
    const { data: { user } } = await supabaseAuth.auth.getUser();
    
    if (user) {
        // Buscamos su ID numérico usando Admin (rápido y seguro)
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
    const { data: terceroExistente } = await supabaseAdmin
      .from('tercero')
      .select('TerceroID')
      .eq('Telefono', cliente.telefono)
      .maybeSingle();

    let terceroID;

    const datosTercero = {
      Nombres: cliente.nombres,
      Apellidos: cliente.apellidos,
      Direccion: cliente.direccion,
      Email: cliente.email || null,
      Telefono: cliente.telefono,
      TipoDocumento: cliente.tipoDocumento || null,
      NumeroDocumento: cliente.numeroDocumento || null,
      Activo: true
    };

    if (terceroExistente) {
      terceroID = terceroExistente.TerceroID;
      await supabaseAdmin.from('tercero').update(datosTercero).eq('TerceroID', terceroID);
    } else {
      const { data: nuevoTercero, error: errorInsert } = await supabaseAdmin
        .from('tercero')
        .insert(datosTercero)
        .select('TerceroID')
        .single();
      
      if (errorInsert) throw new Error(`Error creando tercero: ${errorInsert.message}`);
      terceroID = nuevoTercero.TerceroID;
    }

    // --------------------------------------------------------
    // B. GESTIÓN DE CLIENTE (Rol)
    // --------------------------------------------------------
    const { data: clienteExistente } = await supabaseAdmin
      .from('cliente')
      .select('ClienteID')
      .eq('TerceroID', terceroID)
      .maybeSingle();

    let clienteID;

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
    // C. SEGURIDAD DE PRECIOS (Backend vs Frontend)
    // --------------------------------------------------------
    const ids = items.map(i => i.ProductoID);
    const { data: productosDB } = await supabaseAdmin
      .from('producto')
      .select('ProductoID, precios ( Precio, FechaActivacion )')
      .in('ProductoID', ids);

    if (!productosDB) throw new Error("Error verificando productos");

    let totalReal = 0;

    const itemsProcesados = items.map(itemFront => {
      const prodDB = productosDB.find(p => p.ProductoID === itemFront.ProductoID);
      
      if (!prodDB) throw new Error(`Producto ID ${itemFront.ProductoID} no disponible`);

      const precios = prodDB.precios?.sort((a: any, b: any) => 
        new Date(b.FechaActivacion).getTime() - new Date(a.FechaActivacion).getTime()
      );
      const precioReal = precios?.[0]?.Precio || 0;

      totalReal += (precioReal * itemFront.cantidad);

      return {
        ProductoID: itemFront.ProductoID,
        Cantidad: itemFront.cantidad,
        Precio: precioReal,
        Observaciones: itemFront.observaciones
      };
    });

    // --------------------------------------------------------
    // D. INSERTAR PEDIDO (Cabecera) - MODIFICADO
    // --------------------------------------------------------
    // Seguimos usando 'supabaseAdmin' para garantizar que se crea, 
    // pero inyectamos 'UsuarioID: usuarioIDLogueado' para el registro.
    const { data: nuevoPedido, error: errorPedido } = await supabaseAdmin
      .from('pedido')
      .insert({
        ClienteID: clienteID,
        UsuarioID: usuarioIDLogueado, // <--- AQUÍ GUARDAMOS QUIÉN LO CREÓ (Si aplica)
        Fecha: new Date().toISOString(),
        Total: totalReal,
        EstadoID: 1, 
        MetodoPago: metodoPago,
        FacturaElectronica: requiereFactura
      })
      .select('PedidoID')
      .single();

    if (errorPedido) throw new Error(`Error creando pedido: ${errorPedido.message}`);

    // --------------------------------------------------------
    // E. INSERTAR DETALLES (Productos)
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

    if (errorDetalles) {
      await supabaseAdmin.from('pedido').delete().eq('PedidoID', nuevoPedido.PedidoID);
      throw new Error(`Error guardando detalles: ${errorDetalles.message}`);
    }

    revalidatePath('/admin/pedidos');
    revalidatePath('/admin/dashboard');

    return { success: true, orderId: nuevoPedido.PedidoID };

  } catch (error: any) {
    console.error("Error FATAL en crearPedido:", error);
    return { success: false, message: error.message || "Error desconocido" };
  }
}

// =========================================================
// 3. FUNCIÓN CAMBIAR ESTADO (Flujo Kanban) - MODIFICADO
// =========================================================
export async function cambiarEstadoPedido(pedidoID: number, nuevoEstadoID: number, detallesPago?: any) {
  const supabaseAdmin = createAdminClient(); 
  const supabaseAuth = await createClient(); // Cliente con Cookies (El que identifica al usuario)

  try {
    const updateData: any = { EstadoID: nuevoEstadoID };

    // Si hay pago, asignamos el UsuarioID explícitamente también
    if (detallesPago) {
       updateData.MetodoPago = detallesPago.metodo;

       const { data: { user } } = await supabaseAuth.auth.getUser();
       if (user) {
           // Buscamos ID numérico rápido
           const { data: usuarioDB } = await supabaseAdmin
               .from('usuario')
               .select('UsuarioID')
               .eq('auth_user_id', user.id)
               .single();

           if (usuarioDB) updateData.UsuarioID = usuarioDB.UsuarioID;
       }
    }

    // --- CAMBIO CLAVE AQUÍ ---
    // Usamos 'supabaseAuth' en lugar de Admin.
    // Como tienes políticas RLS para Staff ("Staff gestiona pedidos"), esto funcionará 
    // Y además enviará tu UUID a la base de datos para que el Trigger guarde el Log a tu nombre.
    const { error } = await supabaseAuth
        .from('pedido')
        .update(updateData)
        .eq('PedidoID', pedidoID);
    
    if (error) throw new Error(error.message);
    
    revalidatePath('/admin/pedidos');
    revalidatePath('/admin/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error("Error cambiarEstadoPedido:", error.message);
    return { success: false, message: error.message };
  }
}
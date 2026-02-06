"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server"; // <--- NUEVO: Para saber quién está logueado
import { revalidatePath } from "next/cache";

interface CartItem { ProductoID: number; cantidad: number; Precio: number; }
interface DatosCliente { 
  nombres: string; 
  apellidos: string; 
  telefono: string; 
  direccion: string; 
  email?: string; 
  tipoDocumento?: string; 
  numeroDocumento?: string; 
}
interface CrearPedidoParams { cliente: DatosCliente; items: CartItem[]; 
  total: number; metodoPago: string; requiereFactura: boolean; }

export async function crearPedido({ cliente, items, total, metodoPago, requiereFactura }: CrearPedidoParams) {
  const supabase = createAdminClient();
  try {
    const { data: terceroExistente } = await supabase.from('tercero').select('TerceroID').eq('Telefono', cliente.telefono).maybeSingle();
    let terceroID;
    const datosTercero = { Nombres: cliente.nombres, Apellidos: cliente.apellidos, Direccion: cliente.direccion, Email: cliente.email || null, Telefono: cliente.telefono, TipoDocumento: cliente.tipoDocumento || null, NumeroDocumento: cliente.numeroDocumento || null, Activo: true };

    if (terceroExistente) {
      terceroID = terceroExistente.TerceroID;
      await supabase.from('tercero').update(datosTercero).eq('TerceroID', terceroID);
    } else {
      const { data: nuevoTercero, error: errorTercero } = await supabase.from('tercero').insert(datosTercero).select('TerceroID').single();
      if (errorTercero) throw new Error("Error registrando tercero: " + errorTercero.message);
      terceroID = nuevoTercero.TerceroID;
    }

    const { data: clienteExistente } = await supabase.from('cliente').select('ClienteID').eq('TerceroID', terceroID).maybeSingle();
    let clienteID;
    if (clienteExistente) { clienteID = clienteExistente.ClienteID; } else {
      const { data: nuevoCliente, error: errorCliente } = await supabase.from('cliente').insert({ TerceroID: terceroID, Activo: true }).select('ClienteID').single();
      if (errorCliente) throw new Error("Error creando cliente: " + errorCliente.message);
      clienteID = nuevoCliente.ClienteID;
    }

    let estadoID = 1; 
    const { data: pedido, error: errorPedido } = await supabase.from('pedido').insert({ ClienteID: clienteID, EstadoID: estadoID, Total: total, MetodoPago: metodoPago, FacturaElectronica: requiereFactura, Fecha: new Date().toISOString() }).select('PedidoID').single();
    if (errorPedido) throw new Error("Error creando el pedido: " + errorPedido.message);

    const detalles = items.map(item => ({ PedidoID: pedido.PedidoID, ProductoID: item.ProductoID, Cantidad: item.cantidad, PrecioUnit: item.Precio }));
    const { error: errorDetalles } = await supabase.from('detallepedido').insert(detalles);
    if (errorDetalles) throw new Error("Error guardando detalles: " + errorDetalles.message);

    return { success: true, orderId: pedido.PedidoID };
  } catch (error: any) {
    console.error("Error FATAL en crearPedido:", error);
    return { success: false, message: error.message || "Error desconocido" };
  }
}

// --- AQUÍ ESTÁ EL CAMBIO ---
export async function cambiarEstadoPedido(pedidoID: number, nuevoEstadoID: number, detallesPago?: any) {
  const supabaseAdmin = createAdminClient(); 
  const supabaseAuth = await createClient(); // Necesario para obtener el usuario actual

  try {
    // Objeto con los datos a actualizar
    const updateData: any = { EstadoID: nuevoEstadoID };

    // Si viene detallesPago, significa que se está pagando (Paso a EN COLA)
    if (detallesPago) {
       updateData.MetodoPago = detallesPago.metodo;

       // 1. Buscamos quién es el usuario logueado (Cajero/Mesero)
       const { data: { user } } = await supabaseAuth.auth.getUser();
       
       if (user) {
           // 2. Buscamos su ID numérico en la tabla 'usuario'
           const { data: usuarioDB } = await supabaseAdmin
               .from('usuario')
               .select('UsuarioID')
               .eq('auth_user_id', user.id)
               .single();

           // 3. Si lo encontramos, lo agregamos al update para que quede registrado
           if (usuarioDB) {
               updateData.UsuarioID = usuarioDB.UsuarioID;
           }
       }
    }

    const { error } = await supabaseAdmin.from('pedido').update(updateData).eq('PedidoID', pedidoID);
    
    if (error) throw new Error(error.message);
    revalidatePath('/admin/pedidos');
    return { success: true };
  } catch (error: any) {
    console.error("Error cambiarEstadoPedido:", error.message);
    return { success: false, message: error.message };
  }
}
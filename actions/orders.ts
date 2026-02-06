"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server"; // Necesario para obtener el usuario actual en cambio de estado
import { revalidatePath } from "next/cache";

// =========================================================
// 1. TIPOS
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
// 2. FUNCIÓN CREAR PEDIDO (Con Seguridad y Observaciones)
// =========================================================
export async function crearPedido({ cliente, items, metodoPago, requiereFactura }: CrearPedidoParams) {
  const supabase = createAdminClient();

  try {
    // A. GESTIÓN DE TERCERO
    const { data: terceroExistente } = await supabase
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
      await supabase.from('tercero').update(datosTercero).eq('TerceroID', terceroID);
    } else {
      const { data: nuevoTercero, error: errorInsert } = await supabase
        .from('tercero')
        .insert(datosTercero)
        .select('TerceroID')
        .single();
      
      if (errorInsert) throw new Error(`Error creando tercero: ${errorInsert.message}`);
      terceroID = nuevoTercero.TerceroID;
    }

    // B. GESTIÓN DE CLIENTE (Rol)
    const { data: clienteExistente } = await supabase
      .from('cliente')
      .select('ClienteID')
      .eq('TerceroID', terceroID)
      .maybeSingle();

    let clienteID;

    if (clienteExistente) {
      clienteID = clienteExistente.ClienteID;
    } else {
      const { data: nuevoCliente, error: errorCliente } = await supabase
        .from('cliente')
        .insert({ TerceroID: terceroID, Activo: true })
        .select('ClienteID')
        .single();
        
      if (errorCliente) throw new Error(`Error creando cliente: ${errorCliente.message}`);
      clienteID = nuevoCliente.ClienteID;
    }

    // C. SEGURIDAD DE PRECIOS
    const ids = items.map(i => i.ProductoID);
    const { data: productosDB } = await supabase
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

    // D. INSERTAR PEDIDO
    const { data: nuevoPedido, error: errorPedido } = await supabase
      .from('pedido')
      .insert({
        ClienteID: clienteID,
        Fecha: new Date().toISOString(),
        Total: totalReal,
        EstadoID: 1, 
        MetodoPago: metodoPago,
        FacturaElectronica: requiereFactura
      })
      .select('PedidoID')
      .single();

    if (errorPedido) throw new Error(`Error creando pedido: ${errorPedido.message}`);

    // E. INSERTAR DETALLES
    const detallesParaInsertar = itemsProcesados.map(item => ({
      PedidoID: nuevoPedido.PedidoID,
      ProductoID: item.ProductoID,
      Cantidad: item.Cantidad,
      PrecioUnit: item.Precio,      // Usamos 'PrecioUnit'
      Observaciones: item.Observaciones // Usamos 'Observaciones'
    }));

    const { error: errorDetalles } = await supabase
      .from('detallepedido')
      .insert(detallesParaInsertar);

    if (errorDetalles) {
      await supabase.from('pedido').delete().eq('PedidoID', nuevoPedido.PedidoID);
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
// 3. FUNCIÓN CAMBIAR ESTADO (Restaurada)
// =========================================================
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

    const { error } = await supabaseAdmin
        .from('pedido')
        .update(updateData)
        .eq('PedidoID', pedidoID);
    
    if (error) throw new Error(error.message);
    
    revalidatePath('/admin/pedidos');
    revalidatePath('/admin/dashboard'); // Importante revalidar dashboard también
    return { success: true };
  } catch (error: any) {
    console.error("Error cambiarEstadoPedido:", error.message);
    return { success: false, message: error.message };
  }
}
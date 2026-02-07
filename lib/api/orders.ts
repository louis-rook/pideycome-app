"use server";

import { createAdminClient } from "@/utils/supabase/admin";

export async function getPedidosAdmin() {
  const supabase = createAdminClient();
  
  // AQUI AGREGAMOS "Observaciones" DENTRO DE detallepedido
  const { data, error } = await supabase.from('pedido').select(`
      PedidoID, Total, EstadoID, Fecha, MetodoPago, FacturaElectronica,
      estado ( NombreEstado ),
      cliente ( tercero ( Nombres, Apellidos, Telefono, NumeroDocumento, Direccion ) ),
      detallepedido ( 
        Cantidad, 
        Observaciones, 
        producto ( Nombre, precios ( Precio ) ) 
      )
    `).order('Fecha', { ascending: false });

  if (error) {
    console.error("Error al obtener pedidos:", error.message);
    return [];
  }
  return data;
}


// --- FUNCIÓN PARA IMPRIMIR ---
export async function getPedidoImpresion(pedidoId: number) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('pedido')
    .select(`
      PedidoID, Fecha, Total, MetodoPago,
      cliente (
        tercero ( Nombres, Apellidos, Direccion, Telefono )
      ),
      usuario ( Username ),
      detallepedido (
        Cantidad, 
        PrecioUnit,
        producto ( Nombre )
      )
    `)
    .eq('PedidoID', pedidoId)
    .single();

  if (error) {
    console.error("Error al obtener pedido para impresión:", error.message);
    return null;
  }
  return data;
}
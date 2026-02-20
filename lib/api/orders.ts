"use server";

// ============================================================================
// IMPORTACIONES
// ============================================================================
import { createAdminClient } from "@/utils/supabase/admin";

// ============================================================================
// FUNCIÓN: getPedidosAdmin
// ============================================================================
/**
 * Obtiene el listado completo de pedidos para el panel de administración.
 * * * ARQUITECTURA: Ubicado en 'lib/api' porque es una operación de solo lectura (GET).
 * * RENDIMIENTO: Utiliza "Nested Selects" de Supabase para traer la cabecera del pedido,
 * el estado, el cliente (con su tercero) y los detalles en una sola llamada a la base de datos,
 * evitando el problema de N+1 consultas.
 * * @returns {Promise<Array>} - Retorna un array de pedidos o un array vacío si hay error.
 */
export async function getPedidosAdmin() {
  // SEGURIDAD: Usamos el Admin Client porque el panel de administración necesita
  // ver todos los pedidos, independientemente de qué usuario los haya creado.
  const supabase = createAdminClient();
  
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
    console.error("❌ Error al obtener pedidos:", error.message);
    return [];
  }
  return data;
}

// ============================================================================
// FUNCIÓN: getPedidoImpresion
// ============================================================================
/**
 * Obtiene los datos detallados de un único pedido, optimizados para el formato
 * de impresión de tickets térmicos.
 * * * RENDIMIENTO: Filtra por `.eq('PedidoID', pedidoId)` y usa `.single()` para 
 * minimizar el peso del payload transferido.
 * * @param {number} pedidoId - El identificador único del pedido.
 * @returns {Promise<Object | null>} - Objeto con los datos del pedido o null si falla.
 */
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
    console.error(`❌ Error al obtener pedido ${pedidoId} para impresión:`, error.message);
    return null;
  }
  return data;
}
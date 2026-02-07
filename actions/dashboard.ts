"use server";

// ============================================================================
// IMPORTACIONES
// ============================================================================
import { createClient } from "@/utils/supabase/server";

// ============================================================================
// FUNCIÓN: OBTENER ESTADÍSTICAS DEL DASHBOARD
// ============================================================================
/**
 * Calcula los rangos de fechas y llama a la base de datos (RPC) para obtener KPIs.
 * @param filtro Tipo de filtro de tiempo (hoy, semana, mes, custom).
 * @param customRange Objeto con fecha inicio/fin si el filtro es 'custom'.
 * @param usuarioFiltroID Opcional: Para filtrar métricas por un usuario específico.
 */
export async function getDashboardStats(
  filtro: 'hoy' | 'semana' | 'mes' | 'custom', 
  customRange?: { from: Date, to: Date },
  usuarioFiltroID?: number | null
) {
  const supabase = await createClient();
  const hoy = new Date();
  
  // Variables para enviar a la Base de Datos
  let fInicio = "";
  let fFin = "";

  // --------------------------------------------------------------------------
  // 1. LÓGICA DE CÁLCULO DE FECHAS
  // --------------------------------------------------------------------------
  if (filtro === 'custom' && customRange) {
    // Rango manual seleccionado por el usuario en el calendario
    fInicio = customRange.from.toISOString().split('T')[0];
    fFin = customRange.to.toISOString().split('T')[0];

  } else if (filtro === 'hoy') {
    // ⚠️ PARCHE TEMPORAL DE ZONA HORARIA
    // Se extiende el rango un día atrás y uno adelante para evitar problemas
    // donde las facturas quedan fuera por diferencia horaria (UTC vs Local).
    
    // Día anterior
    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);
    fInicio = ayer.toISOString().split('T')[0];
    
    // Día siguiente
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);
    fFin = manana.toISOString().split('T')[0];

  } else if (filtro === 'semana') {
    // Últimos 7 días
    const semanaAtras = new Date(hoy);
    semanaAtras.setDate(hoy.getDate() - 7);
    fInicio = semanaAtras.toISOString().split('T')[0];
    fFin = hoy.toISOString().split('T')[0];

  } else { // Mes
    // Desde el primer día del mes actual hasta hoy
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    fInicio = primerDia.toISOString().split('T')[0];
    fFin = hoy.toISOString().split('T')[0];
  }

  // --------------------------------------------------------------------------
  // 2. LLAMADA A PROCEDIMIENTO ALMACENADO (RPC)
  // --------------------------------------------------------------------------
  // Llamamos a la función 'get_dashboard_kpis' en Postgres que hace los cálculos pesados
  const { data, error } = await supabase.rpc('get_dashboard_kpis', {
    fecha_inicio: fInicio,
    fecha_fin: fFin,
    usuario_filtro: usuarioFiltroID || null
  });

  // Manejo de errores
  if (error) {
    console.error("Error Dashboard:", error);
    return null;
  }
  
  // Retornamos los datos crudos de la base de datos
  return data;
}
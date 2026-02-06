"use server";
import { createClient } from "@/utils/supabase/server";

export async function getDashboardStats(
  filtro: 'hoy' | 'semana' | 'mes' | 'custom', 
  customRange?: { from: Date, to: Date },
  usuarioFiltroID?: number | null
) {
  const supabase = await createClient();
  const hoy = new Date();
  let fInicio = "";
  let fFin = "";

  // Lógica de Fechas
  if (filtro === 'custom' && customRange) {
    fInicio = customRange.from.toISOString().split('T')[0];
    fFin = customRange.to.toISOString().split('T')[0];
  } else if (filtro === 'hoy') {
    // ⚠️ Parche temporal: Vamos 1 día atrás para cubrir tu problema de zona horaria
    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);
    fInicio = ayer.toISOString().split('T')[0];
    
    // Y vamos 1 día adelante para cubrir el "futuro" de las facturas que tienes
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);
    fFin = manana.toISOString().split('T')[0];
  } else if (filtro === 'semana') {
    const semanaAtras = new Date(hoy);
    semanaAtras.setDate(hoy.getDate() - 7);
    fInicio = semanaAtras.toISOString().split('T')[0];
    fFin = hoy.toISOString().split('T')[0];
  } else { // Mes
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    fInicio = primerDia.toISOString().split('T')[0];
    fFin = hoy.toISOString().split('T')[0];
  }

  const { data, error } = await supabase.rpc('get_dashboard_kpis', {
    fecha_inicio: fInicio,
    fecha_fin: fFin,
    usuario_filtro: usuarioFiltroID || null
  });

  if (error) {
    console.error("Error Dashboard:", error);
    return null;
  }
  return data;
}
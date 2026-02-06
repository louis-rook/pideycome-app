"use server";

import { createClient } from "@/utils/supabase/server";

export async function getDashboardData(
  filtro: 'hoy' | 'semana' | 'mes' | 'custom', 
  customRange?: { from: Date, to: Date },
  usuarioFiltroID?: number | null
) {
  try {
    const supabase = await createClient();

    // 1. OBTENER FECHA BASE EN COLOMBIA (LIMPIA, SIN HORAS)
    // Usamos 'en-CA' porque devuelve formato YYYY-MM-DD automáticamente
    const fechaColombiaStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
    // Creamos un objeto Date basado en esa fecha a las 00:00:00 hora local
    const fechaBase = new Date(`${fechaColombiaStr}T00:00:00`); 
    
    let fInicio = "";
    let fFin = "";

    // --- LÓGICA DE FECHAS (CALENDARIO BOGOTÁ) ---

    if (filtro === 'custom' && customRange) {
      fInicio = customRange.from.toISOString().split('T')[0];
      fFin = customRange.to.toISOString().split('T')[0];
    } 
    else if (filtro === 'hoy') {
      // Hoy en Colombia es simplemente la fechaBase
      fInicio = fechaColombiaStr;
      fFin = fechaColombiaStr;
    } 
    else if (filtro === 'semana') {
      // LÓGICA DE SEMANA ISO (Lunes a Domingo)
      // getDay(): 0 = Domingo, 1 = Lunes ... 6 = Sábado
      const diaSemana = fechaBase.getDay();
      
      // Si es Domingo (0), el lunes fue hace 6 días.
      // Si es Lunes (1), el lunes fue hace 0 días.
      // Si es Jueves (4), el lunes fue hace 3 días.
      const diasParaRestar = diaSemana === 0 ? 6 : diaSemana - 1;
      
      // Calculamos el Lunes
      const lunes = new Date(fechaBase);
      lunes.setDate(fechaBase.getDate() - diasParaRestar);
      
      // Calculamos el Domingo (Lunes + 6 días)
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);

      // FORMATEAMOS MANUALMENTE (Para evitar el error de UTC)
      // .toISOString() nos robaría horas, así que usamos la función local
      const yearI = lunes.getFullYear();
      const monthI = String(lunes.getMonth() + 1).padStart(2, '0');
      const dayI = String(lunes.getDate()).padStart(2, '0');
      fInicio = `${yearI}-${monthI}-${dayI}`;

      const yearF = domingo.getFullYear();
      const monthF = String(domingo.getMonth() + 1).padStart(2, '0');
      const dayF = String(domingo.getDate()).padStart(2, '0');
      fFin = `${yearF}-${monthF}-${dayF}`;
    } 
    else { // Mes
      // Primer día del mes actual
      const year = fechaBase.getFullYear();
      const month = fechaBase.getMonth(); // 0-based
      
      // Primer día: 1
      const primerDia = new Date(year, month, 1);
      
      // Último día: día 0 del mes siguiente
      const ultimoDia = new Date(year, month + 1, 0); 

      // Formateo manual seguro
      const mStr = String(month + 1).padStart(2, '0');
      
      fInicio = `${year}-${mStr}-01`;
      fFin = `${year}-${mStr}-${String(ultimoDia.getDate()).padStart(2, '0')}`;
    }

    // Aseguramos cubrir hasta el último segundo del día final
    const finDelDia = `${fFin}T23:59:59`;

    // CHISME DEPURACIÓN (Mira esto en la terminal)
    console.log(`📅 Filtro: ${filtro} | Rango: ${fInicio} 00:00 -> ${finDelDia}`);

    // --- 2. KPIS ---
    const { data: kpis, error: kpiError } = await supabase.rpc('get_dashboard_kpis', {
      fecha_inicio: fInicio,
      fecha_fin: fFin,
      usuario_filtro: usuarioFiltroID || null
    });

    if (kpiError) console.error("❌ Error KPI:", kpiError.message);

    // --- 3. PEDIDOS DETALLADOS ---
    const { data: pedidosFiltrados, error: pedidosError } = await supabase
      .from('pedido')
      .select(`
        PedidoID, 
        Fecha, 
        Total, 
        EstadoID,
        MetodoPago,
        cliente:ClienteID ( 
            tercero:TerceroID ( Nombres, Apellidos ) 
        ),
        usuario:UsuarioID ( Username ),
        detallepedido (
            DetalleID,
            Cantidad,
            Observaciones,
            PrecioUnit,
            producto:ProductoID ( Nombre )
        )
      `)
      .gte('Fecha', fInicio)
      .lte('Fecha', finDelDia)
      .order('Fecha', { ascending: false })
      .limit(1000);

    if (pedidosError) {
        console.error("❌ ERROR QUERY PEDIDOS:", pedidosError.message);
    }

    return {
      ...kpis,
      ultimos_pedidos: pedidosFiltrados || []
    };

  } catch (error) {
    console.error("❌ Error FATAL en API:", error);
    return null;
  }
}
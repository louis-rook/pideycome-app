"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function realizarArqueo(formData: FormData) {
    const supabase = createAdminClient();
    const supabaseAuth = await createClient(); // Para saber quién es el auditor

    try {
        console.log("🚀 Iniciando proceso de Arqueo...");

        // A. Identificar al Auditor (Quien está logueado)
        const { data: { user } } = await supabaseAuth.auth.getUser();
        if (!user) throw new Error("No hay sesión activa");

        const { data: usuarioAuditor } = await supabase
            .from('usuario')
            .select('UsuarioID')
            .eq('auth_user_id', user.id)
            .single();

        if (!usuarioAuditor) throw new Error("Usuario auditor no encontrado");

        // B. Datos del Formulario
        const responsableId = formData.get('responsableId');
        const efectivoFisico = Number(formData.get('efectivo') || 0);
        const datafonoFisico = Number(formData.get('datafono') || 0);
        const transferenciaFisico = Number(formData.get('transferencia') || 0);
        const observaciones = formData.get('observaciones') as string;

        const totalFisico = efectivoFisico + datafonoFisico + transferenciaFisico;

        // --- C. CALCULAR TOTAL DEL SISTEMA (CORREGIDO) ---
        
        // 1. Obtener fecha actual forzando zona horaria COLOMBIA
        const fechaColombiaStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
        
        // 2. Definir rango del día completo (00:00:00 a 23:59:59)
        const inicioDia = `${fechaColombiaStr}T00:00:00`;
        const finDia = `${fechaColombiaStr}T23:59:59`;

        console.log(`📅 Buscando pedidos del sistema para: ${fechaColombiaStr} (Usuario ID: ${responsableId})`);

        // 3. Consultar Pedidos
        const { data: pedidos, error: errorPedidos } = await supabase
            .from('pedido')
            .select('Total, MetodoPago, EstadoID')
            .eq('UsuarioID', responsableId)
            .gte('Fecha', inicioDia)
            .lte('Fecha', finDia)
            .neq('EstadoID', 6); // IMPORTANTE: Ignorar pedidos Cancelados (ID 6)

        if (errorPedidos) throw new Error("Error consultando pedidos: " + errorPedidos.message);

        // 4. Sumar Totales
        let sistemaEfectivo = 0;
        let sistemaDatafono = 0;
        let sistemaTransferencia = 0;

        const conteo = pedidos ? pedidos.length : 0;
        console.log(`📦 Pedidos encontrados en sistema: ${conteo}`);

        pedidos?.forEach((p: any) => {
            const total = Number(p.Total) || 0;
            // Normalizar el texto para evitar errores de mayúsculas/minúsculas
            const metodo = (p.MetodoPago || '').toLowerCase().trim();

            if (metodo === 'efectivo') {
                sistemaEfectivo += total;
            } else if (metodo === 'datafono' || metodo === 'tarjeta') {
                sistemaDatafono += total;
            } else {
                // Asumimos transferencia o cualquier otro como transferencia
                sistemaTransferencia += total;
            }
        });

        const totalSistema = sistemaEfectivo + sistemaDatafono + sistemaTransferencia;
        console.log(`💰 Total Sistema Calculado: ${totalSistema}`);

        // D. INSERTAR EN LA TABLA ARQUEO
        const detallePagos = {
            fisico: { efectivo: efectivoFisico, datafono: datafonoFisico, transferencia: transferenciaFisico },
            sistema: { efectivo: sistemaEfectivo, datafono: sistemaDatafono, transferencia: sistemaTransferencia }
        };

        const diferencia = totalFisico - totalSistema;
        
        // Determinar Estado
        let estado = 'CUADRADO';
        if (diferencia > 0) estado = 'SOBRANTE';
        if (diferencia < 0) estado = 'FALTANTE';

        const { error } = await supabase.from('arqueo_caja').insert({
            UsuarioAuditorID: usuarioAuditor.UsuarioID,
            UsuarioResponsableID: responsableId,
            TotalSistema: totalSistema,
            TotalFisico: totalFisico,
            Observaciones: observaciones,
            Estado: estado,
            DetallePagos: detallePagos
        });

        if (error) throw new Error(error.message);

        revalidatePath('/admin');
        
        return { 
            success: true, 
            data: {
                totalSistema,
                totalFisico,
                diferencia,
                estado
            }
        };

    } catch (error: any) {
        console.error("❌ Error realizando arqueo:", error);
        return { success: false, error: error.message };
    }
}
"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// REALIZAR EL ARQUEO (Lógica Ciega)
export async function realizarArqueo(formData: FormData) {
    const supabase = createAdminClient();
    const supabaseAuth = await createClient(); // Para saber quién es el auditor (Líder)

    try {
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

        // C. CALCULAR LO QUE DICE EL SISTEMA (Ventas del día de ese empleado)
        const hoy = new Date().toISOString().split('T')[0];
        
        // Traemos las facturas generadas por pedidos de este usuario HOY
        const { data: facturas } = await supabase
            .from('factura')
            .select('Total, MetodoPago, pedido!inner(UsuarioID)')
            .eq('pedido.UsuarioID', responsableId)
            .gte('FechaEmision', `${hoy} 00:00:00`)
            .lte('FechaEmision', `${hoy} 23:59:59`);

        let sistemaEfectivo = 0;
        let sistemaDatafono = 0;
        let sistemaTransferencia = 0;

        facturas?.forEach((f: any) => {
            const total = Number(f.Total);
            if (f.MetodoPago === 'Efectivo') sistemaEfectivo += total;
            else if (f.MetodoPago === 'Datafono') sistemaDatafono += total;
            else sistemaTransferencia += total;
        });

        const totalSistema = sistemaEfectivo + sistemaDatafono + sistemaTransferencia;
        
        // D. INSERTAR EN LA TABLA ARQUEO
        const detallePagos = {
            fisico: { efectivo: efectivoFisico, datafono: datafonoFisico, transferencia: transferenciaFisico },
            sistema: { efectivo: sistemaEfectivo, datafono: sistemaDatafono, transferencia: sistemaTransferencia }
        };

        const diferencia = totalFisico - totalSistema;
        const estado = diferencia === 0 ? 'CUADRADO' : (diferencia > 0 ? 'SOBRANTE' : 'FALTANTE');

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
        return { success: false, message: error.message };
    }
}
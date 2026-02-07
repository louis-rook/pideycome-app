"use server";

// ============================================================================
// IMPORTACIONES
// ============================================================================
import { createAdminClient } from "@/utils/supabase/admin"; // Cliente con permisos de administrador (superusuario)
import { createClient } from "@/utils/supabase/server"; // Cliente estándar para autenticación
import { revalidatePath } from "next/cache"; // Para actualizar la caché de Next.js tras cambios

// ============================================================================
// SERVER ACTION: REALIZAR ARQUEO DE CAJA
// ============================================================================
/**
 * Esta función procesa el cierre de caja (arqueo).
 * Compara lo que el usuario reporta físicamente (dinero en mano)
 * contra lo que el sistema registró en ventas durante el día.
 * * @param formData Datos enviados desde el formulario (efectivo, datafono, responsable, etc.)
 */
export async function realizarArqueo(formData: FormData) {
    // Inicializamos clientes de Supabase
    const supabase = createAdminClient();
    const supabaseAuth = await createClient(); // Usado para identificar al usuario logueado (Auditor)

    try {
        console.log("🚀 Iniciando proceso de Arqueo...");

        // --------------------------------------------------------------------------
        // A. IDENTIFICACIÓN DEL AUDITOR
        // --------------------------------------------------------------------------
        // 1. Obtenemos la sesión del usuario actual (quien está haciendo el arqueo)
        const { data: { user } } = await supabaseAuth.auth.getUser();
        if (!user) throw new Error("No hay sesión activa");

        // 2. Buscamos su ID numérico en nuestra tabla personalizada 'usuario'
        const { data: usuarioAuditor } = await supabase
            .from('usuario')
            .select('UsuarioID')
            .eq('auth_user_id', user.id)
            .single();

        if (!usuarioAuditor) throw new Error("Usuario auditor no encontrado");

        // --------------------------------------------------------------------------
        // B. EXTRACCIÓN DE DATOS DEL FORMULARIO
        // --------------------------------------------------------------------------
        // Obtenemos los valores ingresados por el usuario en el modal
        const responsableId = formData.get('responsableId'); // A quién se le hace el arqueo
        const efectivoFisico = Number(formData.get('efectivo') || 0); // Dinero contado
        const datafonoFisico = Number(formData.get('datafono') || 0); // Vouchers contados
        const transferenciaFisico = Number(formData.get('transferencia') || 0); // Transferencias verificadas
        const observaciones = formData.get('observaciones') as string;

        // Suma total de lo que hay físicamente
        const totalFisico = efectivoFisico + datafonoFisico + transferenciaFisico;

        // --------------------------------------------------------------------------
        // C. CÁLCULO DEL TOTAL DEL SISTEMA (LO QUE DEBERÍA HABER)
        // --------------------------------------------------------------------------
        
        // 1. Definimos el rango de tiempo: TODO EL DÍA ACTUAL (Zona Horaria Colombia)
        const fechaColombiaStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
        const inicioDia = `${fechaColombiaStr}T00:00:00`;
        const finDia = `${fechaColombiaStr}T23:59:59`;

        console.log(`📅 Buscando pedidos del sistema para: ${fechaColombiaStr} (Usuario ID: ${responsableId})`);

        // 2. Consultamos los pedidos en la base de datos
        // Filtros:
        // - UsuarioID: Solo ventas del cajero responsable
        // - Fecha: Solo hoy
        // - EstadoID != 6: Ignoramos pedidos CANCELADOS
        const { data: pedidos, error: errorPedidos } = await supabase
            .from('pedido')
            .select('Total, MetodoPago, EstadoID')
            .eq('UsuarioID', responsableId)
            .gte('Fecha', inicioDia)
            .lte('Fecha', finDia)
            .neq('EstadoID', 6); 

        if (errorPedidos) throw new Error("Error consultando pedidos: " + errorPedidos.message);

        // 3. Clasificamos y sumamos los totales según el método de pago registrado
        let sistemaEfectivo = 0;
        let sistemaDatafono = 0;
        let sistemaTransferencia = 0;

        const conteo = pedidos ? pedidos.length : 0;
        console.log(`📦 Pedidos encontrados en sistema: ${conteo}`);

        pedidos?.forEach((p: any) => {
            const total = Number(p.Total) || 0;
            // Normalizamos texto a minúsculas y sin espacios para comparar seguro
            const metodo = (p.MetodoPago || '').toLowerCase().trim();

            if (metodo === 'efectivo') {
                sistemaEfectivo += total;
            } else if (metodo === 'datafono' || metodo === 'tarjeta') {
                sistemaDatafono += total;
            } else {
                // Cualquier otro método (Nequi, Daviplata, Transferencia) cae aquí
                sistemaTransferencia += total;
            }
        });

        // Total general calculado por el sistema
        const totalSistema = sistemaEfectivo + sistemaDatafono + sistemaTransferencia;
        console.log(`💰 Total Sistema Calculado: ${totalSistema}`);

        // --------------------------------------------------------------------------
        // D. REGISTRO DEL ARQUEO EN LA BASE DE DATOS
        // --------------------------------------------------------------------------
        
        // Preparamos un objeto JSON con el desglose para guardarlo
        const detallePagos = {
            fisico: { efectivo: efectivoFisico, datafono: datafonoFisico, transferencia: transferenciaFisico },
            sistema: { efectivo: sistemaEfectivo, datafono: sistemaDatafono, transferencia: sistemaTransferencia }
        };

        // Calculamos si sobra o falta dinero
        const diferencia = totalFisico - totalSistema;
        
        // Determinamos el estado del cierre
        let estado = 'CUADRADO'; // Perfecto
        if (diferencia > 0) estado = 'SOBRANTE'; // Hay más dinero del esperado
        if (diferencia < 0) estado = 'FALTANTE'; // Falta dinero

        // Insertamos el registro en la tabla 'arqueo_caja'
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

        // Actualizamos la caché de la página de administración para mostrar el nuevo arqueo
        revalidatePath('/admin');
        
        // Retornamos éxito y datos resumen al cliente
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
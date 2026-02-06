"use server";

import { createAdminClient } from "@/utils/supabase/admin";


export async function getEmpleadosConVentasHoy() {
    try {
        const supabase = createAdminClient();
        
        // 1. FECHA COLOMBIA
        const fechaColombia = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
        const inicioDia = `${fechaColombia}T00:00:00.000-05:00`; 
        const finDia = `${fechaColombia}T23:59:59.999-05:00`;

        console.log("📅 Buscando ventas hoy...");

        // ---------------------------------------------------------
        // PASO 1: Obtener IDs de USUARIOS que vendieron hoy
        // ---------------------------------------------------------
        const { data: pedidos, error: errPed } = await supabase
            .from('pedido')
            .select('UsuarioID')
            .gte('Fecha', inicioDia) 
            .lte('Fecha', finDia)
            .not('UsuarioID', 'is', null);

        if (errPed) throw new Error("Error Pedidos: " + errPed.message);

        // IDs únicos (ej: [12, 15])
        const idsUsuarios = Array.from(new Set(pedidos?.map((p: any) => p.UsuarioID))) as number[];
        if (idsUsuarios.length === 0) return [];

        // ---------------------------------------------------------
        // PASO 2: Obtener datos de la tabla USUARIO (UsuarioID -> EmpleadoID)
        // ---------------------------------------------------------
        const { data: usuarios, error: errUsu } = await supabase
            .from('usuario')
            .select('UsuarioID, Username, EmpleadoID')
            .in('UsuarioID', idsUsuarios);

        if (errUsu) throw new Error("Error Usuarios: " + errUsu.message);

        const idsEmpleados = usuarios?.map((u: any) => u.EmpleadoID).filter(Boolean) || [];

        // ---------------------------------------------------------
        // PASO 3: Obtener datos de la tabla EMPLEADO (EmpleadoID -> TerceroID)
        // ---------------------------------------------------------
        const { data: empleados, error: errEmp } = await supabase
            .from('empleado')
            .select('EmpleadoID, TerceroID')
            .in('EmpleadoID', idsEmpleados);

        if (errEmp) throw new Error("Error Empleados: " + errEmp.message);

        const idsTerceros = empleados?.map((e: any) => e.TerceroID).filter(Boolean) || [];

        // ---------------------------------------------------------
        // PASO 4: Obtener datos de la tabla TERCERO (Nombres)
        // ---------------------------------------------------------
        const { data: terceros, error: errTer } = await supabase
            .from('tercero')
            .select('TerceroID, Nombres, Apellidos')
            .in('TerceroID', idsTerceros);

        if (errTer) throw new Error("Error Terceros: " + errTer.message);

        // ---------------------------------------------------------
        // PASO 5: ARMAR EL ROMPECABEZAS (Mapping)
        // ---------------------------------------------------------
        const listaFinal = usuarios?.map((u: any) => {
            // Usuario -> Empleado
            const emp = empleados?.find((e: any) => e.EmpleadoID === u.EmpleadoID);
            // Empleado -> Tercero
            const terc = emp ? terceros?.find((t: any) => t.TerceroID === emp.TerceroID) : null;

            const nombreCompleto = terc 
                ? `${terc.Nombres} ${terc.Apellidos || ''}`.trim()
                : `Usuario ${u.Username}`;

            return {
                id: u.UsuarioID,
                nombre: `${nombreCompleto} (${u.Username})`
            };
        }) || [];

        console.log("✅ Empleados encontrados:", listaFinal.length);
        
        return JSON.parse(JSON.stringify(listaFinal));

    } catch (e: any) { 
        console.error("Error API Arqueo:", e.message);
        return []; 
    }
}

// 2. OBTENER HISTORIAL (Lógica Manual para soportar Usuario->Empleado->Tercero)
export async function getHistorialArqueos() {
    try {
        const supabase = createAdminClient();

        // PASO A: Traer la tabla Arqueo plana
        const { data: arqueos, error } = await supabase
            .from('arqueo_caja')
            .select('*') // Traemos todo plano (UsuarioAuditorID, UsuarioResponsableID)
            .order('ArqueoID', { ascending: false })
            .limit(10);

        if (error || !arqueos || arqueos.length === 0) return [];

        // PASO B: Recolectar todos los IDs de usuarios involucrados (Auditor + Responsable)
        const userIds = new Set<number>();
        arqueos.forEach((a: any) => {
            if (a.UsuarioAuditorID) userIds.add(a.UsuarioAuditorID);
            if (a.UsuarioResponsableID) userIds.add(a.UsuarioResponsableID);
        });
        const idsArray = Array.from(userIds);

        if (idsArray.length === 0) return JSON.parse(JSON.stringify(arqueos));

        // PASO C: Traer la cadena Usuario -> Empleado -> Tercero para estos IDs
        // 1. Usuarios
        const { data: usuarios } = await supabase.from('usuario').select('UsuarioID, EmpleadoID').in('UsuarioID', idsArray);
        const empIds = usuarios?.map((u:any) => u.EmpleadoID).filter(Boolean) || [];
        
        // 2. Empleados
        const { data: empleados } = await supabase.from('empleado').select('EmpleadoID, TerceroID').in('EmpleadoID', empIds);
        const tercIds = empleados?.map((e:any) => e.TerceroID).filter(Boolean) || [];

        // 3. Terceros
        const { data: terceros } = await supabase.from('tercero').select('TerceroID, Nombres, Apellidos').in('TerceroID', tercIds);

        // Helper para buscar nombre
        const getNombreCompleto = (usuarioId: number) => {
            const u = usuarios?.find((x:any) => x.UsuarioID === usuarioId);
            if (!u) return 'Desconocido';
            const e = empleados?.find((x:any) => x.EmpleadoID === u.EmpleadoID);
            if (!e) return 'Sin Empleado';
            const t = terceros?.find((x:any) => x.TerceroID === e.TerceroID);
            return t ? `${t.Nombres} ${t.Apellidos || ''}`.trim() : 'Sin Nombre';
        };

        // PASO D: Inyectar los objetos 'responsable' y 'auditor' como los espera el frontend
        const historialFinal = arqueos.map((arq: any) => ({
            ...arq,
            // Simulamos la estructura anidada que espera tu HTML: responsable.tercero.Nombres
            auditor: { 
                tercero: { Nombres: getNombreCompleto(arq.UsuarioAuditorID) } 
            },
            responsable: { 
                tercero: { Nombres: getNombreCompleto(arq.UsuarioResponsableID) } 
            }
        }));

        return JSON.parse(JSON.stringify(historialFinal));

    } catch (e) {
        console.error("Error historial:", e);
        return [];
    }
}
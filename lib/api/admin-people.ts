"use server";

import { createAdminClient } from "@/utils/supabase/admin";

export async function getPersonasAdmin() {
  const supabase = createAdminClient();

  try {
    // Consulta optimizada para traer todo en una sola llamada
    const { data, error } = await supabase
      .from('tercero')
      .select(`
        *,
        empleado (
          EmpleadoID,
          Activo,
          CargoID,
          cargo ( NombreCargo ),
          usuario ( UsuarioID, Username, Activo )
        )
      `)
      .order('TerceroID', { ascending: false });

    if (error) {
      console.error("Error SQL Personas:", error.message);
      return [];
    }

    if (!data) return [];

    return data.map((t: any) => {
      // Extraer datos del empleado de forma segura
      const empRaw = t.empleado && t.empleado.length > 0 ? t.empleado[0] : null;
      
      // Lógica visual: Si existe el registro y está activo, es empleado.
      const esEmpleadoActivo = empRaw && empRaw.Activo === true;
      const cargoNombre = empRaw?.cargo?.NombreCargo || 'Cliente';

      // Estructura EXACTA que espera tu Page.tsx anterior
      return {
        TerceroID: t.TerceroID,
        Nombres: t.Nombres,
        Apellidos: t.Apellidos,
        Documento: `${t.TipoDocumento} ${t.NumeroDocumento}`,
        Telefono: t.Telefono,
        Email: t.Email,
        Direccion: t.Direccion,
        Activo: t.Activo, 
        
        // Datos calculados para la UI
        EsEmpleado: !!empRaw, // Existe registro en tabla empleado (aunque esté inactivo)
        EmpleadoID: empRaw?.EmpleadoID || null,
        
        // Si está inactivo, visualmente mostramos "Cliente", si está activo, su cargo
        Cargo: esEmpleadoActivo ? cargoNombre : 'Cliente', 
        CargoID: empRaw?.CargoID || null,
        
        // Para el botón de bloquear/desbloquear
        EmpleadoActivo: esEmpleadoActivo,
        
        // Datos de usuario
        UsuarioID: empRaw?.usuario?.[0]?.UsuarioID || null,
        Username: empRaw?.usuario?.[0]?.Username || null
      };
    });

  } catch (error) {
    console.error("Error general:", error);
    return [];
  }
}
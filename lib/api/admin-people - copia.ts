"use server";

import { createAdminClient } from "@/utils/supabase/admin";

export async function getPersonasAdmin() {
  const supabase = createAdminClient();

  try {
    // Traemos al Tercero y anidamos Empleado -> Cargo y Empleado -> Usuario
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

    // Procesamos para facilitar el uso en el Frontend
    return data.map((t: any) => {
      // Verificamos si existe registro de empleado (puede ser un array vacío o null)
      const emp = t.empleado && t.empleado.length > 0 ? t.empleado[0] : null;
      const usu = emp && emp.usuario && emp.usuario.length > 0 ? emp.usuario[0] : null;

      return {
        TerceroID: t.TerceroID,
        Nombres: t.Nombres,
        Apellidos: t.Apellidos,
        Documento: `${t.TipoDocumento} ${t.NumeroDocumento}`,
        Telefono: t.Telefono,
        Email: t.Email,
        Direccion: t.Direccion,
        Activo: t.Activo, // Estado del Tercero
        
        // Datos de Empleado (si es que es)
        EsEmpleado: !!emp,
        EmpleadoID: emp?.EmpleadoID || null,
        Cargo: emp?.cargo?.NombreCargo || 'Cliente',
        CargoID: emp?.CargoID || null,
        EmpleadoActivo: emp?.Activo || false,

        // Datos de Usuario (si tiene acceso)
        UsuarioID: usu?.UsuarioID || null,
        Username: usu?.Username || null,
        TieneAcceso: !!usu && usu.Activo
      };
    });

  } catch (err) {
    console.error("Error general getPersonas:", err);
    return [];
  }
}
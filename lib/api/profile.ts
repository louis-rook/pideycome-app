"use server";
import { createClient } from "@/utils/supabase/server";
import { PerfilUsuario } from "@/types/profile";

export async function getPerfilUsuario(): Promise<PerfilUsuario | null> {
  const supabase = await createClient();
  
  // 1. Obtener sesión actual
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 2. Consulta tipada
  const { data, error } = await supabase
    .from('usuario')
    .select(`
      UsuarioID, Username, FotoPerfil, auth_user_id,
      empleado!inner (
        tercero!inner (
           TerceroID, Nombres, Apellidos, Email, Telefono, 
           Direccion, NumeroDocumento, TipoDocumento
        ),
        cargo ( NombreCargo )
      )
    `)
    .eq('auth_user_id', user.id)
    .single();

  if (error || !data) {
      console.error("Error fetching perfil:", error);
      return null;
  }

  // 3. Transformación segura (Mapeo)
  // TypeScript aquí ya sabe qué estructura tiene 'data' gracias a Supabase (si generaste tipos) 
  // o podemos castear con cuidado si no tienes los tipos de DB generados aún.
  
  const emp: any = data.empleado; // Usamos any solo aquí temporalmente para acceder a anidados
  const terc = emp.tercero;

  return {
    UsuarioID: data.UsuarioID,
    Username: data.Username,
    FotoPerfil: data.FotoPerfil,
    AuthID: data.auth_user_id || "",
    
    // Datos de Tercero
    TerceroID: terc.TerceroID,
    Nombres: terc.Nombres,
    Apellidos: terc.Apellidos,
    Email: terc.Email,
    Telefono: terc.Telefono,
    Direccion: terc.Direccion,
    Documento: terc.NumeroDocumento,
    TipoDoc: terc.TipoDocumento,
    
    // Cargo
    Cargo: emp.cargo?.NombreCargo || "Sin Cargo"
  };
}
"use server";
import { createClient } from "@/utils/supabase/server";

export async function getPerfilUsuario() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('usuario')
    .select(`
      *, 
      empleado (
        EmpleadoID,
        tercero ( * ),
        cargo ( NombreCargo )
      )
    `)
    .eq('auth_user_id', user.id)
    .single();

  if (error || !data) return null;

  const emp = (data as any).empleado;
  const terc = emp?.tercero;

  return {
    UsuarioID: data.UsuarioID,
    Username: data.Username,
    // Forzamos la lectura de FotoPerfil (asegúrate de las mayúsculas en la DB)
    FotoPerfil: data.FotoPerfil || (data as any).fotoperfil || null,
    Nombres: terc?.Nombres,
    Apellidos: terc?.Apellidos,
    Email: terc?.Email,
    Telefono: terc?.Telefono,
    Direccion: terc?.Direccion,
    Documento: terc?.NumeroDocumento,
    TipoDoc: terc?.TipoDocumento,
    Cargo: (emp as any)?.cargo?.NombreCargo,
    TerceroID: terc?.TerceroID
  };
}
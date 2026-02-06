"use server";

import { createClient } from "@/utils/supabase/server";

export async function getCurrentUser() {
  const supabase = await createClient();

  // 1. Verificamos la sesión de Auth
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  // 2. Usamos tu estructura ORIGINAL que sí funcionaba.
  // Solo agregamos 'EmpleadoID' y 'CargoID' a la lista.
  const { data, error } = await supabase
    .from('usuario')
    .select(`
      UsuarioID,
      Username,
      FotoPerfil,
      empleado (
        EmpleadoID,
        tercero ( Nombres, Apellidos, Email ),
        cargo ( CargoID, NombreCargo )
      )
    `)
    .eq('auth_user_id', user.id)
    .single(); // Usamos single() como lo tenías originalmente

  // Si hay error en la consulta (ej. usuario nuevo sin perfil), retornamos null
  if (error || !data) {
    console.error("Error obteniendo perfil:", error?.message);
    return null;
  }

  // 3. Mapeo de datos (Con protección para que no falle si algo viene vacío)
  // Usamos 'any' temporalmente para que TypeScript no bloquee la compilación
  const rawData = data as any;
  
  // Verificamos si empleado es un array (a veces Supabase devuelve arrays en relaciones)
  const empleadoObj = Array.isArray(rawData.empleado) ? rawData.empleado[0] : rawData.empleado;
  
  const tercero = empleadoObj?.tercero;
  const cargo = empleadoObj?.cargo;

  // Verificamos si tercero/cargo son arrays (por si acaso)
  const terceroObj = Array.isArray(tercero) ? tercero[0] : tercero;
  const cargoObj = Array.isArray(cargo) ? cargo[0] : cargo;

  return {
    UsuarioID: rawData.UsuarioID,
    Username: rawData.Username,
    FotoPerfil: rawData.FotoPerfil,
    
    // Datos Personales
    Nombres: terceroObj?.Nombres || 'Usuario',
    Apellidos: terceroObj?.Apellidos || '',
    Email: terceroObj?.Email || '',
    
    // Datos Clave para el Dashboard
    EmpleadoID: empleadoObj?.EmpleadoID, 
    CargoID: cargoObj?.CargoID,          
    Cargo: cargoObj?.NombreCargo || 'Sin Cargo'
  };
}
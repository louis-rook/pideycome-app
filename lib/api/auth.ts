"use server";

// ============================================================================
// IMPORTACIONES
// ============================================================================
import { createClient } from "@/utils/supabase/server";

// ============================================================================
// FUNCIÓN: getCheckPasswordReset
// ============================================================================
/**
 * Consulta en la base de datos si un usuario específico tiene la obligación
 * de cambiar su contraseña tras el primer inicio de sesión.
 * * ARQUITECTURA: Se extrajo de actions/auth.ts para cumplir con la regla 
 * "Divide y Vencerás" (Solo GETs en lib/api).
 * * @param {string} userId - El ID de autenticación (auth_user_id) de Supabase.
 * @returns {Promise<boolean>} - True si debe cambiar contraseña, False en caso contrario.
 */
export async function getCheckPasswordReset(userId: string): Promise<boolean> {
  // Inicializamos el cliente de Supabase para el entorno de servidor
  const supabase = await createClient();
  
  // Realizamos la consulta a la tabla personalizada 'usuario'
  const { data, error } = await supabase
    .from('usuario')
    .select('debecambiarpassword')
    .eq('auth_user_id', userId)
    .single(); // Esperamos un único registro

  // Manejo de errores silencioso para no romper la app, pero logueado para depuración
  if (error) {
    console.error("⚠️ Error verificando flag de password:", error.message);
    return false;
  }
  
  return data?.debecambiarpassword || false;
}

// ============================================================================
// FUNCIÓN: getCurrentUser
// ============================================================================
/**
 * Obtiene el perfil completo del usuario actual autenticado, incluyendo 
 * datos relacionados de empleado y cargo.
 * * RENDIMIENTO: Realiza un Join (select anidado) en una sola consulta a Supabase
 * para evitar el problema de N+1 consultas.
 * * @returns {Promise<Object | null>} - Objeto con los datos del usuario o null si falla.
 */
export async function getCurrentUser() {
  const supabase = await createClient();

  // 1. Verificamos la sesión actual en Supabase Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null; // Si no hay sesión, retornamos null inmediatamente

  // 2. Consulta unificada a la tabla 'usuario' con sus relaciones
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
    .single(); 

  // Si hay error en la consulta (ej. usuario nuevo sin perfil creado), retornamos null
  if (error || !data) {
    console.error("❌ Error obteniendo perfil:", error?.message);
    return null;
  }

  // 3. Normalización y Mapeo de datos (Seguridad de Tipos)
  // Supabase a veces devuelve las relaciones como arrays dependiendo de la FK.
  // Nos aseguramos de extraer el primer elemento si es un array para evitar errores en la UI.
  const empleado = Array.isArray(data.empleado) ? data.empleado[0] : data.empleado;
  const tercero = Array.isArray(empleado?.tercero) ? empleado.tercero[0] : empleado?.tercero;
  const cargo = Array.isArray(empleado?.cargo) ? empleado.cargo[0] : empleado?.cargo;

  // Retornamos un objeto plano y predecible para que el Frontend lo consuma fácilmente
  return {
    UsuarioID: data.UsuarioID,
    Username: data.Username,
    FotoPerfil: data.FotoPerfil,
    
    // Datos Personales (Con fallbacks para evitar valores undefined en la UI)
    Nombres: tercero?.Nombres || 'Usuario',
    Apellidos: tercero?.Apellidos || '',
    Email: tercero?.Email || '',
    
    // Datos Clave para lógica de negocio y roles
    EmpleadoID: empleado?.EmpleadoID, 
    CargoID: cargo?.CargoID,          
    Cargo: cargo?.NombreCargo || 'Sin Cargo'
  };
}
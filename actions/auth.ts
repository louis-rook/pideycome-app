"use server";

// ============================================================================
// IMPORTACIONES
// ============================================================================
import { createClient } from "@/utils/supabase/server"; // Cliente Supabase para Server Actions
import { redirect } from "next/navigation"; // Manejo de redirecciones del servidor
import { revalidatePath } from "next/cache"; // Limpieza de caché

// ============================================================================
// 1. FUNCIÓN DE LOGIN
// ============================================================================
/**
 * Procesa el inicio de sesión.
 * Verifica credenciales y comprueba si el usuario está obligado a cambiar contraseña.
 */
export async function login(formData: FormData) {
  // Inicializamos cliente de Supabase
  const supabase = await createClient();

  // Extraemos datos del formulario
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Validación básica
  if (!email || !password) return { error: "Completa todos los campos" };

  // --- A. AUTENTICACIÓN CON SUPABASE ---
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    console.error("❌ Login error (Auth):", signInError.message);
    // Retornamos el error para mostrarlo en la interfaz (ej: "Credenciales inválidas")
    return { error: `Error: ${signInError.message}` };
  }

  // --- B. VERIFICACIÓN POST-LOGIN (CAMBIO DE CONTRASEÑA) ---
  try {
    // Obtenemos el usuario autenticado
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        // Consultamos la tabla personalizada 'usuario' para ver el flag 'debecambiarpassword'
        const { data: usuarioDB, error: dbError } = await supabase
          .from('usuario')
          .select('debecambiarpassword')
          .eq('auth_user_id', user.id)
          .single();
        
        if (dbError) {
            console.error("⚠️ Error verificando cambio de password:", dbError.message);
        }
        
        // Si el flag es true, forzamos redirección a la vista de cambio de contraseña
        if (usuarioDB?.debecambiarpassword) {
            redirect("/change-password"); 
        }
    }
  } catch (e) {
    // NOTA IMPORTANTE: En Next.js, 'redirect' lanza un error internamente.
    // Si lo atrapamos en el catch, debemos volver a lanzarlo para que la redirección funcione.
    if (e instanceof Error && e.message === 'NEXT_REDIRECT') {
        throw e;
    }
    // Si es otro error (ej. base de datos), lo logueamos pero permitimos el acceso
    console.error("Error no crítico en post-login:", e);
  }

  // --- C. ÉXITO ---
  revalidatePath("/", "layout"); // Refrescamos la caché para actualizar la UI (ej. mostrar menú)
  redirect("/admin"); // Enviamos al dashboard
}

// ============================================================================
// 2. RECUPERAR CONTRASEÑA
// ============================================================================
/**
 * Envía un correo electrónico con un enlace mágico para resetear la contraseña.
 */
export async function recuperarPassword(formData: FormData) {
    const supabase = await createClient();
    const email = formData.get("email") as string;
    
    // Determinamos la URL base (Localhost o Producción)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    // Solicitamos a Supabase el envío del correo
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/change-password`, // A dónde vuelve el usuario tras dar clic en el correo
    });

    if (error) return { error: error.message };
    return { success: true, message: "Si el correo existe, recibirás un enlace para restablecer tu contraseña." };
}

// ============================================================================
// 3. ACTUALIZAR CONTRASEÑA
// ============================================================================
/**
 * Cambia la contraseña del usuario actual y actualiza el flag en la base de datos.
 */
export async function actualizarPassword(formData: FormData) {
    const supabase = await createClient();
    const newPassword = formData.get("password") as string;
    
    if (newPassword.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres" };

    // 1. Actualizar en Supabase Auth
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) return { error: error.message };

    // 2. Actualizar flag en tabla 'usuario' (Ya no debe cambiar contraseña)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await supabase.from('usuario').update({ debecambiarpassword: false }).eq('auth_user_id', user.id);
    }

    redirect("/admin");
}

// ============================================================================
// 4. CERRAR SESIÓN
// ============================================================================
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut(); // Destruye la sesión en el servidor
  redirect('/login');
}
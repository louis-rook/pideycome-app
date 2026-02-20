"use server";

// ============================================================================
// IMPORTACIONES
// ============================================================================
import { createClient } from "@/utils/supabase/server"; // Cliente Supabase
import { redirect } from "next/navigation"; // Manejo de redirecciones
import { revalidatePath } from "next/cache"; // Limpieza de caché de Next.js
import { getCheckPasswordReset } from "@/lib/api/auth"; // Consulta separada por arquitectura

// ============================================================================
// 1. INICIO DE SESIÓN
// ============================================================================
/**
 * Procesa el formulario de login, autentica con Supabase y verifica
 * si el usuario necesita cambiar su contraseña inicial.
 * * @param {FormData} formData - Datos del formulario (email, password).
 */
export async function login(formData: FormData) {
  const supabase = await createClient();

  // Extraemos y sanitizamos ligeramente los inputs
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();

  // SEGURIDAD: Validación básica (Idealmente esto se cambiará por Zod más adelante)
  if (!email || !password) return { error: "Completa todos los campos requeridos." };

  // --- A. MUTACIÓN: AUTENTICACIÓN ---
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    console.error("❌ Login error:", signInError.message);
    // SEGURIDAD: Mensaje genérico para no dar pistas de si falló el correo o la clave
    return { error: "Credenciales inválidas." }; 
  }

  // --- B. VERIFICACIÓN POST-LOGIN ---
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // ARQUITECTURA: Llamamos a la API en lugar de hacer el query directamente aquí
      const debeCambiar = await getCheckPasswordReset(user.id);
      
      if (debeCambiar) {
        redirect("/change-password"); 
      }
    }
  } catch (e) {
    // ARQUITECTURA NEXT.JS: 'redirect' lanza un error especial (NEXT_REDIRECT).
    // Si lo atrapamos, debemos relanzarlo o la redirección fallará.
    if (e instanceof Error && e.message === 'NEXT_REDIRECT') {
        throw e;
    }
    console.error("⚠️ Error no crítico en post-login:", e);
  }

  // --- C. ÉXITO ---
  // RENDIMIENTO: Limpiamos la caché del layout principal para que la UI 
  // (ej. Navbar, Sidebar) refleje la nueva sesión inmediatamente.
  revalidatePath("/", "layout"); 
  redirect("/admin"); 
}

// ============================================================================
// 2. RECUPERAR CONTRASEÑA
// ============================================================================
/**
 * Solicita a Supabase el envío de un correo con enlace mágico para resetear la clave.
 * * @param {FormData} formData - Contiene el email del usuario.
 */
export async function recuperarPassword(formData: FormData) {
    const supabase = await createClient();
    const email = formData.get("email")?.toString().trim();
    
    if (!email) return { error: "El correo es obligatorio." };
    
    // Determinamos la URL de retorno dinámicamente
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    // --- MUTACIÓN: SOLICITUD DE RESETEO ---
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/change-password`,
    });

    if (error) {
        console.error("❌ Error enviando recuperación:", error.message);
        return { error: "Ocurrió un error al procesar la solicitud." };
    }

    // SEGURIDAD: Prevención de enumeración de usuarios. 
    // Siempre retornamos éxito para que un atacante no sepa si el correo existe o no en la DB.
    return { success: true, message: "Si el correo existe en nuestro sistema, recibirás un enlace." };
}

// ============================================================================
// 3. ACTUALIZAR CONTRASEÑA
// ============================================================================
/**
 * Cambia la contraseña del usuario actual (en Auth y en la tabla personalizada).
 * * @param {FormData} formData - Contiene la nueva contraseña.
 */
export async function actualizarPassword(formData: FormData) {
    const supabase = await createClient();
    const newPassword = formData.get("password")?.toString();
    
    // SEGURIDAD: Validación de longitud mínima para contraseñas fuertes
    if (!newPassword || newPassword.length < 8) {
        return { error: "Por seguridad, la contraseña debe tener al menos 8 caracteres." };
    }

    // --- A. MUTACIÓN: Actualizar en Supabase Auth ---
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
        console.error("❌ Error actualizando password auth:", error.message);
        return { error: "No se pudo actualizar la contraseña." };
    }

    // --- B. MUTACIÓN: Actualizar flag en tabla 'usuario' ---
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await supabase.from('usuario')
            .update({ debecambiarpassword: false })
            .eq('auth_user_id', user.id);
    }

    // ÉXITO
    redirect("/admin");
}

// ============================================================================
// 4. CERRAR SESIÓN
// ============================================================================
/**
 * Destruye la sesión actual del usuario en el servidor y redirige al login.
 */
export async function logout() {
  const supabase = await createClient();
  
  // --- MUTACIÓN: CERRAR SESIÓN ---
  await supabase.auth.signOut(); 
  
  redirect('/login');
}
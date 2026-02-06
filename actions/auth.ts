"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// 1. LOGIN MEJORADO (Con depuración y manejo de errores)
export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) return { error: "Completa todos los campos" };

  // Intentamos loguear
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    console.error("❌ Login error (Auth):", signInError.message);
    // Retornamos el mensaje real para saber si es "Invalid login credentials" u otra cosa
    return { error: `Error: ${signInError.message}` };
  }

  // VERIFICAR SI DEBE CAMBIAR CONTRASEÑA
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        // Usamos comillas dobles por si acaso Postgres se pone estricto aquí también
        const { data: usuarioDB, error: dbError } = await supabase
          .from('usuario')
          .select('debecambiarpassword')
          .eq('auth_user_id', user.id)
          .single();
        
        if (dbError) {
            console.error("⚠️ Error verificando cambio de password:", dbError.message);
        }
        
        if (usuarioDB?.debecambiarpassword) {
            redirect("/change-password"); 
        }
    }
  } catch (e) {
    // Si el error es la redirección de Next.js, dejamos que pase
    if (e instanceof Error && e.message === 'NEXT_REDIRECT') {
        throw e;
    }
    // Si es otro error (ej. base de datos), lo logueamos pero dejamos entrar al usuario
    console.error("Error no crítico en post-login:", e);
  }

  revalidatePath("/", "layout");
  redirect("/admin");
}

// 2. RECUPERAR CONTRASEÑA (Tu código original intacto)
export async function recuperarPassword(formData: FormData) {
    const supabase = await createClient();
    const email = formData.get("email") as string;
    
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/change-password`,
    });

    if (error) return { error: error.message };
    return { success: true, message: "Si el correo existe, recibirás un enlace para restablecer tu contraseña." };
}

// 3. CAMBIAR CONTRASEÑA (Tu código original intacto)
export async function actualizarPassword(formData: FormData) {
    const supabase = await createClient();
    const newPassword = formData.get("password") as string;
    
    if (newPassword.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres" };

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) return { error: error.message };

    // Actualizar flag en base de datos
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await supabase.from('usuario').update({ debecambiarpassword: false }).eq('auth_user_id', user.id);
    }

    redirect("/admin");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
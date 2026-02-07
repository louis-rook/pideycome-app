"use server";

// ============================================================================
// IMPORTACIONES
// ============================================================================
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server"; // Cliente estándar para verificar sesión
import { revalidatePath } from "next/cache";

// ============================================================================
// 1. ACTUALIZAR INFO PERSONAL (Blindado contra ataques)
// ============================================================================
export async function actualizarInfoPerfil(formData: FormData) {
    const supabaseAdmin = createAdminClient(); // Para escribir en BD con permisos totales
    const supabaseAuth = await createClient(); // Para verificar quién está logueado realmente

    // --- A. VERIFICACIÓN DE SEGURIDAD ROBUSTA ---
    // 1. Obtener usuario autenticado
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return { error: "No hay sesión activa." };

    // 2. Obtener ID del formulario (lo que el frontend dice que quiere editar)
    const terceroIDForm = formData.get("terceroID");
    
    // 3. Consultar en BD quién es REALMENTE este usuario logueado
    const { data: validacion } = await supabaseAdmin
        .from("usuario")
        .select("empleado(TerceroID)")
        .eq("auth_user_id", user.id)
        .single();

    const terceroRealID = (validacion?.empleado as any)?.TerceroID;

    // 4. Comparar ID real vs ID del formulario
    // Si no coinciden, significa que alguien manipuló el formulario (Hacking attempt)
    if (String(terceroRealID) !== String(terceroIDForm)) {
        return { error: "Acción no autorizada. No puedes modificar este perfil." };
    }

    // --- B. PROCESAR ACTUALIZACIÓN ---
    const datos = {
        Telefono: formData.get("telefono") as string,
        Direccion: formData.get("direccion") as string,
        Nombres: formData.get("nombres") as string,
        Apellidos: formData.get("apellidos") as string,
    };

    // Actualizamos usando SIEMPRE el ID verificado (terceroRealID), nunca el del form
    const { error } = await supabaseAdmin
        .from("tercero")
        .update(datos)
        .eq("TerceroID", terceroRealID); 

    if (error) return { error: "Error al actualizar: " + error.message };
    
    revalidatePath("/admin/perfil");
    return { success: true, message: "Información actualizada correctamente." };
}

// ============================================================================
// 2. CAMBIAR CONTRASEÑA
// ============================================================================
export async function cambiarPasswordPerfil(formData: FormData) {
    const supabase = await createClient(); // Auth maneja su propia seguridad con la sesión
    const password = formData.get("password") as string;
    const confirm = formData.get("confirmPassword") as string;

    // Validaciones básicas
    if (password !== confirm) return { error: "Las contraseñas no coinciden" };
    if (password.length < 6) return { error: "Mínimo 6 caracteres" };

    // Actualizar en Supabase Auth
    const { error } = await supabase.auth.updateUser({ password: password });

    if (error) return { error: error.message };
    return { success: true, message: "Contraseña actualizada." };
}

// ============================================================================
// 3. SUBIR FOTO DE PERFIL
// ============================================================================
export async function subirFotoPerfil(formData: FormData) {
    const supabase = createAdminClient();
    const file = formData.get("file") as File;
    const usuarioID = formData.get("usuarioID");

    if (!file || !usuarioID) return { error: "Faltan datos" };

    try {
        // Generar nombre único para el archivo
        const fileExt = file.name.split('.').pop();
        const fileName = `avatar_${usuarioID}_${Date.now()}.${fileExt}`;

        // 1. Subir al Storage (Bucket 'avatars')
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, file, { upsert: true });

        if (uploadError) throw new Error(uploadError.message);

        // 2. Obtener URL Pública
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        const imagenUrl = urlData.publicUrl;

        // 3. Actualizar referencia en tabla 'usuario'
        await supabase
            .from("usuario")
            .update({ FotoPerfil: imagenUrl })
            .eq("UsuarioID", usuarioID);

        // 4. Sincronizar metadatos en Auth (Para que el avatar aparezca en toda la app)
        const { data: userData } = await supabase.from("usuario").select("auth_user_id").eq("UsuarioID", usuarioID).single();
        if (userData?.auth_user_id) {
             await supabase.auth.admin.updateUserById(userData.auth_user_id, {
                user_metadata: { avatar_url: imagenUrl }
            });
        }

        revalidatePath("/admin/perfil", "page"); 
        
        return { success: true, url: imagenUrl, message: "Foto actualizada" };

    } catch (error: any) {
        return { error: error.message };
    }
}
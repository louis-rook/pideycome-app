"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

// 1. ACTUALIZAR INFO PERSONAL
export async function actualizarInfoPerfil(formData: FormData) {
    const supabase = createAdminClient();
    const terceroID = formData.get("terceroID");
    
    if(!terceroID) return { error: "No se identificó el usuario" };

    const datos = {
        Telefono: formData.get("telefono") as string,
        Direccion: formData.get("direccion") as string,
        // Nombres y Apellidos aquí permitimos editarlos
        Nombres: formData.get("nombres") as string,
        Apellidos: formData.get("apellidos") as string,
    };

    const { error } = await supabase
        .from("tercero")
        .update(datos)
        .eq("TerceroID", terceroID);

    if (error) return { error: error.message };
    
    revalidatePath("/admin/perfil");
    return { success: true, message: "Información actualizada correctamente." };
}

// 2. CAMBIAR CONTRASEÑA
export async function cambiarPasswordPerfil(formData: FormData) {
    const supabase = createAdminClient();
    const password = formData.get("password") as string;
    const confirm = formData.get("confirmPassword") as string;

    if (password !== confirm) return { error: "Las contraseñas no coinciden" };
    if (password.length < 6) return { error: "La contraseña debe tener mínimo 6 caracteres" };

    const { error } = await supabase.auth.updateUser({ password: password });

    if (error) return { error: error.message };
    return { success: true, message: "Contraseña actualizada exitosamente." };
}

// 3. ACTUALIZAR FOTO
// 3. ACTUALIZAR FOTO (CON DIAGNÓSTICO)
export async function subirFotoPerfil(formData: FormData) {
    const supabase = createAdminClient();
    const file = formData.get("foto") as File;
    const usuarioIDRaw = formData.get("usuarioID");

    if (!file || !usuarioIDRaw) return { success: false, message: "Faltan datos" };

    const usuarioID = parseInt(usuarioIDRaw.toString());
    const fileName = `${usuarioID}-${Date.now()}.png`;
    
    try {
        // 1. Subida al Storage
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, file, { upsert: true });

        if (uploadError) throw new Error(uploadError.message);

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        const imagenUrl = urlData.publicUrl;

        // 2. Actualizar Tabla Usuario (Asegúrate que la columna se llame FotoPerfil)
        const { data: userData, error: dbError } = await supabase
            .from("usuario")
            .update({ FotoPerfil: imagenUrl })
            .eq("UsuarioID", usuarioID)
            .select('auth_user_id') // Traemos el ID de Auth vinculado
            .single();

        if (dbError) throw new Error(dbError.message);

        // 3. Actualizar Metadata Auth (Solo si el ID es un UUID válido)
        if (userData?.auth_user_id) {
            await supabase.auth.admin.updateUserById(userData.auth_user_id, {
                user_metadata: { avatar_url: imagenUrl }
            });
        }

        revalidatePath("/", "layout");
        revalidatePath("/admin/perfil");

        return { success: true, url: imagenUrl, message: "Foto actualizada con éxito" };

    } catch (error: any) {
        console.error("Error en perfil:", error.message);
        // Usamos 'message' para que coincida con tu lógica de productos
        return { success: false, message: error.message };
    }
}
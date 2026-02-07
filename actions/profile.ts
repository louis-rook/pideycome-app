"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server"; // Cliente estándar para verificar sesión
import { revalidatePath } from "next/cache";

// 1. ACTUALIZAR INFO PERSONAL (BLINDADO 🛡️)
export async function actualizarInfoPerfil(formData: FormData) {
    const supabaseAdmin = createAdminClient(); // Para escribir (Admin)
    const supabaseAuth = await createClient(); // Para verificar sesión (User)

    // A. VERIFICACIÓN DE SEGURIDAD
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return { error: "No hay sesión activa." };

    // Obtenemos el ID del tercero que se intenta modificar
    const terceroIDForm = formData.get("terceroID");
    
    // Consultamos si este usuario logueado REALMENTE es dueño de ese TerceroID
    const { data: validacion } = await supabaseAdmin
        .from("usuario")
        .select("empleado(TerceroID)")
        .eq("auth_user_id", user.id)
        .single();

    const terceroRealID = (validacion?.empleado as any)?.TerceroID;

    // Si el ID del formulario no coincide con el de la base de datos... HACKER DETECTADO 🚨
    if (String(terceroRealID) !== String(terceroIDForm)) {
        return { error: "Acción no autorizada. No puedes modificar este perfil." };
    }

    // B. PROCESAR DATOS
    const datos = {
        Telefono: formData.get("telefono") as string,
        Direccion: formData.get("direccion") as string,
        Nombres: formData.get("nombres") as string,
        Apellidos: formData.get("apellidos") as string,
    };

    const { error } = await supabaseAdmin
        .from("tercero")
        .update(datos)
        .eq("TerceroID", terceroRealID); // Usamos el ID verificado, no el del form

    if (error) return { error: "Error al actualizar: " + error.message };
    
    revalidatePath("/admin/perfil");
    return { success: true, message: "Información actualizada correctamente." };
}

// 2. CAMBIAR CONTRASEÑA (Mantenemos igual, ya usa la sesión activa)
export async function cambiarPasswordPerfil(formData: FormData) {
    const supabase = await createClient(); // Usamos cliente normal, auth maneja la seguridad
    const password = formData.get("password") as string;
    const confirm = formData.get("confirmPassword") as string;

    if (password !== confirm) return { error: "Las contraseñas no coinciden" };
    if (password.length < 6) return { error: "Mínimo 6 caracteres" };

    const { error } = await supabase.auth.updateUser({ password: password });

    if (error) return { error: error.message };
    return { success: true, message: "Contraseña actualizada." };
}

// 3. SUBIR FOTO (Mantenemos igual, pero agregamos tipado de retorno)
export async function subirFotoPerfil(formData: FormData) {
    const supabase = createAdminClient();
    const file = formData.get("file") as File;
    const usuarioID = formData.get("usuarioID");

    if (!file || !usuarioID) return { error: "Faltan datos" };

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `avatar_${usuarioID}_${Date.now()}.${fileExt}`;

        // Subir
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, file, { upsert: true });

        if (uploadError) throw new Error(uploadError.message);

        // Obtener URL
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        const imagenUrl = urlData.publicUrl;

        // Actualizar BD
        await supabase
            .from("usuario")
            .update({ FotoPerfil: imagenUrl })
            .eq("UsuarioID", usuarioID);

        // Actualizar Auth Metadata (Opcional, para sincronizar avatar)
        const { data: userData } = await supabase.from("usuario").select("auth_user_id").eq("UsuarioID", usuarioID).single();
        if (userData?.auth_user_id) {
             await supabase.auth.admin.updateUserById(userData.auth_user_id, {
                user_metadata: { avatar_url: imagenUrl }
            });
        }

        revalidatePath("/admin/perfil", "page"); // Revalidar la página específica
        
        return { success: true, url: imagenUrl, message: "Foto actualizada" };

    } catch (error: any) {
        return { error: error.message };
    }
}
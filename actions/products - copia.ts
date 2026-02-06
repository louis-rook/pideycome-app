"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server"; 
import { revalidatePath } from "next/cache";

// --- CONSTANTES DE ROLES ---
// Según tu BD: 1 = Admin, 5 = Lider
const ID_ADMIN = 1;
const ID_LIDER = 5;

// --- FUNCIÓN DE SEGURIDAD BLINDADA ---
async function verificarPermisosAdminOLider() {
    // 1. OBTENER USUARIO LOGUEADO
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.log("🔒 PERMISOS: No hay sesión activa.");
        return false;
    }

    console.log("🔍 PERMISOS: Verificando UUID:", user.id);

    const supabaseAdmin = createAdminClient();

    // 2. BUSCAR EN TABLA 'usuario' (Vinculación por auth_user_id)
    const { data: usuarioDB, error: errorUsuario } = await supabaseAdmin
        .from('usuario') 
        .select('UsuarioID, EmpleadoID, Activo') 
        .eq('auth_user_id', user.id) 
        .maybeSingle();

    if (errorUsuario) {
        console.error("❌ Error en tabla usuario:", errorUsuario.message);
        return false;
    }

    if (!usuarioDB) {
        console.log("⚠️ El UUID no existe en tabla 'usuario'.");
        return false;
    }

    // Validar que el usuario del sistema esté activo
    if (!usuarioDB.Activo) {
        console.log("⛔ El usuario está marcado como Inactivo.");
        return false;
    }

    // 3. BUSCAR EN TABLA 'empleado' (Para obtener el CargoID)
    if (!usuarioDB.EmpleadoID) {
        console.log("⚠️ Usuario sin EmpleadoID asociado.");
        return false;
    }

    const { data: empleadoDB, error: errorEmpleado } = await supabaseAdmin
        .from('empleado')
        .select('CargoID, Activo')
        .eq('EmpleadoID', usuarioDB.EmpleadoID)
        .single();

    if (errorEmpleado || !empleadoDB) {
        console.error("❌ Error buscando empleado:", errorEmpleado?.message);
        return false;
    }

    // Validar que el empleado también esté activo
    if (!empleadoDB.Activo) {
        console.log("⛔ El empleado está marcado como Inactivo.");
        return false;
    }

    console.log(`✅ RUTA ENCONTRADA: UserID ${usuarioDB.UsuarioID} -> EmpleadoID ${usuarioDB.EmpleadoID} -> CargoID ${empleadoDB.CargoID}`);

    // 4. VERIFICACIÓN FINAL DE ROL
    if (empleadoDB.CargoID === ID_ADMIN || empleadoDB.CargoID === ID_LIDER) {
        return true;
    } else {
        console.log(`⛔ ACCESO DENEGADO: CargoID ${empleadoDB.CargoID} no tiene permisos.`);
        return false;
    }
}

function getStorageUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/productos/${path}`;
}

// ---------------------------------------------------------
// 1. CREAR PRODUCTO
// ---------------------------------------------------------
export async function crearProducto(formData: FormData) {
  if (!(await verificarPermisosAdminOLider())) {
      return { success: false, message: "No tienes permisos. Revisa la consola del servidor." };
  }

  const supabase = createAdminClient();

  const nombre = formData.get("nombre") as string;
  const descripcion = formData.get("descripcion") as string;
  const precio = parseFloat(formData.get("precio") as string);
  const categoria = parseInt(formData.get("categoria") as string);
  const ingredientes = formData.get("ingredientes") as string;
  const imagenFile = formData.get("imagen") as File;

  let imagenUrl = "";

  try {
    if (imagenFile && imagenFile.size > 0) {
        const fileExt = imagenFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('productos').upload(fileName, imagenFile);
        if (uploadError) throw new Error("Error subiendo imagen: " + uploadError.message);
        imagenUrl = getStorageUrl(fileName);
    }

    const { data: producto, error: insertError } = await supabase
      .from("producto")
      .insert({
        Nombre: nombre,
        Descripcion: descripcion,
        CategoriaID: categoria,
        Imagen: imagenUrl, 
        Ingredientes: ingredientes,
        activo: true 
      })
      .select("ProductoID")
      .single();

    if (insertError) throw new Error(insertError.message);

    // Insertar precio inicial (UsuarioCreacion hardcodeado a 1 o podrías buscar el ID del usuario actual)
    await supabase.from("precios").insert({
        ProductoID: producto.ProductoID,
        FechaActivacion: new Date().toISOString(),
        Precio: precio,
        UsuarioCreacion: 1 
    });

    revalidatePath("/admin/menu");
    return { success: true };

  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// ---------------------------------------------------------
// 2. ACTUALIZAR PRODUCTO
// ---------------------------------------------------------
export async function actualizarProducto(formData: FormData) {
    if (!(await verificarPermisosAdminOLider())) {
        return { success: false, message: "No tienes permisos. Revisa la consola del servidor." };
    }

    const supabase = createAdminClient();
    
    const idRaw = formData.get("id");
    if (!idRaw) return { success: false, message: "ID no encontrado" };
    
    const id = parseInt(idRaw.toString());
    const nombre = formData.get("nombre") as string;
    const descripcion = formData.get("descripcion") as string;
    const precioRaw = formData.get("precio");
    const categoria = parseInt(formData.get("categoria") as string);
    const ingredientes = formData.get("ingredientes") as string;
    const imagenFile = formData.get("imagen") as File;
    const imagenAnterior = formData.get("imagenAnterior") as string;

    let imagenUrl = imagenAnterior; 

    try {
        if (imagenFile && imagenFile.size > 0) {
            const fileExt = imagenFile.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('productos').upload(fileName, imagenFile);
            if (uploadError) throw new Error("Error imagen update");
            imagenUrl = getStorageUrl(fileName);
        }

        const { error: updateError } = await supabase
            .from("producto")
            .update({
                Nombre: nombre,
                Descripcion: descripcion,
                CategoriaID: categoria,
                Ingredientes: ingredientes,
                Imagen: imagenUrl
            })
            .eq("ProductoID", id);

        if (updateError) throw new Error(updateError.message);

        // Si cambió el precio, insertamos nuevo registro en la tabla histórica
        if (precioRaw) {
            await supabase.from("precios").insert({
                ProductoID: id,
                FechaActivacion: new Date().toISOString(),
                Precio: parseFloat(precioRaw.toString()),
                UsuarioCreacion: 1
            });
        }

        revalidatePath("/admin/menu");
        return { success: true };

    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// ---------------------------------------------------------
// 3. CAMBIAR ESTADO
// ---------------------------------------------------------
export async function toggleEstadoProducto(productoID: number, nuevoEstado: boolean) {
  if (!(await verificarPermisosAdminOLider())) {
      return { success: false, message: "No tienes permisos." };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("producto")
    .update({ activo: nuevoEstado }) 
    .eq("ProductoID", productoID);

  if (error) {
      console.error("Error Toggle:", error.message);
      return { success: false, message: error.message };
  }

  revalidatePath("/admin/menu");
  return { success: true };
}
"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server"; 
import { revalidatePath } from "next/cache";

// --- CONSTANTES DE ROLES ---
// 1 = Admin, 5 = Lider
const ID_ADMIN = 1;
const ID_LIDER = 5;

// --- FUNCIÓN DE SEGURIDAD SECUENCIAL (A PRUEBA DE FALLOS) ---
async function verificarPermisosAdminOLider() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.log("🔒 PERMISOS: No hay sesión activa.");
        return false;
    }

    const supabaseAdmin = createAdminClient();

    // PASO 1: Buscar en tabla 'usuario' (Usando 'Activo' con Mayúscula)
    const { data: usuarioDB, error: errorUsuario } = await supabaseAdmin
        .from('usuario') 
        .select('UsuarioID, EmpleadoID, Activo') 
        .eq('auth_user_id', user.id) 
        .maybeSingle();

    if (errorUsuario || !usuarioDB) {
        console.error("❌ Error buscando usuario:", errorUsuario?.message);
        return false;
    }

    if (!usuarioDB.Activo) { // Mayúscula según tu esquema
        console.log("⛔ Usuario inactivo en BD.");
        return false;
    }

    if (!usuarioDB.EmpleadoID) {
        console.log("⚠️ Usuario sin EmpleadoID vinculado.");
        return false;
    }

    // PASO 2: Buscar en tabla 'empleado' usando el ID obtenido (Usando 'Activo' con Mayúscula)
    const { data: empleadoDB, error: errorEmpleado } = await supabaseAdmin
        .from('empleado')
        .select('CargoID, Activo')
        .eq('EmpleadoID', usuarioDB.EmpleadoID)
        .single();

    if (errorEmpleado || !empleadoDB) {
        console.error("❌ Error buscando empleado:", errorEmpleado?.message);
        return false;
    }

    if (!empleadoDB.Activo) { // Mayúscula según tu esquema
        console.log("⛔ Empleado inactivo.");
        return false;
    }

    // PASO 3: Validar Cargo
    // Aquí ya tenemos el CargoID real traído desde la tabla empleado
    const tienePermiso = empleadoDB.CargoID === ID_ADMIN || empleadoDB.CargoID === ID_LIDER;

    if (!tienePermiso) {
        console.log(`⛔ ACCESO DENEGADO. CargoID: ${empleadoDB.CargoID}`);
    }

    return tienePermiso;
}

// Helper para URLs de imágenes
function getStorageUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/productos/${path}`;
}

// ---------------------------------------------------------
// 1. CREAR PRODUCTO
// ---------------------------------------------------------
export async function crearProducto(formData: FormData) {
    if (!(await verificarPermisosAdminOLider())) {
        return { success: false, message: "No tienes permisos de Administrador o Líder." };
    }

    const supabase = createAdminClient();
    
    const nombre = formData.get('nombre') as string;
    const precio = Number(formData.get('precio'));
    const categoria = Number(formData.get('categoria'));
    const descripcion = formData.get('descripcion') as string;
    const ingredientes = formData.get('ingredientes') as string;
    // Manejo básico de imagen si viene el archivo
    const imagenFile = formData.get("imagen") as File;
    let imagenUrl = null;

    try {
        // Subida de imagen (si existe)
        if (imagenFile && imagenFile.size > 0) {
            const fileExt = imagenFile.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('productos').upload(fileName, imagenFile);
            if (uploadError) throw new Error("Error subiendo imagen");
            imagenUrl = getStorageUrl(fileName);
        }

        // INSERTAR PRODUCTO
        // ⚠️ OJO: Aquí usamos 'activo' (minúscula) porque así está en tu CREATE TABLE de producto
        const { data: nuevoProd, error: errorProd } = await supabase
            .from('producto')
            .insert({
                Nombre: nombre,
                Descripcion: descripcion,
                CategoriaID: categoria,
                Ingredientes: ingredientes,
                Imagen: imagenUrl,
                activo: true // <--- MINÚSCULA SEGÚN TU ESQUEMA
            })
            .select('ProductoID')
            .single();

        if (errorProd) throw new Error(errorProd.message);

        // INSERTAR PRECIO
        const { error: errorPrecio } = await supabase
            .from('precios')
            .insert({
                ProductoID: nuevoProd.ProductoID,
                Precio: precio,
                FechaActivacion: new Date().toISOString(),
                UsuarioCreacion: 1 
            });

        if (errorPrecio) console.error("Error guardando precio:", errorPrecio.message);

        revalidatePath('/admin/menu');
        revalidatePath('/products');
        return { success: true };

    } catch (error: any) {
        return { success: false, message: "Error al crear: " + error.message };
    }
}

// ---------------------------------------------------------
// 2. ACTUALIZAR PRODUCTO
// ---------------------------------------------------------
export async function actualizarProducto(formData: FormData) {
    if (!(await verificarPermisosAdminOLider())) {
        return { success: false, message: "No tienes permisos." };
    }
    
    const supabase = createAdminClient();
    const id = Number(formData.get('id'));
    const nombre = formData.get('nombre') as string;
    const precioRaw = formData.get('precio'); 
    const categoria = Number(formData.get('categoria'));
    const descripcion = formData.get('descripcion') as string;
    const ingredientes = formData.get('ingredientes') as string;
    
    // Manejo de imagen
    const imagenFile = formData.get("imagen") as File;
    const imagenAnterior = formData.get("imagenAnterior") as string;
    let imagenUrl = imagenAnterior;

    try {
        if (imagenFile && imagenFile.size > 0) {
            const fileExt = imagenFile.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('productos').upload(fileName, imagenFile);
            if (uploadError) throw new Error("Error actualizando imagen");
            imagenUrl = getStorageUrl(fileName);
        }

        const { error: updateError } = await supabase
            .from('producto')
            .update({
                Nombre: nombre,
                Descripcion: descripcion,
                CategoriaID: categoria,
                Ingredientes: ingredientes,
                Imagen: imagenUrl
            })
            .eq('ProductoID', id);

        if (updateError) throw new Error(updateError.message);

        if (precioRaw && Number(precioRaw) > 0) {
             const { error: errorPrecio } = await supabase
            .from('precios')
            .insert({
                ProductoID: id,
                Precio: Number(precioRaw),
                FechaActivacion: new Date().toISOString(),
                UsuarioCreacion: 1 
            });
            if (errorPrecio) throw new Error(errorPrecio.message);
        }

        revalidatePath('/admin/menu');
        revalidatePath('/products');
        return { success: true };

    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// ---------------------------------------------------------
// 3. CAMBIAR ESTADO (Activar/Desactivar)
// ---------------------------------------------------------
export async function toggleEstadoProducto(productoID: number, nuevoEstado: boolean) {
  if (!(await verificarPermisosAdminOLider())) {
      return { success: false, message: "No tienes permisos." };
  }

  const supabase = createAdminClient();

  // ⚠️ OJO: 'activo' (Minúscula) según tu esquema de la tabla producto
  const { error } = await supabase
    .from("producto")
    .update({ activo: nuevoEstado }) 
    .eq("ProductoID", productoID);

  if (error) {
      console.error("Error Toggle:", error.message);
      return { success: false, message: error.message };
  }

  revalidatePath("/admin/menu");
  revalidatePath("/products");
  return { success: true };
}
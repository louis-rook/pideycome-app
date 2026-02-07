"use server";

// ============================================================================
// IMPORTACIONES
// ============================================================================
import { createAdminClient } from "@/utils/supabase/admin"; // Cliente con permisos totales (Superusuario)
import { createClient } from "@/utils/supabase/server"; // Cliente para verificar sesión del usuario
import { revalidatePath } from "next/cache";

// --- CONSTANTES DE ROLES ---
// IDs fijos en base de datos: 1 = Admin, 5 = Líder
const ID_ADMIN = 1;
const ID_LIDER = 5;

// ============================================================================
// FUNCIÓN DE SEGURIDAD (Middleware Manual)
// ============================================================================
/**
 * Verifica paso a paso si el usuario actual tiene permisos para gestionar productos.
 * Valida: Sesión activa -> Usuario en BD -> Empleado vinculado -> Cargo permitido.
 */
async function verificarPermisosAdminOLider() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.log("🔒 PERMISOS: No hay sesión activa.");
        return false;
    }

    const supabaseAdmin = createAdminClient();

    // PASO 1: Buscar usuario en nuestra tabla personalizada 'usuario'
    // Se valida que el campo 'Activo' sea true
    const { data: usuarioDB, error: errorUsuario } = await supabaseAdmin
        .from('usuario') 
        .select('UsuarioID, EmpleadoID, Activo') 
        .eq('auth_user_id', user.id) 
        .maybeSingle();

    if (errorUsuario || !usuarioDB) {
        console.error("❌ Error buscando usuario:", errorUsuario?.message);
        return false;
    }

    if (!usuarioDB.Activo) { 
        console.log("⛔ Usuario inactivo en BD.");
        return false;
    }

    if (!usuarioDB.EmpleadoID) {
        console.log("⚠️ Usuario sin EmpleadoID vinculado.");
        return false;
    }

    // PASO 2: Buscar datos del empleado vinculado
    // Se valida que el empleado también esté 'Activo'
    const { data: empleadoDB, error: errorEmpleado } = await supabaseAdmin
        .from('empleado')
        .select('CargoID, Activo')
        .eq('EmpleadoID', usuarioDB.EmpleadoID)
        .single();

    if (errorEmpleado || !empleadoDB) {
        console.error("❌ Error buscando empleado:", errorEmpleado?.message);
        return false;
    }

    if (!empleadoDB.Activo) { 
        console.log("⛔ Empleado inactivo.");
        return false;
    }

    // PASO 3: Validar que el Cargo sea Admin o Líder
    const tienePermiso = empleadoDB.CargoID === ID_ADMIN || empleadoDB.CargoID === ID_LIDER;

    if (!tienePermiso) {
        console.log(`⛔ ACCESO DENEGADO. CargoID: ${empleadoDB.CargoID}`);
    }

    return tienePermiso;
}

// Helper para generar URLs públicas de imágenes en Supabase Storage
function getStorageUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/productos/${path}`;
}

// ============================================================================
// 1. CREAR PRODUCTO
// ============================================================================
export async function crearProducto(formData: FormData) {
    // 1. Verificación de seguridad previa
    if (!(await verificarPermisosAdminOLider())) {
        return { success: false, message: "No tienes permisos de Administrador o Líder." };
    }

    const supabase = createAdminClient();
    
    // 2. Extracción de datos del formulario
    const nombre = formData.get('nombre') as string;
    const precio = Number(formData.get('precio'));
    const categoria = Number(formData.get('categoria'));
    const descripcion = formData.get('descripcion') as string;
    const ingredientes = formData.get('ingredientes') as string;
    
    // Manejo de imagen
    const imagenFile = formData.get("imagen") as File;
    let imagenUrl = null;

    try {
        // 3. Subida de imagen al Storage (si existe archivo)
        if (imagenFile && imagenFile.size > 0) {
            const fileExt = imagenFile.name.split('.').pop();
            // Nombre único para evitar colisiones
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage.from('productos').upload(fileName, imagenFile);
            if (uploadError) throw new Error("Error subiendo imagen");
            
            imagenUrl = getStorageUrl(fileName);
        }

        // 4. INSERTAR PRODUCTO EN BASE DE DATOS
        const { data: nuevoProd, error: errorProd } = await supabase
            .from('producto')
            .insert({
                Nombre: nombre,
                Descripcion: descripcion,
                CategoriaID: categoria,
                Ingredientes: ingredientes,
                Imagen: imagenUrl,
                activo: true // El producto nace activo por defecto
            })
            .select('ProductoID')
            .single();

        if (errorProd) throw new Error(errorProd.message);

        // 5. INSERTAR PRECIO EN TABLA HISTÓRICA 'precios'
        const { error: errorPrecio } = await supabase
            .from('precios')
            .insert({
                ProductoID: nuevoProd.ProductoID,
                Precio: precio,
                FechaActivacion: new Date().toISOString(),
                UsuarioCreacion: 1 // TODO: Podría cambiarse por el ID real del usuario creador
            });

        if (errorPrecio) console.error("Error guardando precio:", errorPrecio.message);

        // 6. Actualizar caché para que el nuevo producto aparezca al instante
        revalidatePath('/admin/menu');
        revalidatePath('/products');
        
        return { success: true };

    } catch (error: any) {
        return { success: false, message: "Error al crear: " + error.message };
    }
}

// ============================================================================
// 2. ACTUALIZAR PRODUCTO
// ============================================================================
export async function actualizarProducto(formData: FormData) {
    // 1. Verificación de seguridad
    if (!(await verificarPermisosAdminOLider())) {
        return { success: false, message: "No tienes permisos." };
    }
    
    const supabase = createAdminClient();
    
    // 2. Extracción de datos
    const id = Number(formData.get('id'));
    const nombre = formData.get('nombre') as string;
    const precioRaw = formData.get('precio'); 
    const categoria = Number(formData.get('categoria'));
    const descripcion = formData.get('descripcion') as string;
    const ingredientes = formData.get('ingredientes') as string;
    
    // Manejo inteligente de imagen: Si no suben nueva, mantenemos la anterior
    const imagenFile = formData.get("imagen") as File;
    const imagenAnterior = formData.get("imagenAnterior") as string;
    let imagenUrl = imagenAnterior;

    try {
        // 3. Si hay nueva imagen, subirla y reemplazar URL
        if (imagenFile && imagenFile.size > 0) {
            const fileExt = imagenFile.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage.from('productos').upload(fileName, imagenFile);
            if (uploadError) throw new Error("Error actualizando imagen");
            
            imagenUrl = getStorageUrl(fileName);
        }

        // 4. ACTUALIZAR DATOS DEL PRODUCTO
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

        // 5. GESTIÓN DE PRECIOS (Histórico)
        // Solo insertamos un nuevo registro en 'precios' si el precio cambió
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

// ============================================================================
// 3. CAMBIAR ESTADO (Activar/Desactivar)
// ============================================================================
export async function toggleEstadoProducto(productoID: number, nuevoEstado: boolean) {
  // 1. Verificación de seguridad
  if (!(await verificarPermisosAdminOLider())) {
      return { success: false, message: "No tienes permisos." };
  }

  const supabase = createAdminClient();

  // 2. Actualización simple del campo 'activo'
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
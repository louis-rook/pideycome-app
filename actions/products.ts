"use server";

// ============================================================================
// IMPORTACIONES
// ============================================================================
import { createAdminClient } from "@/utils/supabase/admin"; // Cliente con permisos totales
import { createClient } from "@/utils/supabase/server"; // Cliente para identificar al usuario actual (Respeta RLS)
import { revalidatePath } from "next/cache";

// --- CONSTANTES DE ROLES ---
const ID_ADMIN = 1;
const ID_LIDER = 5;

// ============================================================================
// FUNCIÓN DE SEGURIDAD (Autorización)
// ============================================================================
/**
 * Verifica si el usuario logueado actualmente tiene rol de Administrador o Líder.
 * * SEGURIDAD: Previene ataques de escalada de privilegios validando contra la BD
 * y comprobando que tanto el usuario como el empleado estén activos.
 */
async function verificarPermisosAdminOLider(): Promise<boolean> {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();

    if (!user) {
        console.warn("🔒 PERMISOS: Intento de acceso sin sesión activa.");
        return false;
    }

    const supabaseAdmin = createAdminClient();

    // PASO 1: Buscar usuario y estado
    const { data: usuarioDB, error: errorUsuario } = await supabaseAdmin
        .from('usuario') 
        .select('UsuarioID, EmpleadoID, Activo') 
        .eq('auth_user_id', user.id) 
        .maybeSingle();

    if (errorUsuario || !usuarioDB || !usuarioDB.Activo || !usuarioDB.EmpleadoID) {
        console.warn("⛔ Usuario inválido, inactivo o sin empleado vinculado.");
        return false;
    }

    // PASO 2: Buscar empleado y su cargo
    const { data: empleadoDB, error: errorEmpleado } = await supabaseAdmin
        .from('empleado')
        .select('CargoID, Activo')
        .eq('EmpleadoID', usuarioDB.EmpleadoID)
        .single();

    if (errorEmpleado || !empleadoDB || !empleadoDB.Activo) {
        console.warn("⛔ Empleado inactivo o no encontrado.");
        return false;
    }

    // PASO 3: Validar Cargo exacto
    const tienePermiso = empleadoDB.CargoID === ID_ADMIN || empleadoDB.CargoID === ID_LIDER;

    if (!tienePermiso) {
        console.warn(`⛔ ACCESO DENEGADO. Intento de modificación por CargoID: ${empleadoDB.CargoID}`);
    }

    return tienePermiso;
}

// Helper para generar URLs públicas de Storage
function getStorageUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/productos/${path}`;
}

// ============================================================================
// 1. CREAR PRODUCTO
// ============================================================================
/**
 * Crea un nuevo producto en el catálogo, sube su imagen y registra el precio inicial.
 */
export async function crearProducto(formData: FormData) {
    // 1. Verificación de seguridad (Autorización)
    if (!(await verificarPermisosAdminOLider())) {
        return { success: false, message: "No tienes permisos de Administrador o Líder para realizar esta acción." };
    }

    // 2. Extracción y Validación estricta de datos
    const nombre = formData.get('nombre')?.toString().trim();
    const precio = Number(formData.get('precio'));
    const categoria = Number(formData.get('categoria'));
    const descripcion = formData.get('descripcion')?.toString().trim() || null;
    const ingredientes = formData.get('ingredientes')?.toString().trim() || null;

    if (!nombre || !precio || !categoria) {
        return { success: false, message: "El nombre, precio y categoría son obligatorios." };
    }

    // Inicializamos AMBOS clientes
    const supabaseAdmin = createAdminClient(); // Para Storage (saltar RLS restrictivo de archivos)
    const supabaseAuth = await createClient(); // Para BD (Auditoría: que el insert quede a nombre del Auth User)
    
    // Obtenemos el ID real del usuario para guardar en 'precios'
    const { data: { user } } = await supabaseAuth.auth.getUser();
    let usuarioIDReal = 1; // Fallback a Admin
    if (user) {
        const { data: u } = await supabaseAdmin.from('usuario').select('UsuarioID').eq('auth_user_id', user.id).single();
        if (u) usuarioIDReal = u.UsuarioID;
    }
    
    const imagenFile = formData.get("imagen") as File | null;
    let imagenUrl: string | null = null;

    try {
        // 3. Subida de imagen al Storage
        if (imagenFile && imagenFile.size > 0) {
            const fileExt = imagenFile.name.split('.').pop();
            // Generación de nombre único para evitar colisiones
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            const { error: uploadError } = await supabaseAdmin.storage.from('productos').upload(fileName, imagenFile);
            if (uploadError) throw new Error(`Error subiendo imagen: ${uploadError.message}`);
            
            imagenUrl = getStorageUrl(fileName);
        }

        // 4. INSERTAR PRODUCTO (Bajo el contexto del usuario autenticado)
        const { data: nuevoProd, error: errorProd } = await supabaseAuth
            .from('producto')
            .insert({
                Nombre: nombre,
                Descripcion: descripcion,
                CategoriaID: categoria,
                Ingredientes: ingredientes,
                Imagen: imagenUrl,
                activo: true
            })
            .select('ProductoID')
            .single();

        if (errorProd) throw new Error(`Error insertando producto: ${errorProd.message}`);

        // 5. INSERTAR PRECIO INICIAL (Vinculado al UsuarioCreacion para auditoría)
        const { error: errorPrecio } = await supabaseAuth
            .from('precios')
            .insert({
                ProductoID: nuevoProd.ProductoID,
                Precio: precio,
                FechaActivacion: new Date().toISOString(),
                UsuarioCreacion: usuarioIDReal 
            });

        if (errorPrecio) console.error("⚠️ Error guardando precio histórico:", errorPrecio.message);

        // RENDIMIENTO: Limpiar caché solo de las rutas afectadas
        revalidatePath('/admin/menu');
        revalidatePath('/products');
        
        return { success: true };

    } catch (error: unknown) {
        // TIPADO: Reemplazo de 'any' por 'unknown'
        const errorMessage = error instanceof Error ? error.message : "Ocurrió un error inesperado al crear";
        console.error("❌ Error en crearProducto:", errorMessage);
        return { success: false, message: errorMessage };
    }
}

// ============================================================================
// 2. ACTUALIZAR PRODUCTO
// ============================================================================
/**
 * Modifica los datos de un producto existente y gestiona su histórico de precios.
 */
export async function actualizarProducto(formData: FormData) {
    if (!(await verificarPermisosAdminOLider())) {
        return { success: false, message: "Acceso denegado. Permisos insuficientes." };
    }
    
    const id = Number(formData.get('id'));
    const nombre = formData.get('nombre')?.toString().trim();
    const precioRaw = formData.get('precio'); 
    const categoria = Number(formData.get('categoria'));
    const descripcion = formData.get('descripcion')?.toString().trim() || null;
    const ingredientes = formData.get('ingredientes')?.toString().trim() || null;

    if (!id || !nombre || !categoria) {
        return { success: false, message: "Datos incompletos para la actualización." };
    }

    const supabaseAdmin = createAdminClient(); 
    const supabaseAuth = await createClient(); 
    
    const { data: { user } } = await supabaseAuth.auth.getUser();
    let usuarioIDReal = 1;
    if (user) {
        const { data: u } = await supabaseAdmin.from('usuario').select('UsuarioID').eq('auth_user_id', user.id).single();
        if (u) usuarioIDReal = u.UsuarioID;
    }
    
    const imagenFile = formData.get("imagen") as File | null;
    const imagenAnterior = formData.get("imagenAnterior")?.toString() || null;
    let imagenUrl = imagenAnterior;

    try {
        // 3. Subida de nueva imagen (si aplica)
        if (imagenFile && imagenFile.size > 0) {
            const fileExt = imagenFile.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            const { error: uploadError } = await supabaseAdmin.storage.from('productos').upload(fileName, imagenFile);
            if (uploadError) throw new Error("Error actualizando la imagen en el servidor.");
            
            imagenUrl = getStorageUrl(fileName);
        }

        // 4. ACTUALIZAR DATOS MAESTROS DEL PRODUCTO
        const { error: updateError } = await supabaseAuth
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

        // 5. GESTIÓN DE PRECIOS (Upsert)
        // Solo inserta un nuevo precio si es diferente o en diferente fecha
        if (precioRaw && Number(precioRaw) > 0) {
             const { error: errorPrecio } = await supabaseAuth
            .from('precios')
            .upsert({ 
                ProductoID: id,
                Precio: Number(precioRaw),
                FechaActivacion: new Date().toISOString(),
                UsuarioCreacion: usuarioIDReal
            }, {
                onConflict: 'ProductoID, FechaActivacion, Precio', 
                ignoreDuplicates: true
            });

            if (errorPrecio) console.warn("⚠️ Aviso al guardar historial de precio:", errorPrecio.message);
        }

        revalidatePath('/admin/menu');
        revalidatePath('/products');
        return { success: true };

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido al actualizar";
        console.error("❌ Error en actualizarProducto:", errorMessage);
        return { success: false, message: errorMessage };
    }
}

// ============================================================================
// 3. CAMBIAR ESTADO (Activar/Desactivar)
// ============================================================================
/**
 * Habilita o deshabilita un producto para que se muestre (o no) en el catálogo público.
 */
export async function toggleEstadoProducto(productoID: number, nuevoEstado: boolean) {
  if (!(await verificarPermisosAdminOLider())) {
      return { success: false, message: "Acceso denegado. Permisos insuficientes." };
  }

  const supabaseAuth = await createClient(); 

  const { error } = await supabaseAuth
    .from("producto")
    .update({ activo: nuevoEstado }) 
    .eq("ProductoID", productoID);

  if (error) {
      console.error("❌ Error en toggleEstadoProducto:", error.message);
      return { success: false, message: "Error al cambiar el estado del producto." };
  }

  revalidatePath("/admin/menu");
  revalidatePath("/products");
  return { success: true };
}
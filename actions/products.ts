"use server";

// ============================================================================
// IMPORTACIONES
// ============================================================================
import { createAdminClient } from "@/utils/supabase/admin"; // Cliente con permisos totales
import { createClient } from "@/utils/supabase/server"; // Cliente para identificar al usuario actual
import { revalidatePath } from "next/cache";

// --- CONSTANTES DE ROLES ---
const ID_ADMIN = 1;
const ID_LIDER = 5;

// ============================================================================
// FUNCIÓN DE SEGURIDAD (INTACTA)
// ============================================================================
async function verificarPermisosAdminOLider() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.log("🔒 PERMISOS: No hay sesión activa.");
        return false;
    }

    const supabaseAdmin = createAdminClient();

    // PASO 1: Buscar usuario
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

    // PASO 2: Buscar empleado
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

    // PASO 3: Validar Cargo
    const tienePermiso = empleadoDB.CargoID === ID_ADMIN || empleadoDB.CargoID === ID_LIDER;

    if (!tienePermiso) {
        console.log(`⛔ ACCESO DENEGADO. CargoID: ${empleadoDB.CargoID}`);
    }

    return tienePermiso;
}

// Helper para generar URLs
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

    // --- CAMBIO 1: Inicializamos AMBOS clientes ---
    const supabaseAdmin = createAdminClient(); // Para Storage (evita líos de permisos)
    const supabaseAuth = await createClient(); // Para Base de Datos (Para que salga el Log)
    
    // Obtenemos el ID real del usuario para guardar en 'precios'
    const { data: { user } } = await supabaseAuth.auth.getUser();
    let usuarioIDReal = 1; // Default Admin
    if (user) {
        const { data: u } = await supabaseAdmin.from('usuario').select('UsuarioID').eq('auth_user_id', user.id).single();
        if (u) usuarioIDReal = u.UsuarioID;
    }
    
    // 2. Extracción de datos del formulario (IGUAL)
    const nombre = formData.get('nombre') as string;
    const precio = Number(formData.get('precio'));
    const categoria = Number(formData.get('categoria'));
    const descripcion = formData.get('descripcion') as string;
    const ingredientes = formData.get('ingredientes') as string;
    
    // Manejo de imagen
    const imagenFile = formData.get("imagen") as File;
    let imagenUrl = null;

    try {
        // 3. Subida de imagen al Storage (Usamos Admin para asegurar éxito)
        if (imagenFile && imagenFile.size > 0) {
            const fileExt = imagenFile.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            const { error: uploadError } = await supabaseAdmin.storage.from('productos').upload(fileName, imagenFile);
            if (uploadError) throw new Error("Error subiendo imagen");
            
            imagenUrl = getStorageUrl(fileName);
        }

        // 4. INSERTAR PRODUCTO (Usamos supabaseAuth para el Log)
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

        if (errorProd) throw new Error(errorProd.message);

        // 5. INSERTAR PRECIO (Usamos supabaseAuth y el ID real)
        const { error: errorPrecio } = await supabaseAuth
            .from('precios')
            .insert({
                ProductoID: nuevoProd.ProductoID,
                Precio: precio,
                FechaActivacion: new Date().toISOString(),
                UsuarioCreacion: usuarioIDReal // Usamos el ID recuperado
            });

        if (errorPrecio) console.error("Error guardando precio:", errorPrecio.message);

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
    
    // --- CAMBIO 2: Inicializamos AMBOS clientes ---
    const supabaseAdmin = createAdminClient(); // Para Storage
    const supabaseAuth = await createClient(); // Para BD (Log)
    
    // Obtenemos el ID real del usuario
    const { data: { user } } = await supabaseAuth.auth.getUser();
    let usuarioIDReal = 1;
    if (user) {
        const { data: u } = await supabaseAdmin.from('usuario').select('UsuarioID').eq('auth_user_id', user.id).single();
        if (u) usuarioIDReal = u.UsuarioID;
    }
    
    // 2. Extracción de datos
    const id = Number(formData.get('id'));
    const nombre = formData.get('nombre') as string;
    const precioRaw = formData.get('precio'); 
    const categoria = Number(formData.get('categoria'));
    const descripcion = formData.get('descripcion') as string;
    const ingredientes = formData.get('ingredientes') as string;
    
    const imagenFile = formData.get("imagen") as File;
    const imagenAnterior = formData.get("imagenAnterior") as string;
    let imagenUrl = imagenAnterior;

    try {
        // 3. Si hay nueva imagen (Usamos Admin)
        if (imagenFile && imagenFile.size > 0) {
            const fileExt = imagenFile.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            const { error: uploadError } = await supabaseAdmin.storage.from('productos').upload(fileName, imagenFile);
            if (uploadError) throw new Error("Error actualizando imagen");
            
            imagenUrl = getStorageUrl(fileName);
        }

        // 4. ACTUALIZAR DATOS DEL PRODUCTO (Usamos supabaseAuth para el Log)
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

        // 5. GESTIÓN DE PRECIOS (Usamos UPSERT para evitar error de duplicados)
        if (precioRaw && Number(precioRaw) > 0) {
             const { error: errorPrecio } = await supabaseAuth
            .from('precios')
            .upsert({ // Cambiamos insert por upsert
                ProductoID: id,
                Precio: Number(precioRaw),
                FechaActivacion: new Date().toISOString(),
                UsuarioCreacion: usuarioIDReal // ID Real
            }, {
                onConflict: 'ProductoID, FechaActivacion, Precio', // Ignora si es idéntico
                ignoreDuplicates: true
            });

            if (errorPrecio) {
                console.warn("Aviso al guardar precio:", errorPrecio.message);
            }
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

  // Usamos Auth para que el Trigger capture el usuario
  const supabaseAuth = await createClient(); 

  // 2. Actualización simple del campo 'activo'
  const { error } = await supabaseAuth
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
"use server";

// ============================================================================
// IMPORTACIONES
// ============================================================================
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server"; 
import { revalidatePath } from "next/cache";
import { WelcomeEmail } from '@/components/emails/WelcomeEmail';
import * as React from 'react';
import { render } from '@react-email/render';
import nodemailer from 'nodemailer';

// --- CONFIGURACIÓN TRANSPORTE (Envío de Emails) ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
    }
});

// ==========================================
// 🔒 SEGURIDAD: VERIFICACIÓN ROBUSTA
// ==========================================
const ID_ADMIN = 1;

/**
 * Middleware de seguridad manual. Verifica si el usuario actual
 * tiene permisos de Administrador antes de ejecutar acciones sensibles.
 */
async function verificarPermisoAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    const supabaseAdmin = createAdminClient();

    // 1. Buscar Usuario -> Empleado -> Cargo
    // Usamos la relación anidada para evitar errores de columnas y obtener el rol real
    const { data: usuarioDB } = await supabaseAdmin
        .from('usuario')
        .select(`
            UsuarioID, 
            Activo,
            empleado (
                CargoID,
                Activo,
                cargo ( NombreCargo )
            )
        `)
        .eq('auth_user_id', user.id)
        .maybeSingle();

    if (!usuarioDB || !usuarioDB.Activo) return false;

    // @ts-ignore: Acceso seguro a relaciones anidadas
    const emp = Array.isArray(usuarioDB.empleado) ? usuarioDB.empleado[0] : usuarioDB.empleado;
    if (!emp || !emp.Activo) return false;

    // @ts-ignore
    const cargoRel = emp.cargo;
    const cargoObj = Array.isArray(cargoRel) ? cargoRel[0] : cargoRel;
    const cargoNombre = cargoObj?.NombreCargo?.toLowerCase() || '';

    // Validar ID Admin (1) o que el nombre del cargo contenga 'admin'
    return emp.CargoID === ID_ADMIN || cargoNombre.includes('admin');
}

/**
 * Genera un nombre de usuario único (ej: jperez) basado en nombre y apellido.
 * Si ya existe, le agrega números aleatorios.
 */
async function generarUsername(supabase: any, nombres: string, apellidos: string) {
    const limpiar = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const nombreLimpio = limpiar(nombres || "");
    const apellidoLimpio = limpiar(apellidos || "");
    
    // Fallback si no hay nombres
    if (!nombreLimpio || !apellidoLimpio) return `user${Math.floor(Math.random() * 10000)}`;
    
    // Formato: Primera letra nombre + Primer apellido (jperez)
    const username = `${nombreLimpio.charAt(0)}${apellidoLimpio.split(/\s+/)[0]}`;
    
    // Verificar colisión en DB
    const { count } = await supabase.from("usuario").select("*", { count: 'exact', head: true }).eq("Username", username);
    return (count && count > 0) ? `${username}${Math.floor(Math.random() * 1000)}` : username;
}

// ==========================================
// 1. CREAR PERSONA (Tercero / Empleado / Usuario)
// ==========================================
export async function crearPersona(formData: FormData) {
    // Paso 1: Verificar permisos
    if (!(await verificarPermisoAdmin())) {
        return { success: false, message: "⛔ Acceso denegado. Solo administradores." };
    }

    const supabase = createAdminClient();

    // Paso 2: Extraer datos del formulario
    const nombres = formData.get("nombres") as string;
    const apellidos = formData.get("apellidos") as string;
    const tipoDoc = formData.get("tipoDoc") as string;
    const numDoc = formData.get("numDoc") as string;
    const telefono = formData.get("telefono") as string;
    const direccion = formData.get("direccion") as string;
    
    // Lógica Empleado
    const esEmpleado = formData.get("esEmpleado") === "on"; // El checkbox manda "on"
    const email = formData.get("email") as string;
    const cargoID = formData.get("cargoID") ? Number(formData.get("cargoID")) : null;
    const password = formData.get("password") as string;

    try {
        // A. TERCERO (Upsert lógico: Si existe por teléfono, actualiza; si no, crea)
        let terceroID;
        const { data: terc } = await supabase.from("tercero").select("TerceroID").eq("Telefono", telefono).maybeSingle();

        const datosTercero = {
            Nombres: nombres?.toUpperCase(), 
            Apellidos: apellidos?.toUpperCase(), 
            Email: email?.toLowerCase(), 
            Telefono: telefono,
            TipoDocumento: tipoDoc, 
            NumeroDocumento: numDoc, 
            Direccion: direccion
        };

        if (terc) {
            terceroID = terc.TerceroID;
            await supabase.from("tercero").update(datosTercero).eq("TerceroID", terceroID);
        } else {
            const { data: nuevo, error } = await supabase.from("tercero").insert({ ...datosTercero, Activo: true }).select("TerceroID").single();
            if (error) throw new Error("Error Tercero: " + error.message);
            terceroID = nuevo.TerceroID;
        }

        // B. CLIENTE (Siempre se crea para que pueda comprar)
        const { data: cl } = await supabase.from("cliente").select("ClienteID").eq("TerceroID", terceroID).maybeSingle();
        if (!cl) await supabase.from("cliente").insert({ TerceroID: terceroID, Activo: true });

        // C. EMPLEADO (Solo si se marcó el checkbox)
        if (esEmpleado && cargoID) {
            let empleadoID;
            const { data: emp } = await supabase.from("empleado").select("EmpleadoID").eq("TerceroID", terceroID).maybeSingle();

            if (emp) {
                // Si ya era empleado, actualizamos cargo y reactivamos
                await supabase.from("empleado").update({ CargoID: cargoID, Activo: true }).eq("EmpleadoID", emp.EmpleadoID);
                empleadoID = emp.EmpleadoID;
            } else {
                // Si es nuevo empleado, creamos registro
                const { data: nuevoEmp, error } = await supabase
                    .from("empleado").insert({ TerceroID: terceroID, CargoID: cargoID, Activo: true }).select("EmpleadoID").single();
                if (error) throw new Error("Error Empleado: " + error.message);
                empleadoID = nuevoEmp.EmpleadoID;
            }

            // D. USUARIO DE SISTEMA (Solo si tiene email y password)
            if (email && password) {
                const { data: usu } = await supabase.from("usuario").select("UsuarioID").eq("EmpleadoID", empleadoID).maybeSingle();
                
                if (!usu) {
                    // 1. Crear usuario en Supabase Auth (Sistema de login)
                    const { data: auth, error: authErr } = await supabase.auth.admin.createUser({
                        email: email, password: password, email_confirm: true, user_metadata: { nombre: `${nombres} ${apellidos}` }
                    });
                    if (authErr) throw new Error("Error Auth: " + authErr.message);

                    // 2. Crear registro en tabla 'usuario' vinculado al Auth
                    const username = await generarUsername(supabase, nombres, apellidos);
                    await supabase.from("usuario").insert({
                        EmpleadoID: empleadoID, auth_user_id: auth.user.id, Username: username, Activo: true, debecambiarpassword: true
                    });

                    // 3. Enviar correo de bienvenida
                    try {
                        const emailHtml = await render(
                            React.createElement(WelcomeEmail, { nombre: nombres, email: email, passwordNot: password })
                        );
                        await transporter.sendMail({
                            from: `"Pide y Come" <${process.env.SMTP_EMAIL}>`,
                            to: email, subject: 'Bienvenido - Credenciales', html: emailHtml
                        });
                    } catch (e) { console.error("Error Email:", e); }
                }
            }
        }

        revalidatePath("/admin/personal");
        return { success: true };

    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// ==========================================
// 2. ACTUALIZAR PERSONA
// ==========================================
export async function actualizarPersona(formData: FormData) {
    if (!(await verificarPermisoAdmin())) {
        return { success: false, message: "⛔ Acceso denegado." };
    }

    const supabase = createAdminClient();
    
    // Extracción (mismas claves que el create)
    const terceroID = Number(formData.get("terceroID"));
    const nombres = formData.get("nombres") as string;
    const apellidos = formData.get("apellidos") as string;
    const email = formData.get("email") as string;
    
    const esEmpleado = formData.get("esEmpleado") === "on";
    const cargoID = formData.get("cargoID") ? Number(formData.get("cargoID")) : null;
    const password = formData.get("password") as string;

    try {
        // Actualizar datos básicos (Tercero)
        await supabase.from("tercero").update({
            Nombres: nombres?.toUpperCase(), 
            Apellidos: apellidos?.toUpperCase(), 
            Email: email?.toLowerCase(),
            Telefono: formData.get("telefono"), 
            NumeroDocumento: formData.get("numDoc"), 
            Direccion: formData.get("direccion")
        }).eq("TerceroID", terceroID);

        // LÓGICA DE EMPLEADO (Promoción o Actualización)
        if (esEmpleado) {
             if(!cargoID) throw new Error("Debe seleccionar un cargo");

            let empleadoID;
            const { data: emp } = await supabase.from("empleado").select("EmpleadoID").eq("TerceroID", terceroID).maybeSingle();

            if (emp) {
                // Actualizar cargo existente
                await supabase.from("empleado").update({ CargoID: cargoID, Activo: true }).eq("EmpleadoID", emp.EmpleadoID);
                empleadoID = emp.EmpleadoID;
            } else {
                // Promover a empleado (Nuevo registro)
                const { data: nuevoEmp, error } = await supabase
                    .from("empleado").insert({ TerceroID: terceroID, CargoID: cargoID, Activo: true }).select("EmpleadoID").single();
                if (error) throw new Error("Error creando empleado: " + error?.message);
                empleadoID = nuevoEmp.EmpleadoID;
            }

            // GESTIÓN DE USUARIO (Acceso al sistema)
            if (email) {
                const { data: usu } = await supabase.from("usuario").select("UsuarioID, auth_user_id").eq("EmpleadoID", empleadoID).maybeSingle();

                if (!usu && password) {
                    // Crear Auth si no existe
                    const { data: auth, error: authErr } = await supabase.auth.admin.createUser({
                        email, password, email_confirm: true, user_metadata: { nombre: `${nombres} ${apellidos}` }
                    });
                    if (!authErr) {
                         const username = await generarUsername(supabase, nombres, apellidos);
                         await supabase.from("usuario").insert({
                            EmpleadoID: empleadoID, auth_user_id: auth.user.id, Username: username, Activo: true, debecambiarpassword: true
                         });
                    }
                } else if (usu) {
                    // Si ya existe, reactivamos y opcionalmente cambiamos contraseña
                    await supabase.from("usuario").update({ Activo: true }).eq("UsuarioID", usu.UsuarioID);
                    if (usu.auth_user_id) {
                        const updates: any = { ban_duration: "0" }; // Quitamos baneo
                        if (password) updates.password = password;
                        await supabase.auth.admin.updateUserById(usu.auth_user_id, updates);
                    }
                }
            }
        } else {
            // DEGRADACIÓN (Empleado -> Cliente)
            // Si desmarcan "Es Empleado", desactivamos su rol y bloqueamos su usuario
            const { data: emp } = await supabase.from("empleado").select("EmpleadoID, usuario(auth_user_id)").eq("TerceroID", terceroID).maybeSingle();
            if (emp) {
                await supabase.from("empleado").update({ Activo: false }).eq("EmpleadoID", emp.EmpleadoID);
                if (emp.usuario) {
                    // @ts-ignore
                    const usuarios = Array.isArray(emp.usuario) ? emp.usuario : [emp.usuario];
                    for(const u of usuarios) {
                         if (u.auth_user_id) await supabase.auth.admin.updateUserById(u.auth_user_id, { ban_duration: "876000h" }); // Ban de 100 años
                         await supabase.from("usuario").update({ Activo: false }).eq("EmpleadoID", emp.EmpleadoID);
                    }
                }
            }
        }

        revalidatePath("/admin/personal");
        return { success: true };

    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// ==========================================
// 3. TOGGLE ESTADO (Activar/Desactivar rápido)
// ==========================================
export async function toggleEstadoEmpleado(terceroID: number, nuevoEstado: boolean) {
    if (!(await verificarPermisoAdmin())) {
        return { success: false, message: "⛔ Acceso denegado." };
    }

    const supabase = createAdminClient();
    const { data: emp } = await supabase.from("empleado").select("EmpleadoID, usuario(auth_user_id)").eq("TerceroID", terceroID).maybeSingle();

    if (emp) {
        // Actualizamos estado en tabla empleado
        await supabase.from("empleado").update({ Activo: nuevoEstado }).eq("EmpleadoID", emp.EmpleadoID);
        
        // Bloqueamos/Desbloqueamos usuario de sistema
        if (emp.usuario) {
             // @ts-ignore
             const usuarios = Array.isArray(emp.usuario) ? emp.usuario : [emp.usuario];
             for(const u of usuarios) {
                const authId = u.auth_user_id;
                // Si desactivamos, baneamos por 100 años ("876000h"). Si activamos, quitamos ban ("0")
                if (authId) await supabase.auth.admin.updateUserById(authId, { ban_duration: !nuevoEstado ? "876000h" : "0" });
                await supabase.from("usuario").update({ Activo: nuevoEstado }).eq("EmpleadoID", emp.EmpleadoID);
             }
        }
    }
    revalidatePath("/admin/personal");
    return { success: true };
}
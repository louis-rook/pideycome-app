"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server"; // <--- ÚNICO IMPORT AGREGADO (Necesario para verificar sesión)
import { revalidatePath } from "next/cache";
//import { Resend } from 'resend';
import { WelcomeEmail } from '@/components/emails/WelcomeEmail';
import * as React from 'react';
import { render } from '@react-email/render';
import nodemailer from 'nodemailer';

// --- CONFIGURACIÓN DEL TRANSPORTE (GMAIL) ---

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_EMAIL,     // Tu correo de Gmail
        pass: process.env.SMTP_PASSWORD   // La contraseña de aplicación
    }
});

//const resend = new Resend(process.env.RESEND_API_KEY);

// ==========================================
// 🔒 SEGURIDAD: VERIFICACIÓN DE ADMIN
// ==========================================
const ID_ADMIN = 1;

async function verificarPermisoAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    const supabaseAdmin = createAdminClient();

    // 1. Buscar Usuario
    const { data: usuarioDB } = await supabaseAdmin
        .from('usuario')
        .select('EmpleadoID, Activo')
        .eq('auth_user_id', user.id)
        .maybeSingle();

    if (!usuarioDB || !usuarioDB.Activo || !usuarioDB.EmpleadoID) return false;

    // 2. Buscar Empleado y Cargo
    const { data: empleadoDB } = await supabaseAdmin
        .from('empleado')
        .select('CargoID, Activo')
        .eq('EmpleadoID', usuarioDB.EmpleadoID)
        .single();

    if (!empleadoDB || !empleadoDB.Activo) return false;

    // 3. Validar ID Admin
    return empleadoDB.CargoID === ID_ADMIN;
}

// ==========================================
// HELPER: Generador de Username
// ==========================================
async function generarUsername(supabase: any, nombres: string, apellidos: string) {
    const limpiar = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const nombreLimpio = limpiar(nombres || "");
    const apellidoLimpio = limpiar(apellidos || "");

    if (!nombreLimpio || !apellidoLimpio) return `user${Math.floor(Math.random() * 10000)}`;

    const partesApellido = apellidoLimpio.split(/\s+/);
    const primerApellido = partesApellido[0];
    const primeraLetraNombre = nombreLimpio.charAt(0);
    let username = `${primeraLetraNombre}${primerApellido}`;

    // Validar duplicados
    const { count } = await supabase.from("usuario").select("*", { count: 'exact', head: true }).eq("Username", username);
    if (count && count > 0) {
        username = `${username}${Math.floor(Math.random() * 1000)}`;
    }
    return username;
}

// ==========================================
// 1. CREAR PERSONA
// ==========================================
export async function crearPersona(formData: FormData) {
    // [SEGURIDAD AGREGADA]
    if (!(await verificarPermisoAdmin())) {
        return { success: false, message: "⛔ Acceso denegado. Solo administradores." };
    }

    const supabase = createAdminClient();

    const nombres = formData.get("nombres") as string;
    const apellidos = formData.get("apellidos") as string;
    const email = formData.get("email") as string;
    const telefono = formData.get("telefono") as string;
    const esEmpleado = formData.get("esEmpleado") === "on";
    const cargoID = formData.get("cargoID") ? parseInt(formData.get("cargoID") as string) : null;
    const password = formData.get("password") as string;

    try {
        // A. TERCERO
        let terceroID;
        const { data: terc } = await supabase.from("tercero").select("TerceroID").eq("Telefono", telefono).maybeSingle();

        const datosTercero = {
            Nombres: nombres, Apellidos: apellidos, Email: email, Telefono: telefono,
            TipoDocumento: formData.get("tipoDoc"), NumeroDocumento: formData.get("numDoc"), Direccion: formData.get("direccion")
        };

        if (terc) {
            terceroID = terc.TerceroID;
            await supabase.from("tercero").update(datosTercero).eq("TerceroID", terceroID);
        } else {
            const { data: nuevo, error } = await supabase.from("tercero").insert({ ...datosTercero, Activo: true }).select("TerceroID").single();
            if (error) throw new Error(error.message);
            terceroID = nuevo.TerceroID;
        }

        // B. CLIENTE
        const { data: cl } = await supabase.from("cliente").select("ClienteID").eq("TerceroID", terceroID).maybeSingle();
        if (!cl) await supabase.from("cliente").insert({ TerceroID: terceroID, Activo: true });

        // C. EMPLEADO
        if (esEmpleado && cargoID) {
            let empleadoID;
            const { data: emp } = await supabase.from("empleado").select("EmpleadoID").eq("TerceroID", terceroID).maybeSingle();

            if (emp) {
                await supabase.from("empleado").update({ CargoID: cargoID, Activo: true }).eq("EmpleadoID", emp.EmpleadoID);
                empleadoID = emp.EmpleadoID;
            } else {
                const { data: nuevoEmp, error } = await supabase
                    .from("empleado").insert({ TerceroID: terceroID, CargoID: cargoID, Activo: true }).select("EmpleadoID").single();
                if (error) throw new Error(error.message);
                empleadoID = nuevoEmp.EmpleadoID;
            }

            // D. USUARIO Y CORREO
            if (password && email) {
                const { data: usu } = await supabase.from("usuario").select("UsuarioID").eq("EmpleadoID", empleadoID).maybeSingle();
                if (!usu) {
                    const { data: auth, error: authErr } = await supabase.auth.admin.createUser({
                        email, password, email_confirm: true, user_metadata: { nombre: `${nombres} ${apellidos}` }
                    });
                    if (authErr) throw new Error(authErr.message);

                    const username = await generarUsername(supabase, nombres, apellidos);
                    await supabase.from("usuario").insert({
                        EmpleadoID: empleadoID, auth_user_id: auth.user.id, Username: username, Activo: true, debecambiarpassword: true
                    });



                    /* // --- ENVIAR EMAIL (VERSIÓN CORREGIDA CON RENDER) ---
                     try {
                         // 1. Convertimos el componente React a HTML puro
                         const emailHtml = await render(
                             React.createElement(WelcomeEmail, {
                                 nombre: nombres,
                                 email: email,
                                 passwordNot: password
                             })
                         );
 
                         // 2. Enviamos el HTML ya procesado
                         const respuestaResend = await resend.emails.send({
                             from: 'Pide y Come <onboarding@resend.dev>',
                             to: [email], // Asegúrate de usar TU MISMO CORREO registrado en Resend para pruebas
                             subject: 'Bienvenido - Tus Credenciales',
                             html: emailHtml // <--- USAMOS HTML EN LUGAR DE REACT
                         });
 
                         console.log("✅ CORREO ENVIADO. ID:", respuestaResend.data?.id);
 
                     } catch (e) {
                         console.error("❌ ERROR EMAIL:", e);
                         // No lanzamos error para no revertir la creación del usuario
                     }*/

                    // --- ENVIAR EMAIL CON NODEMAILER ---
                    try {
                        // 1. Renderizamos el HTML igual que antes
                        const emailHtml = await render(
                            React.createElement(WelcomeEmail, {
                                nombre: nombres,
                                email: email,
                                passwordNot: password
                            })
                        );

                        // 2. Enviamos usando Nodemailer (Gmail)
                        const info = await transporter.sendMail({
                            from: `"Pide y Come" <${process.env.SMTP_EMAIL}>`, // Remitente
                            to: email, // Destinatario REAL
                            subject: 'Bienvenido al Sistema - Credenciales de Acceso',
                            html: emailHtml
                        });

                        console.log("✅ CORREO ENVIADO (GMAIL). ID:", info.messageId);

                    } catch (e) {
                        console.error("❌ ERROR EMAIL NODEMAILER:", e);
                        // No lanzamos error para no revertir la creación
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
// 2. ACTUALIZAR PERSONA
// ==========================================
export async function actualizarPersona(formData: FormData) {
    // [SEGURIDAD AGREGADA]
    if (!(await verificarPermisoAdmin())) {
        return { success: false, message: "⛔ Acceso denegado. Solo administradores." };
    }

    const supabase = createAdminClient();
    const terceroID = parseInt(formData.get("terceroID") as string);
    const nombres = formData.get("nombres") as string;
    const apellidos = formData.get("apellidos") as string;
    const email = formData.get("email") as string;
    const esEmpleado = formData.get("esEmpleado") === "on";
    const cargoID = formData.get("cargoID") ? parseInt(formData.get("cargoID") as string) : null;
    const password = formData.get("password") as string;

    try {
        // Actualizar Tercero
        await supabase.from("tercero").update({
            Nombres: nombres, Apellidos: apellidos, Email: email,
            Telefono: formData.get("telefono"), NumeroDocumento: formData.get("numDoc"), Direccion: formData.get("direccion")
        }).eq("TerceroID", terceroID);

        if (esEmpleado && cargoID) {
            let empleadoID;
            // Buscar empleado existente
            const { data: emp } = await supabase.from("empleado").select("EmpleadoID").eq("TerceroID", terceroID).maybeSingle();

            if (emp) {
                // Si ya existe, actualizamos cargo y lo ACTIVAMOS
                await supabase.from("empleado").update({ CargoID: cargoID, Activo: true }).eq("EmpleadoID", emp.EmpleadoID);
                empleadoID = emp.EmpleadoID;
            } else {
                // Si no existe, creamos uno nuevo (Validando que no sea null)
                const { data: nuevoEmp, error } = await supabase
                    .from("empleado").insert({ TerceroID: terceroID, CargoID: cargoID, Activo: true }).select("EmpleadoID").single();

                if (error || !nuevoEmp) throw new Error("Error creando empleado: " + error?.message);
                empleadoID = nuevoEmp.EmpleadoID;
            }

            // Crear Usuario si mandaron contraseña
            if (password && email) {
                const { data: usu } = await supabase.from("usuario").select("UsuarioID").eq("EmpleadoID", empleadoID).maybeSingle();

                if (!usu) {
                    // Crear Auth
                    const { data: auth, error: authErr } = await supabase.auth.admin.createUser({
                        email, password, email_confirm: true, user_metadata: { nombre: `${nombres} ${apellidos}` }
                    });
                    if (authErr) throw new Error("Error Auth: " + authErr.message);

                    const username = await generarUsername(supabase, nombres, apellidos);

                    // Insertar en tabla usuario (FORZANDO ACTIVO: TRUE)
                    await supabase.from("usuario").insert({
                        EmpleadoID: empleadoID,
                        auth_user_id: auth.user.id,
                        Username: username,
                        Activo: true,
                        debecambiarpassword: true
                    });

                    /*// --- ENVIAR EMAIL (VERSIÓN CORREGIDA CON RENDER) ---
                    try {
                        // 1. Convertimos el componente React a HTML puro
                        const emailHtml = await render(
                            React.createElement(WelcomeEmail, {
                                nombre: nombres,
                                email: email,
                                passwordNot: password
                            })
                        );

                        // 2. Enviamos el HTML ya procesado
                        const respuestaResend = await resend.emails.send({
                            from: 'Pide y Come <onboarding@resend.dev>',
                            to: [email], // Asegúrate de usar TU MISMO CORREO registrado en Resend para pruebas
                            subject: 'Bienvenido - Tus Credenciales',
                            html: emailHtml // <--- USAMOS HTML EN LUGAR DE REACT
                        });

                        console.log("✅ CORREO ENVIADO. ID:", respuestaResend.data?.id);

                    } catch (e) {
                        console.error("❌ ERROR EMAIL:", e);
                        // No lanzamos error para no revertir la creación del usuario
                    }*/

                    // --- ENVIAR EMAIL CON NODEMAILER ---
                    try {
                        // 1. Renderizamos el HTML igual que antes
                        const emailHtml = await render(
                            React.createElement(WelcomeEmail, {
                                nombre: nombres,
                                email: email,
                                passwordNot: password
                            })
                        );

                        // 2. Enviamos usando Nodemailer (Gmail)
                        const info = await transporter.sendMail({
                            from: `"Pide y Come" <${process.env.SMTP_EMAIL}>`, // Remitente
                            to: email, // Destinatario REAL
                            subject: 'Bienvenido al Sistema - Credenciales de Acceso',
                            html: emailHtml
                        });

                        console.log("✅ CORREO ENVIADO (GMAIL). ID:", info.messageId);

                    } catch (e) {
                        console.error("❌ ERROR EMAIL NODEMAILER:", e);
                        // No lanzamos error para no revertir la creación
                    }
                }
            }
        } else {
            // SI DESMARCARON "ES EMPLEADO" -> Inactivamos
            const { data: emp } = await supabase.from("empleado").select("EmpleadoID, usuario(auth_user_id)").eq("TerceroID", terceroID).maybeSingle();
            if (emp) {
                // Inactivar Empleado
                await supabase.from("empleado").update({ Activo: false }).eq("EmpleadoID", emp.EmpleadoID);

                // Inactivar Usuario
                if (emp.usuario && emp.usuario.length > 0) {
                    // @ts-ignore
                    const authId = emp.usuario[0].auth_user_id;
                    if (authId) await supabase.auth.admin.updateUserById(authId, { ban_duration: "876000h" });
                    await supabase.from("usuario").update({ Activo: false }).eq("EmpleadoID", emp.EmpleadoID);
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
// 3. TOGGLE ESTADO (OJO)
// ==========================================
export async function toggleEstadoEmpleado(terceroID: number, nuevoEstado: boolean) {
    // [SEGURIDAD AGREGADA]
    if (!(await verificarPermisoAdmin())) {
        return { success: false, message: "⛔ Acceso denegado. Solo administradores." };
    }

    const supabase = createAdminClient();
    const { data: emp } = await supabase.from("empleado").select("EmpleadoID, usuario(auth_user_id)").eq("TerceroID", terceroID).maybeSingle();

    if (emp) {
        await supabase.from("empleado").update({ Activo: nuevoEstado }).eq("EmpleadoID", emp.EmpleadoID);
        if (emp.usuario && emp.usuario.length > 0) {
            // @ts-ignore
            const authId = emp.usuario[0].auth_user_id;
            // Si desactivamos -> Ban. Si activamos -> Quitamos Ban.
            if (authId) await supabase.auth.admin.updateUserById(authId, { ban_duration: !nuevoEstado ? "876000h" : "0" });
            await supabase.from("usuario").update({ Activo: nuevoEstado }).eq("EmpleadoID", emp.EmpleadoID);
        }
    }
    revalidatePath("/admin/personal");
    return { success: true };
}
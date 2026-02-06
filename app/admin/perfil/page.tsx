"use client";

import React, { useState, useEffect, useRef } from 'react';
// IMPORTANTE: Separamos de dónde viene cada cosa
import { getPerfilUsuario } from '@/lib/api/profile';
import { actualizarInfoPerfil, cambiarPasswordPerfil, subirFotoPerfil } from '@/actions/profile';
import { User, Lock, Camera, Save, Loader2, MapPin, Phone, Mail, Shield } from 'lucide-react';
import Image from 'next/image';

export default function PerfilPage() {
    const [perfil, setPerfil] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Estado para la foto
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cargar datos
    useEffect(() => {
        async function load() {
            const data = await getPerfilUsuario(); // Llamada a la API (lib)
            console.log("🛠️ DATOS CRUDOS DE BD:", data);
            if (data) {
                setPerfil(data);
                setPreviewUrl(data.FotoPerfil);
            }
            setLoading(false);
        }
        load();
    }, []);

    // Manejar cambio de foto
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Previsualización inmediata
            setPreviewUrl(URL.createObjectURL(file));

            const formData = new FormData();
            formData.append("foto", file);
            formData.append("usuarioID", perfil.UsuarioID);

            // Llamamos a la acción
            const res = await subirFotoPerfil(formData);

            if (res.success) {
                // ✅ Usamos ?? null para evitar el error de 'undefined'
                setPreviewUrl(res.url ?? null);
                alert(res.message);
            } else {
                // ✅ Usamos res.message porque así lo definimos en el action
                alert(res.message || "Error al subir la foto");
            }
        }
    };

    const handleInfoSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);
        const formData = new FormData(e.currentTarget);
        formData.append("terceroID", perfil.TerceroID);

        const res = await actualizarInfoPerfil(formData); // Llamada al Action
        alert(res.message || res.error);
        setSaving(false);
    };

    const handlePassSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);
        const formData = new FormData(e.currentTarget);
        const res = await cambiarPasswordPerfil(formData); // Llamada al Action
        alert(res.message || res.error);
        if (res.success) (e.target as HTMLFormElement).reset();
        setSaving(false);
    };

    if (loading) return <div className="p-10 text-center text-gray-400 font-bold animate-pulse">Cargando perfil...</div>;

    console.log("🔍 DATOS DEL PERFIL:", perfil);

    return (
        <div className="min-h-screen bg-[#f8f9fa] pt-24 pb-12 px-4 sm:px-8">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-3xl font-black font-playfair text-gray-800 mb-8">Mi Perfil</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* TARJETA IZQUIERDA (FOTO) */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center relative overflow-hidden">
                            <div className="bg-gradient-to-r from-orange-400 to-red-500 h-24 absolute top-0 left-0 right-0"></div>

                            <div className="relative mt-8 mb-4 inline-block group">
                                <div className="w-28 h-28 rounded-full border-4 border-white shadow-md overflow-hidden bg-gray-200 relative">
                                    {/*{previewUrl ? (
                                <Image src={previewUrl} alt="Foto" fill className="object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-400">
                                    {perfil?.Nombres?.charAt(0)}
                                </div>
                            )}*/}
                                    {previewUrl ? (
                                        // Usamos img normal para descartar bloqueos de Next.js
                                        <Image
                                            src={previewUrl}
                                            alt="Foto"
                                            width={120}
                                            height={120}
                                            unoptimized={true} // <--- Evita que Next.js comprima la imagen
                                            className="rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-400">
                                            {perfil?.Nombres?.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 bg-gray-800 text-white p-2 rounded-full hover:bg-black transition-colors shadow-lg"
                                >
                                    <Camera className="w-4 h-4" />
                                </button>
                                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
                            </div>

                            <h2 className="text-xl font-bold text-gray-800">{perfil.Nombres} {perfil.Apellidos}</h2>
                            <p className="text-sm text-gray-500 font-medium">{perfil.Cargo}</p>
                            <p className="text-xs text-orange-500 font-bold mt-1">@{perfil.Username}</p>

                            <div className="mt-6 pt-6 border-t border-gray-100 text-left space-y-3 text-sm text-gray-600">
                                <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-gray-400" /><span className="truncate">{perfil.Email}</span></div>
                                <div className="flex items-center gap-3"><Shield className="w-4 h-4 text-gray-400" /><span>{perfil.TipoDoc} {perfil.Documento}</span></div>
                            </div>
                        </div>
                    </div>

                    {/* FORMULARIOS DERECHA */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* INFO PERSONAL */}
                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><User className="w-5 h-5 text-[#ff6d22]" /> Información Personal</h3>
                            <form onSubmit={handleInfoSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="text-xs font-bold text-gray-500 mb-1 block">Nombres</label><input name="nombres" defaultValue={perfil.Nombres} className="input-std" /></div>
                                    <div><label className="text-xs font-bold text-gray-500 mb-1 block">Apellidos</label><input name="apellidos" defaultValue={perfil.Apellidos} className="input-std" /></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="text-xs font-bold text-gray-500 mb-1 block flex items-center gap-1"><Phone className="w-3 h-3" /> Teléfono</label><input name="telefono" defaultValue={perfil.Telefono} className="input-std" /></div>
                                    <div><label className="text-xs font-bold text-gray-500 mb-1 block flex items-center gap-1"><MapPin className="w-3 h-3" /> Dirección</label><input name="direccion" defaultValue={perfil.Direccion} className="input-std" /></div>
                                </div>
                                <div className="flex justify-end pt-4">
                                    <button disabled={saving} className="bg-gray-900 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-gray-700 transition-colors flex items-center gap-2">
                                        {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <><Save className="w-4 h-4" /> Guardar Cambios</>}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* PASSWORD */}
                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><Lock className="w-5 h-5 text-red-500" /> Seguridad</h3>
                            <form onSubmit={handlePassSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="text-xs font-bold text-gray-500 mb-1 block">Nueva Contraseña</label><input name="password" type="password" className="input-std" required minLength={6} /></div>
                                    <div><label className="text-xs font-bold text-gray-500 mb-1 block">Confirmar</label><input name="confirmPassword" type="password" className="input-std" required minLength={6} /></div>
                                </div>
                                <div className="flex justify-end pt-4">
                                    <button disabled={saving} className="bg-red-50 text-red-600 border border-red-100 px-6 py-2 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors flex items-center gap-2">
                                        {saving ? <Loader2 className="animate-spin w-4 h-4" /> : "Actualizar Contraseña"}
                                    </button>
                                </div>
                            </form>
                        </div>

                    </div>
                </div>
            </div>
            <style jsx>{` .input-std { width: 100%; padding: 0.6rem 1rem; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.75rem; outline: none; transition: all 0.2s; } .input-std:focus { border-color: #ff6d22; background: white; box-shadow: 0 0 0 2px rgba(255, 109, 34, 0.1); } `}</style>
        </div>
    );
}
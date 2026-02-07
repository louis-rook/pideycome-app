"use client";

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PerfilUsuario } from '@/types/profile';
import { actualizarInfoPerfil, cambiarPasswordPerfil, subirFotoPerfil } from '@/actions/profile';
import { User, Lock, Camera, Save, Loader2, MapPin, Phone, Mail, Shield } from 'lucide-react';
import Image from 'next/image';

interface ProfileViewProps {
  user: PerfilUsuario;
}

export default function ProfileView({ user }: ProfileViewProps) {
    // Estado local optimista (iniciamos con los datos que trajo el servidor)
    const [perfil, setPerfil] = useState<PerfilUsuario>(user);
    
    // Estados de carga
    const [savingInfo, setSavingInfo] = useState(false);
    const [savingPass, setSavingPass] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(user.FotoPerfil);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    // 1. Manejar Foto
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPreviewUrl(URL.createObjectURL(file)); // Preview instantáneo

            const formData = new FormData();
            formData.append("file", file);
            formData.append("usuarioID", perfil.UsuarioID.toString());

            const res = await subirFotoPerfil(formData);
            if (res.error) {
                alert("Error: " + res.error);
                setPreviewUrl(perfil.FotoPerfil); // Revertir si falla
            } else {
                router.refresh(); // Refrescar para actualizar avatar en header si existe
            }
        }
    };

    // 2. Guardar Info
    const handleSaveInfo = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSavingInfo(true);
        const res = await actualizarInfoPerfil(new FormData(e.currentTarget));
        alert(res.error || res.message);
        setSavingInfo(false);
        if (res.success) router.refresh();
    };

    // 3. Guardar Password
    const handleSavePass = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSavingPass(true);
        const res = await cambiarPasswordPerfil(new FormData(e.currentTarget));
        alert(res.error || res.message);
        setSavingPass(false);
        if (res.success) (e.target as HTMLFormElement).reset();
    };

    return (
        <div className="p-6 bg-[#F8F9FA] min-h-screen">
            <h1 className="text-3xl font-bold text-gray-900 mb-8 font-playfair">Mi Perfil</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* === COLUMNA IZQUIERDA: RESUMEN === */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-orange-400 to-red-500 opacity-10"></div>
                        
                        <div className="relative w-32 h-32 mx-auto mb-4 group">
                            <div className="w-full h-full rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-200 relative">
                                {previewUrl ? (
                                    <Image src={previewUrl} alt="Perfil" fill className="object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400"><User size={40} /></div>
                                )}
                            </div>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-0 right-0 bg-[#ff6d22] text-white p-2 rounded-full shadow-md hover:scale-110 transition-transform"
                                title="Cambiar foto"
                            >
                                <Camera size={18} />
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                        </div>

                        <h2 className="text-xl font-bold text-gray-800">{perfil.Nombres} {perfil.Apellidos}</h2>
                        <span className="inline-block bg-orange-100 text-[#ff6d22] px-3 py-1 rounded-full text-xs font-bold mt-2 uppercase tracking-wide">
                            {perfil.Cargo}
                        </span>

                        <div className="mt-6 flex flex-col gap-3 text-sm text-gray-500 text-left px-4">
                            <div className="flex items-center gap-3"><Mail size={16} /> {perfil.Email}</div>
                            <div className="flex items-center gap-3"><Shield size={16} /> @{perfil.Username}</div>
                        </div>
                    </Card>
                </div>

                {/* === COLUMNA DERECHA: FORMULARIOS === */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Formulario Info */}
                    <Card title="Información Personal" icon={User}>
                        <form onSubmit={handleSaveInfo}>
                            <input type="hidden" name="terceroID" value={perfil.TerceroID} />
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <Input label="Nombres" name="nombres" defaultValue={perfil.Nombres} />
                                <Input label="Apellidos" name="apellidos" defaultValue={perfil.Apellidos} />
                                <Input label="Teléfono" name="telefono" icon={<Phone size={12}/>} defaultValue={perfil.Telefono} />
                                <Input label="Dirección" name="direccion" icon={<MapPin size={12}/>} defaultValue={perfil.Direccion} />
                            </div>
                            
                            <div className="flex justify-end">
                                <Button type="submit" isLoading={savingInfo} variant="primary">
                                    <Save size={16} /> Guardar Cambios
                                </Button>
                            </div>
                        </form>
                    </Card>

                    {/* Formulario Seguridad */}
                    <Card title="Seguridad" icon={Lock}>
                        <form onSubmit={handleSavePass}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <Input label="Nueva Contraseña" name="password" type="password" placeholder="••••••" minLength={6} />
                                <Input label="Confirmar" name="confirmPassword" type="password" placeholder="••••••" minLength={6} />
                            </div>
                            
                            <div className="flex justify-end">
                                <Button type="submit" isLoading={savingPass} variant="danger">
                                    Actualizar Contraseña
                                </Button>
                            </div>
                        </form>
                    </Card>

                </div>
            </div>
        </div>
    );
}

// === SUB-COMPONENTES LOCALES (Para que sea plug-and-play en tu carpeta admin) ===

function Card({ children, className = "", title, icon: Icon }: any) {
  return (
    <div className={`bg-white rounded-3xl p-8 shadow-sm border border-gray-100 ${className}`}>
      {title && (
        <div className="flex items-center gap-3 mb-6">
          {Icon && <div className="p-2 bg-orange-50 text-[#ff6d22] rounded-lg"><Icon size={20} /></div>}
          <h3 className="font-bold text-gray-800">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}

function Input({ label, icon, className = "", ...props }: any) {
  return (
    <div className={className}>
      <label className="text-xs font-bold text-gray-500 mb-1 block flex items-center gap-1">
        {icon} {label}
      </label>
      <input className="w-full px-4 py-3 bg-[#f9fafb] border border-gray-200 rounded-xl outline-none text-sm transition-all focus:border-[#ff6d22] focus:bg-white focus:ring-4 focus:ring-orange-500/10" {...props} />
    </div>
  );
}

function Button({ children, variant = 'primary', isLoading, className = "", disabled, ...props }: any) {
  const base = "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 justify-center";
  const styles = {
    primary: "bg-[#ff6d22] text-white hover:bg-[#e05e1a] shadow-md shadow-orange-100",
    danger: "bg-white text-red-600 border border-red-100 hover:bg-red-50"
  };
  return (
    <button disabled={isLoading || disabled} className={`${base} ${styles[variant as keyof typeof styles]} ${className}`} {...props}>
      {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : children}
    </button>
  );
}
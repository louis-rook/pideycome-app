"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, X, Image as ImageIcon } from 'lucide-react';
import { crearProducto, actualizarProducto } from '@/actions/products';

interface ProductModalProps {
  isOpen: boolean;
  productoEditar: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProductModal({ isOpen, productoEditar, onClose, onSuccess }: ProductModalProps) {
  const [procesando, setProcesando] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  // Resetear estados al abrir/cerrar o cambiar producto
  useEffect(() => {
    if (isOpen) {
        if (productoEditar) {
            setPreview(productoEditar.Imagen);
        } else {
            setPreview(null);
        }
    }
  }, [isOpen, productoEditar]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProcesando(true);
    const formData = new FormData(e.currentTarget);
    
    // Validación básica
    if(!formData.get('nombre') || !formData.get('precio')) {
        alert("Campos obligatorios faltantes");
        setProcesando(false);
        return;
    }

    let res;
    if (productoEditar) {
        formData.append("id", productoEditar.ProductoID);
        formData.append("imagenAnterior", productoEditar.Imagen || ""); 
        res = await actualizarProducto(formData);
    } else {
        res = await crearProducto(formData);
    }

    if (res.success) {
        onSuccess();
        onClose();
    } else {
        alert("Error: " + res.message);
    }
    setProcesando(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
        <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="bg-white px-8 py-5 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
                <h2 className="text-xl font-bold text-gray-800">
                    {productoEditar ? 'Editar Producto' : 'Nuevo Producto'}
                </h2>
                <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
                {/* Foto */}
                <div className="flex justify-center">
                    <div className="relative w-full h-40 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#ff6d22] bg-gray-50 hover:bg-orange-50/30 transition-all flex flex-col items-center justify-center cursor-pointer group overflow-hidden">
                        {preview ? ( <img src={preview} alt="Preview" className="w-full h-full object-cover" /> ) : (
                            <>
                                <div className="bg-white p-3 rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform"><ImageIcon className="w-6 h-6 text-[#ff6d22]" /></div>
                                <p className="text-sm font-bold text-gray-500">Subir Imagen</p>
                                <p className="text-xs text-gray-400">Máx 2MB</p>
                            </>
                        )}
                        <input type="file" name="imagen" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Nombre</label>
                        <input type="text" name="nombre" required defaultValue={productoEditar?.Nombre} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ff6d22] transition-all" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Precio</label>
                        <input type="number" name="precio" required defaultValue={productoEditar?.Precio} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ff6d22] transition-all" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Categoría</label>
                        <select name="categoria" defaultValue={productoEditar?.CategoriaID} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ff6d22] transition-all cursor-pointer">
                            <option value="1">Desayunos</option>
                            <option value="2">Platos Principales</option>
                            <option value="3">Bebidas</option>
                            <option value="4">Postres</option>
                        </select>
                    </div>
                    <div>
                         <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Ingredientes</label>
                         <input type="text" name="ingredientes" defaultValue={productoEditar?.Ingredientes} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ff6d22] transition-all" />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Descripción</label>
                    <textarea name="descripcion" rows={2} defaultValue={productoEditar?.Descripcion} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ff6d22] transition-all resize-none"></textarea>
                </div>

                <button type="submit" disabled={procesando} className="w-full py-4 bg-[#ff6d22] text-white font-bold rounded-xl shadow-lg hover:bg-[#e05e1b] transition-all flex items-center justify-center gap-2 mt-2">
                    {procesando ? <Loader2 className="w-5 h-5 animate-spin" /> : (productoEditar ? "Guardar Cambios" : "Guardar Producto")}
                </button>
            </form>
        </div>
    </div>
  );
}
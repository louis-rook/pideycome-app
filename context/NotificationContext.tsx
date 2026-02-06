"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getCurrentUser } from '@/lib/api/auth';

// Definimos los tipos de notificación
export interface NotificationItem {
  id: number; // PedidoID
  type: 'pedido';
  message: string;
  time: string;
  estadoId: number;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: () => void;
  playNotificationSound: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [userRole, setUserRole] = useState<number | null>(null);
  const supabase = createClient();

  // Sonido de notificación (opcional, asegúrate de tener un archivo o usa una url pública)
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/sounds/notification.mp3'); // Crea esta carpeta en public o usa un link
      audio.play().catch(e => console.log("Audio play failed", e));
    } catch (e) { console.error(e); }
  };

  // 1. Obtener rol del usuario al cargar
  useEffect(() => {
    getCurrentUser().then(u => {
      if (u) setUserRole(u.CargoID);
    });
  }, []);

  // 2. Cargar notificaciones iniciales y Suscribirse a cambios
  useEffect(() => {
    if (!userRole) {
        console.log("⏳ Esperando rol de usuario...");
        return;
    }

    console.log("👤 Rol detectado:", userRole); // <--- OJO AQUÍ: ¿Qué número sale?

    const fetchInitialNotifications = async () => {
       let estadosInteres: number[] = [];
       
       // ... tu lógica de roles ...
       if ([3, 4].includes(userRole)) { // <--- Es mesero o cajero
          estadosInteres = [1, 4]; 
       } else if ([2].includes(userRole)) { // <--- Es cocinero
          estadosInteres = [2]; 
       } else if ([1, 5].includes(userRole)) { // <--- Admin o Lider
          estadosInteres = [4, 5, 6]; 
       }

       console.log("🎯 Estados de interés para este rol:", estadosInteres); // <--- ¿Sale [2]?

       if (estadosInteres.length === 0) {
           console.warn("⚠️ Este rol no tiene estados configurados para notificar.");
           return;
       }

       // --- POSIBLE BUG DE FECHA ---
       // Si usas toISOString(), te da la fecha UTC. En Colombia por la noche ya es "mañana" en UTC.
       // Corrección: Usar hora local de Colombia
       const fechaColombia = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
       
       console.log("📅 Buscando pedidos desde:", fechaColombia);

       const { data, error } = await supabase
         .from('pedido')
         .select('PedidoID, EstadoID, Fecha, Total')
         .in('EstadoID', estadosInteres)
         .gte('Fecha', `${fechaColombia}T00:00:00`) // Usar la fecha corregida
         .order('Fecha', { ascending: false });

       if (error) console.error("❌ Error Supabase:", error);
       
       console.log("🔔 Pedidos encontrados:", data?.length, data); // <--- ¿Trae datos?

       if (data) {
         const mapped = data.map(p => formatNotification(p));
         setNotifications(mapped);
       }
    };

    fetchInitialNotifications();

    // --- REALTIME SUBSCRIPTION ---
    const channel = supabase
      .channel('pedido-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedido' },
        (payload) => {
          // --- AGREGA ESTO PARA DEPURAR ---
          console.log("🔔 EVENTO RECIBIDO DE SUPABASE:", payload); 
          
          // Verificar si el estado nuevo nos interesa
          // payload.new trae el registro nuevo/actualizado
          fetchInitialNotifications();
          playNotificationSound();
        }
      )
      .subscribe((status) => {
        // --- VERIFICA SI SE CONECTÓ ---
        console.log("🔌 Estado de conexión Realtime:", status);
      });

    return () => { supabase.removeChannel(channel); };
  }, [userRole]);

  // Helper para formatear el mensaje
  const formatNotification = (pedido: any): NotificationItem => {
    let msg = `Pedido #${pedido.PedidoID}`;
    
    switch(pedido.EstadoID) {
        case 1: msg = `Nuevo Pedido #${pedido.PedidoID} por confirmar`; break;
        case 2: msg = `Pedido #${pedido.PedidoID} entró a cocina`; break;
        case 4: msg = `Pedido #${pedido.PedidoID} listo para entregar`; break;
        case 6: msg = `¡Alerta! Pedido #${pedido.PedidoID} cancelado`; break;
        default: msg = `Actualización en pedido #${pedido.PedidoID}`;
    }

    return {
        id: pedido.PedidoID,
        type: 'pedido',
        message: msg,
        estadoId: pedido.EstadoID,
        time: new Date(pedido.Fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const markAsRead = () => {
    // En este enfoque "estado-based", marcar como leído es visual
    // Opcional: podrías guardarlo en localStorage para que no moleste
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount: notifications.length, markAsRead, playNotificationSound }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
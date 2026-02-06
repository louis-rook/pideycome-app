import * as React from 'react';

interface WelcomeEmailProps {
  nombre: string;
  email: string;
  passwordNot: string; // "password" es palabra reservada a veces, usamos passwordNot
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
  nombre,
  email,
  passwordNot,
}) => (
  <div style={{ fontFamily: 'Arial, sans-serif', color: '#333' }}>
    <div style={{ backgroundColor: '#ff6d22', padding: '20px', textAlign: 'center' }}>
      <h1 style={{ color: 'white', margin: 0 }}>¡Bienvenido al Equipo!</h1>
    </div>
    <div style={{ padding: '20px', border: '1px solid #ddd', borderTop: 'none' }}>
      <p>Hola <strong>{nombre}</strong>,</p>
      <p>Tu cuenta ha sido creada exitosamente en el sistema <strong>Pide y Come</strong>.</p>
      
      <p>Aquí tienes tus credenciales de acceso temporal:</p>
      
      <div style={{ backgroundColor: '#f4f4f4', padding: '15px', borderRadius: '5px', margin: '20px 0' }}>
        <p style={{ margin: '5px 0' }}><strong>Usuario / Email:</strong> {email}</p>
        <p style={{ margin: '5px 0' }}><strong>Contraseña Temporal:</strong> <span style={{ fontFamily: 'monospace', fontSize: '16px', backgroundColor: '#fff', padding: '2px 5px' }}>{passwordNot}</span></p>
      </div>

      <p><strong>Importante:</strong> Al ingresar por primera vez, el sistema te pedirá cambiar esta contraseña por seguridad.</p>
      
      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <a href="http://localhost:3000/login" style={{ backgroundColor: '#ff6d22', color: 'white', padding: '10px 20px', textDecoration: 'none', borderRadius: '5px', fontWeight: 'bold' }}>
          Ir al Sistema
        </a>
      </div>
    </div>
    <p style={{ fontSize: '12px', color: '#888', textAlign: 'center', marginTop: '20px' }}>
      Si tienes problemas para ingresar, contacta al administrador.
    </p>
  </div>
);
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Tu NUEVO proyecto en la nube
      {
        protocol: "https",
        hostname: "oxdqgubjniekrlxhptfm.supabase.co", 
      },
      // Localhost (por si acaso sigues probando local)
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
      // Imágenes externas (Opcional)
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

  experimental: {
        serverActions: {
            bodySizeLimit: '10mb', // Aumentamos el límite a 10MB
        },
    },
};

export default nextConfig;
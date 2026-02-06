/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Esto permite que Next.js descargue y optimice las fotos de tu Supabase
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hjwwuxlykwttsxxfzrgc.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
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
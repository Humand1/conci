/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Configuración para Vercel
  experimental: {
    serverComponentsExternalPackages: ['pdf-lib', 'pdfjs-dist'],
  },
  
  // Configuración de límites de tamaño para archivos grandes
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Aumentar límite a 50MB para PDFs grandes
    },
    responseLimit: false, // Desactivar límite de respuesta
  },
  
  // Configuración de archivos
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    
    // Excluir pdfjs-dist del bundle del servidor
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('pdfjs-dist');
    }
    
    return config;
  },
  
  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
  
  // Configuración de imágenes
  images: {
    domains: ['api-prod.humand.co', 'redash.humand.co'],
  },
  
  // Variables de entorno públicas
  env: {
    CUSTOM_KEY: 'PDF_MULTIPLICADOR_WEB',
  },
}

module.exports = nextConfig

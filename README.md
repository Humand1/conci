# PDF Multiplicador Web

Una aplicación web moderna para duplicar PDFs basada en segmentaciones de usuarios de Humand, optimizada para despliegue en Vercel.

## 🚀 Características

- **Interfaz Web Moderna**: Aplicación React con Next.js y Tailwind CSS
- **Duplicación de PDFs**: Multiplica PDFs para múltiples usuarios basado en segmentaciones
- **Selector de Firmas**: Interfaz visual para seleccionar coordenadas de firma en PDFs
- **Integración con Humand**: Obtiene segmentaciones y usuarios automáticamente
- **Integración con Redash**: Gestión de carpetas para organización
- **Subida de Documentos**: Carga automática de PDFs duplicados a Humand
- **Progreso en Tiempo Real**: Seguimiento del progreso de operaciones
- **Responsive Design**: Funciona en desktop y móvil
- **Despliegue Serverless**: Optimizado para Vercel

## 📋 Requisitos Previos

- Node.js 18+ 
- Cuenta en Vercel (para despliegue)
- Token de API de Humand
- API Key de Redash

## 🛠️ Instalación Local

1. **Clonar el repositorio**
   ```bash
   git clone <tu-repositorio>
   cd pdf-multiplicador-web
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env.local
   ```
   
   Edita `.env.local` con tus valores reales:
   ```env
   HUMAND_API_BASE_URL=https://api-prod.humand.co/public/api/v1
   HUMAND_API_TOKEN=tu_api_key_de_humand
   REDASH_API_BASE_URL=https://redash.humand.co/api/queries
   REDASH_API_KEY=tu_api_key_de_redash
   REDASH_FOLDERS_QUERY_ID=17520
   ```

4. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   ```

5. **Abrir en el navegador**
   ```
   http://localhost:3000
   ```

## 🚀 Despliegue en Vercel

### Opción 1: Desde GitHub (Recomendado)

1. **Subir código a GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Conectar con Vercel**
   - Ve a [vercel.com](https://vercel.com)
   - Conecta tu repositorio de GitHub
   - Vercel detectará automáticamente que es un proyecto Next.js

3. **Configurar variables de entorno en Vercel**
   - En el dashboard de Vercel, ve a Settings → Environment Variables
   - Agrega todas las variables del archivo `.env.example`

4. **Desplegar**
   - Vercel desplegará automáticamente en cada push a main

### Opción 2: Vercel CLI

1. **Instalar Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login y desplegar**
   ```bash
   vercel login
   vercel --prod
   ```

3. **Configurar variables de entorno**
   ```bash
   vercel env add HUMAND_API_TOKEN
   vercel env add REDASH_API_KEY
   # ... agregar todas las variables necesarias
   ```

## 📖 Guía de Uso

### 1. Subir PDF
- Arrastra y suelta un archivo PDF o haz clic para seleccionar
- El sistema validará que sea un PDF válido

### 2. Seleccionar Segmentaciones
- Haz clic en "Seleccionar Segmentaciones"
- Busca y selecciona las segmentaciones deseadas
- Ve el conteo de usuarios en tiempo real

### 3. Configurar Firma (Opcional)
- Si tu PDF requiere firma, haz clic en "Configurar Coordenadas de Firma"
- Navega por las páginas del PDF
- Dibuja un rectángulo donde debe ir la firma
- Guarda las coordenadas

### 4. Duplicar PDF
- Haz clic en "Duplicar PDF"
- Observa el progreso en tiempo real
- Descarga los archivos generados

### 5. Subir a Humand (Opcional)
- Selecciona una carpeta de destino
- Haz clic en "Subir Documentos"
- Observa el progreso de subida

## 🏗️ Arquitectura

```
pdf-multiplicador-web/
├── components/           # Componentes React reutilizables
├── lib/                 # Utilidades y configuración
├── pages/
│   ├── api/            # API Routes de Next.js
│   ├── _app.js         # Configuración global de la app
│   └── index.js        # Página principal
├── styles/             # Estilos CSS
├── public/             # Archivos estáticos
└── config files        # Configuración de Next.js, Tailwind, etc.
```

### Componentes Principales

- **PDFUploader**: Subida de archivos con drag & drop
- **SegmentationSelector**: Modal para seleccionar segmentaciones
- **UsersList**: Lista de usuarios seleccionados
- **SignatureSelector**: Selector visual de coordenadas de firma
- **ProgressModal**: Modal de progreso para operaciones largas
- **DuplicationResults**: Resultados de duplicación con descargas
- **UploadResults**: Resultados de subida a Humand

### API Routes

- `/api/segmentations` - Obtiene segmentaciones de Humand
- `/api/users` - Obtiene usuarios de segmentaciones
- `/api/folders` - Obtiene carpetas de Redash
- `/api/duplicate-pdf` - Duplica PDFs para usuarios
- `/api/upload-documents` - Sube documentos a Humand

## 🔧 Configuración

### Variables de Entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `HUMAND_API_BASE_URL` | URL base de la API de Humand | ✅ |
| `HUMAND_API_TOKEN` | Token de autenticación de Humand | ✅ |
| `REDASH_API_BASE_URL` | URL base de la API de Redash | ✅ |
| `REDASH_API_KEY` | API Key de Redash | ✅ |
| `NEXT_PUBLIC_APP_NAME` | Nombre de la aplicación | ❌ |
| `NEXT_PUBLIC_MAX_FILE_SIZE` | Tamaño máximo de archivo (MB) | ❌ |

### Límites de Vercel

- **Tamaño de función**: 50MB (configurado en `vercel.json`)
- **Timeout**: 60 segundos para funciones serverless
- **Memoria**: 1024MB para procesamiento de PDFs

## 🐛 Solución de Problemas

### Error: "PDF processing failed"
- Verifica que el archivo sea un PDF válido
- Asegúrate de que el PDF no esté corrupto o protegido

### Error: "Failed to fetch segmentations"
- Verifica que `HUMAND_API_TOKEN` esté configurado correctamente
- Confirma que la URL de la API sea correcta

### Error: "Upload failed"
- Verifica la conexión con Humand
- Asegúrate de que la carpeta de destino exista

### Problemas de Despliegue
- Verifica que todas las variables de entorno estén configuradas en Vercel
- Revisa los logs de despliegue en el dashboard de Vercel

## 📝 Desarrollo

### Estructura de Desarrollo

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run lint         # Linting del código
```

### Agregar Nuevas Funcionalidades

1. **Componentes**: Agregar en `/components/`
2. **API Routes**: Agregar en `/pages/api/`
3. **Utilidades**: Agregar en `/lib/`
4. **Estilos**: Usar clases de Tailwind CSS

## 📄 Licencia

Este proyecto es privado y está destinado únicamente para uso interno.

## 🤝 Soporte

Para soporte técnico o preguntas sobre la aplicación, contacta al equipo de desarrollo.

---

**Versión Web**: 1.0.0  
**Última actualización**: Enero 2025

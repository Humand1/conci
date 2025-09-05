// Configuración de la aplicación web
export const API_CONFIG = {
  // URLs base
  HUMAND_API_BASE_URL: process.env.HUMAND_API_BASE_URL || 'https://api-prod.humand.co/public/api/v1',
  REDASH_BASE_URL: process.env.REDASH_BASE_URL || 'https://redash.humand.co',
  
  // Timeouts y reintentos
  TIMEOUT: parseInt(process.env.API_TIMEOUT) || 30000,
  MAX_RETRIES: parseInt(process.env.API_MAX_RETRIES) || 3,
  RETRY_DELAY: parseInt(process.env.API_RETRY_DELAY) || 1000,
  
  // Configuración de cache
  CACHE_ENABLED: process.env.CACHE_ENABLED !== 'false',
  CACHE_TTL: parseInt(process.env.CACHE_TTL) || 1800, // 30 minutos
}

export const ENDPOINTS = {
  segmentations: '/segmentations',
  segmentation_users: '/segmentations/users',
  upload_document: '/users/{user_id}/documents',
  folders: '/folders',
}

export const REDASH_CONFIG = {
  base_url: process.env.REDASH_API_BASE_URL || 'https://redash.humand.co',
  account_api_key: process.env.REDASH_ACCOUNT_API_KEY,
  query_api_key: process.env.REDASH_QUERY_API_KEY,
  folders_query_id: process.env.REDASH_FOLDERS_QUERY_ID || '17520',
  timeout: parseInt(process.env.REDASH_TIMEOUT) || 30000,
  refresh_wait_time: parseInt(process.env.REDASH_REFRESH_WAIT_TIME) || 2000,
}

export const FILE_CONFIG = {
  // Configuración de archivos
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB) || 50,
  ALLOWED_EXTENSIONS: ['.pdf'],
  OUTPUT_DIR_PREFIX: 'Duplicador_Output',
  
  // Configuración de procesamiento
  MAX_CONCURRENT_PROCESSING: parseInt(process.env.MAX_CONCURRENT_PROCESSING) || 5,
  PROCESSING_TIMEOUT: parseInt(process.env.PROCESSING_TIMEOUT) || 300000, // 5 minutos
}

export const UI_CONFIG = {
  // Configuración de interfaz
  APP_TITLE: 'Multiplicador de PDFs con Segmentaciones',
  APP_DESCRIPTION: 'Sistema web para duplicar y distribuir documentos PDF personalizados basado en segmentaciones de usuarios de Humand',
  
  // Configuración de paginación
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 200,
  
  // Configuración de progreso
  PROGRESS_UPDATE_INTERVAL: 1000, // 1 segundo
  
  // Configuración de notificaciones
  NOTIFICATION_DURATION: 5000, // 5 segundos
}

export const VALIDATION_CONFIG = {
  // Validación de archivos
  PDF_MIME_TYPES: ['application/pdf'],
  MAX_FILENAME_LENGTH: 255,
  
  // Validación de usuarios
  MIN_USERS_REQUIRED: 1,
  MAX_USERS_PER_BATCH: 1000,
  
  // Validación de coordenadas de firma
  MIN_SIGNATURE_SIZE: 0.01, // Tamaño mínimo en unidades PDF
  MAX_SIGNATURE_SIZE: 1.0,   // Tamaño máximo en unidades PDF
}

export const MESSAGES = {
  // Mensajes de la aplicación
  APP_TITLE: UI_CONFIG.APP_TITLE,
  LOADING: 'Cargando...',
  ERROR: 'Error',
  SUCCESS: 'Éxito',
  WARNING: 'Advertencia',
  INFO: 'Información',
  
  // Mensajes específicos
  SEGMENTATIONS_LOADING: 'Cargando segmentaciones...',
  USERS_LOADING: 'Cargando usuarios...',
  PDF_PROCESSING: 'Procesando PDF...',
  UPLOAD_IN_PROGRESS: 'Subiendo archivos...',
  
  // Errores comunes
  FILE_TOO_LARGE: `El archivo es demasiado grande. Máximo ${FILE_CONFIG.MAX_FILE_SIZE_MB}MB`,
  INVALID_FILE_TYPE: 'Tipo de archivo no válido. Solo se permiten archivos PDF',
  NO_USERS_SELECTED: 'Debe seleccionar al menos un usuario',
  NETWORK_ERROR: 'Error de conexión. Verifique su conexión a internet',
  
  // Éxitos
  PDF_UPLOADED: 'PDF cargado exitosamente',
  SEGMENTATIONS_LOADED: 'Segmentaciones cargadas exitosamente',
  PROCESSING_COMPLETE: 'Procesamiento completado',
  UPLOAD_COMPLETE: 'Subida completada exitosamente',
}

// Función para obtener API Key de Humand
export const getHumandAPIKey = () => {
  const apiKey = process.env.HUMAND_API_TOKEN
  
  if (!apiKey) {
    throw new Error('HUMAND_API_TOKEN no configurado. Configure la variable de entorno HUMAND_API_TOKEN')
  }
  
  return apiKey
}

// Función para validar configuración
export const validateConfig = () => {
  const errors = []
  
  // Validar API Key de Humand
  try {
    getHumandAPIKey()
  } catch (error) {
    errors.push('HUMAND_API_TOKEN no configurado')
  }
  
  // Validar configuración de Redash
  if (!REDASH_CONFIG.account_api_key) {
    errors.push('REDASH_ACCOUNT_API_KEY no configurada')
  }
  
  if (!REDASH_CONFIG.query_api_key) {
    errors.push('REDASH_QUERY_API_KEY no configurada')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Configuración de desarrollo vs producción
export const isDevelopment = process.env.NODE_ENV === 'development'
export const isProduction = process.env.NODE_ENV === 'production'

// Configuración de logging
export const LOG_CONFIG = {
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  enableConsole: isDevelopment || process.env.ENABLE_CONSOLE_LOGS === 'true',
  enableFile: process.env.ENABLE_FILE_LOGS === 'true',
}

// Configuración de CORS
export const CORS_CONFIG = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}

// Función para obtener la URL base de la aplicación
export const getBaseUrl = () => {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL
  }
  
  return isDevelopment ? 'http://localhost:3000' : 'https://your-app.vercel.app'
}

export default {
  API_CONFIG,
  ENDPOINTS,
  REDASH_CONFIG,
  FILE_CONFIG,
  UI_CONFIG,
  VALIDATION_CONFIG,
  MESSAGES,
  LOG_CONFIG,
  CORS_CONFIG,
  getHumandAPIKey,
  validateConfig,
  getBaseUrl,
  isDevelopment,
  isProduction,
}

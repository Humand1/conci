// Cliente API de Humand adaptado para Next.js
import axios from 'axios'
import { API_CONFIG, ENDPOINTS, REDASH_CONFIG, getHumandAPIKey } from './config'

class HumandAPIClient {
  constructor() {
    this.baseURL = API_CONFIG.HUMAND_API_BASE_URL
    this.timeout = API_CONFIG.TIMEOUT
    this.maxRetries = API_CONFIG.MAX_RETRIES
    this.retryDelay = API_CONFIG.RETRY_DELAY
    
    // Cache en memoria para el servidor
    this.cache = new Map()
    this.cacheTTL = API_CONFIG.CACHE_TTL * 1000 // Convertir a milisegundos
    
    // Configurar axios
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })
    
    // Interceptor para autenticación
    this.client.interceptors.request.use((config) => {
      try {
        const apiKey = getHumandAPIKey()
        config.headers.Authorization = `Basic ${apiKey}`
      } catch (error) {
        console.error('Error configurando autenticación:', error)
      }
      return config
    })
    
    // Interceptor para manejo de errores y reintentos
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config
        
        // Si no hay configuración de reintento, rechazar
        if (!config || config.__retryCount >= this.maxRetries) {
          return Promise.reject(error)
        }
        
        // Incrementar contador de reintentos
        config.__retryCount = config.__retryCount || 0
        config.__retryCount += 1
        
        // Reintentar solo en errores temporales
        if (error.response?.status >= 500 || error.code === 'ECONNABORTED') {
          await this.delay(this.retryDelay * config.__retryCount)
          return this.client(config)
        }
        
        return Promise.reject(error)
      }
    )
  }
  
  // Función auxiliar para delay
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  // Función para obtener datos del cache
  getFromCache(key) {
    if (!API_CONFIG.CACHE_ENABLED) return null
    
    const cached = this.cache.get(key)
    if (!cached) return null
    
    const { data, timestamp } = cached
    const now = Date.now()
    
    if (now - timestamp > this.cacheTTL) {
      this.cache.delete(key)
      return null
    }
    
    return data
  }
  
  // Función para guardar en cache
  setCache(key, data) {
    if (!API_CONFIG.CACHE_ENABLED) return
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }
  
  // Limpiar cache
  clearCache() {
    this.cache.clear()
  }
  
  // Obtener segmentaciones
  async getSegmentations() {
    const cacheKey = 'segmentations'
    const cached = this.getFromCache(cacheKey)
    
    if (cached) {
      return cached
    }
    
    try {
      const response = await this.client.get(ENDPOINTS.segmentations)
      const segmentations = this.processSegmentations(response.data)
      
      this.setCache(cacheKey, segmentations)
      return segmentations
    } catch (error) {
      console.error('Error obteniendo segmentaciones:', error)
      throw new Error(`Error obteniendo segmentaciones: ${error.message}`)
    }
  }
  
  // Procesar datos de segmentaciones
  processSegmentations(rawData) {
    if (!Array.isArray(rawData)) {
      throw new Error('Formato de datos de segmentaciones inválido')
    }
    
    return rawData.map(group => ({
      group: String(group.id),
      group_name: group.sharedId || group.name || `Grupo_${group.id}`,
      display_name: group.name || `Grupo ${group.id}`,
      items: (group.items || []).map(item => ({
        name: String(item.id),
        item_name: item.sharedId || item.name || `Item_${item.id}`,
        display_name: item.name || `Item ${item.id}`,
        user_count: item.usersCount || 0
      }))
    })).filter(group => group.items.length > 0)
  }
  
  // Obtener usuarios de segmentaciones
  async getSegmentationUsers(itemIds, limit = 500) {
    // Convertir a array si es necesario
    const ids = Array.isArray(itemIds) ? itemIds : [itemIds]
    const idsString = ids.join(',')
    
    const cacheKey = `users_${idsString}_${limit}`
    const cached = this.getFromCache(cacheKey)
    
    if (cached) {
      return cached
    }
    
    try {
      const params = {
        segmentationItemIds: idsString,
        limit
      }
      
      const response = await this.client.get(ENDPOINTS.segmentation_users, { params })
      const users = this.processSegmentationUsers(response.data)
      
      this.setCache(cacheKey, users)
      return users
    } catch (error) {
      console.error('Error obteniendo usuarios de segmentaciones:', error)
      throw new Error(`Error obteniendo usuarios: ${error.message}`)
    }
  }
  
  // Procesar datos de usuarios de segmentaciones
  processSegmentationUsers(rawData) {
    if (!rawData.items || !Array.isArray(rawData.items)) {
      return []
    }
    
    return rawData.items.map(user => ({
      id: user.id,
      employee_internal_id: user.employeeInternalId,
      first_name: user.firstName || '',
      last_name: user.lastName || '',
      full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email || '',
      active: true // Asumimos que están activos si aparecen en la segmentación
    }))
  }
  
  // Obtener usuarios únicos de múltiples segmentaciones
  async getUsersForMultipleSegmentations(itemIds) {
    if (!itemIds || itemIds.length === 0) {
      return []
    }
    
    try {
      // Para múltiples segmentaciones, hacer una sola llamada con todos los IDs
      const users = await this.getSegmentationUsers(itemIds)
      
      // Eliminar duplicados basado en ID
      const uniqueUsers = []
      const seenIds = new Set()
      
      for (const user of users) {
        const userId = user.id || user.employee_internal_id
        if (userId && !seenIds.has(userId)) {
          seenIds.add(userId)
          uniqueUsers.push(user)
        }
      }
      
      return uniqueUsers
    } catch (error) {
      console.error('Error obteniendo usuarios de múltiples segmentaciones:', error)
      throw error
    }
  }
  
  // Obtener carpetas desde Redash
  async getFolders() {
    const cacheKey = 'folders'
    const cached = this.getFromCache(cacheKey)
    
    if (cached) {
      return cached
    }
    
    try {
      // Primero hacer refresh de la query
      await this.refreshRedashQuery()
      
      // Luego obtener los resultados
      const url = `${REDASH_CONFIG.base_url}/${REDASH_CONFIG.folders_query_id}/results.json`
      const params = {
        api_key: REDASH_CONFIG.api_key,
        max_age: 0 // Evitar cache
      }
      
      const response = await axios.get(url, {
        params,
        timeout: REDASH_CONFIG.timeout,
        headers: {
          'Authorization': `Key ${REDASH_CONFIG.api_key}`,
          'Accept': 'application/json'
        }
      })
      
      const folders = this.processRedashFolders(response.data)
      this.setCache(cacheKey, folders)
      
      return folders
    } catch (error) {
      console.error('Error obteniendo carpetas desde Redash:', error)
      throw new Error(`Error obteniendo carpetas: ${error.message}`)
    }
  }
  
  // Hacer refresh de la query de Redash
  async refreshRedashQuery() {
    try {
      const url = `${REDASH_CONFIG.base_url}/${REDASH_CONFIG.folders_query_id}/refresh`
      
      await axios.post(url, {}, {
        timeout: REDASH_CONFIG.timeout,
        headers: {
          'Authorization': `Key ${REDASH_CONFIG.api_key}`,
          'Content-Type': 'application/json'
        }
      })
      
      // Esperar un momento para que el refresh se complete
      await this.delay(REDASH_CONFIG.refresh_wait_time)
    } catch (error) {
      console.warn('Error en refresh de Redash:', error.message)
      // No lanzar error, continuar con los datos existentes
    }
  }
  
  // Procesar datos de carpetas de Redash
  processRedashFolders(rawData) {
    if (!rawData.query_result?.data?.rows) {
      return []
    }
    
    return rawData.query_result.data.rows.map((row, index) => {
      if (Array.isArray(row)) {
        return {
          id: row[0],
          name: row[1] || `Carpeta_${index + 1}`,
          description: row[2] || '',
          parent_id: row[3] || null,
          created_at: row[4] || null
        }
      } else if (typeof row === 'object') {
        return {
          id: row.folder_id || row.id,
          name: row.folder_name || row.name || `Carpeta_${index + 1}`,
          description: row.description || '',
          parent_id: row.parent_id || null,
          created_at: row.created_at || null
        }
      }
      return null
    }).filter(folder => folder && folder.id)
  }
  
  // Subir documento a un usuario
  async uploadDocument(userId, fileBuffer, filename, options = {}) {
    try {
      const {
        folderId,
        signatureStatus = 'SIGNATURE_NOT_NEEDED',
        signatureCoordinates = null,
        sendNotification = false
      } = options
      
      const endpoint = ENDPOINTS.upload_document.replace('{user_id}', userId)
      
      // Preparar form data
      const formData = new FormData()
      formData.append('file', new Blob([fileBuffer], { type: 'application/pdf' }), filename)
      formData.append('folderId', String(folderId))
      formData.append('name', filename)
      formData.append('sendNotification', sendNotification ? 'true' : 'false')
      formData.append('signatureStatus', signatureStatus)
      formData.append('allowDisagreement', 'false')
      
      if (signatureCoordinates) {
        formData.append('signatureCoordinates', JSON.stringify(signatureCoordinates))
      }
      
      const response = await this.client.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutos para subidas
      })
      
      return {
        success: true,
        data: response.data,
        status: response.status
      }
    } catch (error) {
      console.error('Error subiendo documento:', error)
      return {
        success: false,
        error: error.message,
        status: error.response?.status || null
      }
    }
  }
  
  // Validar que un usuario existe
  async validateUser(userId) {
    try {
      const response = await this.client.get(`/users/${userId}`)
      return response.status === 200
    } catch (error) {
      return false
    }
  }
  
  // Obtener estadísticas del cache
  getCacheStats() {
    return {
      entries: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Crear instancia singleton
let apiClientInstance = null

export const getAPIClient = () => {
  if (!apiClientInstance) {
    apiClientInstance = new HumandAPIClient()
  }
  return apiClientInstance
}

export default HumandAPIClient

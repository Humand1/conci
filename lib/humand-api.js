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
    
    // Interceptor para autenticación y logging detallado (replicando v1.0)
    this.client.interceptors.request.use((config) => {
      try {
        const apiKey = getHumandAPIKey()
        config.headers.Authorization = `Basic ${apiKey}`
        
        // DEBUG: Logging detallado de requests (igual que v1.0)
        console.log(`DEBUG _make_request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`)
        console.log(`DEBUG Headers enviados:`, config.headers)
        console.log(`DEBUG Params:`, config.params || 'None')
        
      } catch (error) {
        console.error('Error configurando autenticación:', error)
      }
      return config
    })
    
    // Interceptor para manejo de errores, reintentos y logging de respuestas
    this.client.interceptors.response.use(
      (response) => {
        // DEBUG: Logging detallado de respuestas exitosas (igual que v1.0)
        console.log(`DEBUG Status: ${response.status}`)
        console.log(`DEBUG: Respuesta exitosa ${response.status}`)
        
        return response
      },
      async (error) => {
        const config = error.config
        
        // DEBUG: Logging detallado de errores (igual que v1.0)
        console.log(`DEBUG: Error ${error.response?.status || 'NETWORK'}, detalles:`)
        console.log(`DEBUG Response status:`, error.response?.status)
        console.log(`DEBUG Response text:`, error.response?.data || error.message)
        console.log(`DEBUG: Tipo de error capturado:`, error.name)
        
        // Si no hay configuración de reintento, rechazar
        if (!config || config.__retryCount >= this.maxRetries) {
          console.log(`DEBUG: Todos los intentos fallaron o no hay config de reintento`)
          return Promise.reject(error)
        }
        
        // Incrementar contador de reintentos
        config.__retryCount = config.__retryCount || 0
        config.__retryCount += 1
        
        // Reintentar solo en errores temporales
        if (error.response?.status >= 500 || error.code === 'ECONNABORTED') {
          console.log(`DEBUG: Error temporal ${error.response?.status || error.code}, reintentando intento ${config.__retryCount}...`)
          await this.delay(this.retryDelay * config.__retryCount)
          return this.client(config)
        }
        
        console.log(`DEBUG: Error no temporal, lanzando excepción`)
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
      console.log('DEBUG: Segmentaciones obtenidas del cache')
      return cached
    }
    
    try {
      console.log('DEBUG: Iniciando petición de segmentaciones...')
      const response = await this.client.get(ENDPOINTS.segmentations)
      
      // DEBUG: Imprimir respuesta cruda (igual que v1.0)
      console.log("=" * 80)
      console.log("DEBUG: Respuesta cruda de la API de segmentaciones:")
      console.log(`Status Code: ${response.status}`)
      console.log(`Headers: ${JSON.stringify(response.headers, null, 2)}`)
      console.log(`Raw Response: ${JSON.stringify(response.data, null, 2)}`)
      console.log("=" * 80)
      
      const segmentations = this.processSegmentations(response.data)
      
      console.log(`DEBUG: Segmentaciones procesadas: ${segmentations.length}`)
      segmentations.forEach((seg, i) => {
        console.log(`  ${i+1}. ${seg.display_name} (${seg.items.length} items)`)
      })
      console.log("=" * 80)
      
      this.setCache(cacheKey, segmentations)
      console.log(`✅ Cargadas ${segmentations.length} segmentaciones`)
      return segmentations
    } catch (error) {
      console.error('DEBUG: Error en getSegmentations:', error)
      console.error('DEBUG: Tipo de error:', typeof error)
      console.error('DEBUG: Stack trace:', error.stack)
      throw new Error(`Error obteniendo segmentaciones: ${error.message}`)
    }
  }
  
  // Procesar datos de segmentaciones (replicando validaciones robustas de v1.0)
  processSegmentations(rawData) {
    const segmentations = []
    
    try {
      console.log(`DEBUG processSegmentations: Procesando datos de tipo ${typeof rawData}`)
      console.log(`DEBUG processSegmentations: Contenido:`, rawData)
      
      // Validar que rawData sea una lista
      if (!Array.isArray(rawData)) {
        console.log(`DEBUG: rawData no es una lista, es ${typeof rawData}`)
        // Intentar extraer datos si viene en un wrapper
        if (typeof rawData === 'object' && rawData !== null) {
          if (rawData.data) {
            rawData = rawData.data
          } else if (rawData.items) {
            rawData = rawData.items
          } else {
            console.log(`DEBUG: No se encontró estructura conocida en object:`, Object.keys(rawData))
            return []
          }
        } else {
          return []
        }
      }
      
      // Procesar cada grupo
      rawData.forEach((groupData, i) => {
        console.log(`DEBUG: Procesando grupo ${i}:`, groupData)
        
        if (typeof groupData !== 'object' || groupData === null) {
          console.log(`DEBUG: Grupo ${i} no es object, saltando`)
          return
        }
        
        // Validar campos requeridos
        const groupId = groupData.id
        if (groupId === null || groupId === undefined) {
          console.log(`DEBUG: Grupo ${i} no tiene ID, saltando`)
          return
        }
        
        // Crear información del grupo con validaciones
        const groupInfo = {
          group: String(groupId),
          group_name: groupData.sharedId || groupData.name || `Grupo_${groupId}`,
          display_name: groupData.name || `Grupo ${groupId}`,
          items: []
        }
        
        console.log(`DEBUG: Grupo creado: ${groupInfo.display_name} (ID: ${groupInfo.group})`)
        
        // Procesar items del grupo
        let itemsData = groupData.items || []
        if (!Array.isArray(itemsData)) {
          console.log(`DEBUG: Items no es lista en grupo ${groupId}`)
          itemsData = []
        }
        
        itemsData.forEach((itemData, j) => {
          console.log(`DEBUG: Procesando item ${j} del grupo ${groupId}:`, itemData)
          
          if (typeof itemData !== 'object' || itemData === null) {
            console.log(`DEBUG: Item ${j} no es object, saltando`)
            return
          }
          
          const itemId = itemData.id
          if (itemId === null || itemId === undefined) {
            console.log(`DEBUG: Item ${j} no tiene ID, saltando`)
            return
          }
          
          const itemInfo = {
            name: String(itemId),
            item_name: itemData.sharedId || itemData.name || `Item_${itemId}`,
            display_name: itemData.name || `Item ${itemId}`,
            user_count: itemData.usersCount || 0
          }
          
          groupInfo.items.push(itemInfo)
          console.log(`DEBUG: Item agregado: ${itemInfo.display_name} (ID: ${itemInfo.name}, Usuarios: ${itemInfo.user_count})`)
        })
        
        // Solo agregar grupos que tengan items válidos
        if (groupInfo.items.length > 0) {
          segmentations.push(groupInfo)
          console.log(`DEBUG: Grupo agregado con ${groupInfo.items.length} items`)
        } else {
          console.log(`DEBUG: Grupo ${groupId} no tiene items válidos, saltando`)
        }
      })
      
      console.log(`DEBUG: Procesamiento completado. ${segmentations.length} grupos válidos`)
      return segmentations
      
    } catch (error) {
      console.error(`DEBUG: Error en processSegmentations:`, error)
      console.error(`DEBUG: Stack trace:`, error.stack)
      throw new Error(`Error procesando segmentaciones: ${error.message}`)
    }
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
      console.log('🔄 Paso 1: Refrescando datos en Redash...')
      // Primero hacer refresh de la query
      await this.refreshRedashQuery()
      
      console.log('📊 Paso 2: Obteniendo carpetas con datos actualizados...')
      // Luego obtener los resultados con max_age=0
      const url = `${REDASH_CONFIG.base_url}/api/queries/${REDASH_CONFIG.folders_query_id}/results.json`
      const params = {
        api_key: REDASH_CONFIG.query_api_key,
        max_age: 0 // Evitar cache
      }
      
      console.log('🌐 URL de solicitud:', `${url}?api_key=${REDASH_CONFIG.query_api_key}&max_age=0`)
      
      const response = await axios.get(url, {
        params,
        timeout: REDASH_CONFIG.timeout,
        headers: {
          'Authorization': `Key ${REDASH_CONFIG.account_api_key}`,
          'Accept': 'application/json'
        }
      })
      
      const folders = this.processRedashFolders(response.data)
      this.setCache(cacheKey, folders)
      
      console.log('✅ Carpetas cargadas exitosamente:', folders.length)
      return folders
    } catch (error) {
      console.error('❌ Error obteniendo carpetas desde Redash:', error)
      throw new Error(`Error obteniendo carpetas: ${error.message}`)
    }
  }
  
  // Hacer refresh de la query de Redash
  async refreshRedashQuery() {
    try {
      const url = `${REDASH_CONFIG.base_url}/api/queries/${REDASH_CONFIG.folders_query_id}/refresh`
      
      console.log('🔄 Forzando actualización de datos en Redash...')
      await axios.post(url, {}, {
        timeout: REDASH_CONFIG.timeout,
        headers: {
          'Authorization': `Key ${REDASH_CONFIG.account_api_key}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('✅ Refresh de Redash completado exitosamente')
      // Esperar un momento para que el refresh se complete
      await this.delay(REDASH_CONFIG.refresh_wait_time)
    } catch (error) {
      console.warn('⚠️ Error en refresh de Redash:', error.message)
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
      
      // Preparar form data según manual de API de Humand
      const formData = new FormData()
      formData.append('file', new Blob([fileBuffer], { type: 'application/pdf' }), filename)
      formData.append('folderId', String(folderId))
      formData.append('name', filename)
      formData.append('sendNotification', sendNotification ? 'true' : 'false')
      formData.append('signatureStatus', signatureStatus)
      formData.append('allowDisagreement', 'false')
      
      // signature_coordinates debe ser un STRING JSON según el manual (usando snake_case como DYLO)
      if (signatureCoordinates) {
        formData.append('signature_coordinates', JSON.stringify(signatureCoordinates))
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

// API Route para obtener usuarios de segmentaciones
import { getAPIClient } from '../../lib/humand-api'
import { validateConfig, VALIDATION_CONFIG } from '../../lib/config'

export default async function handler(req, res) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Método no permitido',
      message: 'Solo se permite POST'
    })
  }
  
  try {
    // Validar configuración
    const configValidation = validateConfig()
    if (!configValidation.isValid) {
      return res.status(500).json({
        error: 'Configuración inválida',
        message: 'Las credenciales de API no están configuradas correctamente',
        details: configValidation.errors
      })
    }
    
    // Validar parámetros de entrada
    const { segmentationItemIds, limit } = req.body
    
    if (!segmentationItemIds || !Array.isArray(segmentationItemIds) || segmentationItemIds.length === 0) {
      return res.status(400).json({
        error: 'Parámetros inválidos',
        message: 'Se requiere un array de segmentationItemIds'
      })
    }
    
    // Validar límite de usuarios
    if (segmentationItemIds.length > VALIDATION_CONFIG.MAX_USERS_PER_BATCH) {
      return res.status(400).json({
        error: 'Demasiadas segmentaciones',
        message: `Máximo ${VALIDATION_CONFIG.MAX_USERS_PER_BATCH} segmentaciones por solicitud`
      })
    }
    
    // Obtener cliente API
    const apiClient = getAPIClient()
    
    // Obtener usuarios únicos de múltiples segmentaciones
    const users = await apiClient.getUsersForMultipleSegmentations(segmentationItemIds)
    
    // Aplicar límite si se especifica
    const limitedUsers = limit && limit > 0 ? users.slice(0, limit) : users
    
    // Calcular estadísticas
    const stats = {
      totalUsers: users.length,
      returnedUsers: limitedUsers.length,
      segmentationsRequested: segmentationItemIds.length,
      hasMore: limit && users.length > limit
    }
    
    // Agregar información adicional de usuarios
    const enrichedUsers = limitedUsers.map(user => ({
      ...user,
      display_name: user.full_name || `${user.first_name} ${user.last_name}`.trim() || user.email || user.employee_internal_id || 'Usuario sin nombre'
    }))
    
    res.status(200).json({
      success: true,
      data: enrichedUsers,
      stats,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error en API de usuarios:', error)
    
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

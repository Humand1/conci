// API Route para obtener segmentaciones
import { getAPIClient } from '../../lib/humand-api'
import { validateConfig } from '../../lib/config'

export default async function handler(req, res) {
  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Método no permitido',
      message: 'Solo se permite GET'
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
    
    // Obtener cliente API
    const apiClient = getAPIClient()
    
    // Obtener segmentaciones
    const segmentations = await apiClient.getSegmentations()
    
    // Calcular estadísticas
    const stats = {
      totalGroups: segmentations.length,
      totalItems: segmentations.reduce((sum, group) => sum + group.items.length, 0),
      totalUsers: segmentations.reduce((sum, group) => 
        sum + group.items.reduce((itemSum, item) => itemSum + (item.user_count || 0), 0), 0
      )
    }
    
    res.status(200).json({
      success: true,
      data: segmentations,
      stats,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error en API de segmentaciones:', error)
    
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

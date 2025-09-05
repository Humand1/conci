// API Route para obtener carpetas desde Redash
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
    
    // Obtener carpetas desde Redash
    const folders = await apiClient.getFolders()
    
    // Ordenar carpetas por nombre
    const sortedFolders = folders.sort((a, b) => 
      (a.name || '').localeCompare(b.name || '')
    )
    
    // Calcular estadísticas
    const stats = {
      totalFolders: folders.length,
      foldersWithParent: folders.filter(f => f.parent_id).length,
      rootFolders: folders.filter(f => !f.parent_id).length
    }
    
    res.status(200).json({
      success: true,
      data: sortedFolders,
      stats,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error en API de carpetas:', error)
    
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

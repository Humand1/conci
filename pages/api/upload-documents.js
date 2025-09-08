// API Route para subir documentos a Humand
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
    const { 
      documents, 
      folder_id, 
      signatureStatus = 'SIGNATURE_NOT_NEEDED',
      signature_coordinates = null,
      send_notification = false 
    } = req.body
    
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        error: 'Documentos requeridos',
        message: 'Debe proporcionar al menos un documento para subir'
      })
    }
    
    if (!folder_id) {
      return res.status(400).json({
        error: 'Carpeta requerida',
        message: 'Debe especificar una carpeta de destino'
      })
    }
    
    // Validar límite de documentos
    if (documents.length > VALIDATION_CONFIG.MAX_USERS_PER_BATCH) {
      return res.status(400).json({
        error: 'Demasiados documentos',
        message: `Máximo ${VALIDATION_CONFIG.MAX_USERS_PER_BATCH} documentos por solicitud`
      })
    }
    
    // Obtener cliente API
    const apiClient = getAPIClient()
    
    // Configurar callback de progreso para SSE si se solicita
    let progressCallback = null
    if (req.headers.accept && req.headers.accept.includes('text/event-stream')) {
      // Configurar SSE para progreso en tiempo real
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      })
      
      progressCallback = (progress) => {
        res.write(`data: ${JSON.stringify({
          type: 'progress',
          ...progress
        })}\n\n`)
      }
    }
    
    // Procesar subidas
    const results = []
    const errors = []
    
    for (let i = 0; i < documents.length; i++) {
      const document = documents[i]
      
      try {
        // Reportar progreso
        if (progressCallback) {
          progressCallback({
            current: i + 1,
            total: documents.length,
            user: document.user.full_name || 'Usuario desconocido',
            filename: document.filename,
            percentage: Math.round(((i + 1) / documents.length) * 100)
          })
        }
        
        // Validar documento
        if (!document.buffer || !document.filename || !document.user) {
          throw new Error('Documento incompleto: faltan buffer, filename o user')
        }
        
        // Convertir buffer de base64 si es necesario
        let fileBuffer
        if (typeof document.buffer === 'string') {
          fileBuffer = Buffer.from(document.buffer, 'base64')
        } else {
          fileBuffer = document.buffer
        }
        
        // Preparar coordenadas de firma si se proporcionan
        let formattedCoordinates = null
        if (signature_coordinates && signatureStatus === 'PENDING') {
          formattedCoordinates = [{
            page: signature_coordinates.page || 0,
            x: signature_coordinates.x || 0,
            y: signature_coordinates.y || 0,
            width: signature_coordinates.width || 100,
            height: signature_coordinates.height || 50
          }]
        }
        
        // Subir documento
        const uploadResult = await apiClient.uploadDocument(
          document.user.id || document.user.employee_internal_id,
          fileBuffer,
          document.filename,
          {
            folderId: folder_id,
            signatureStatus,
            signatureCoordinates: formattedCoordinates,
            sendNotification: send_notification
          }
        )
        
        if (uploadResult.success) {
          results.push({
            filename: document.filename,
            user: {
              id: document.user.id,
              full_name: document.user.full_name,
              email: document.user.email
            },
            status: 'success',
            uploadData: uploadResult.data
          })
        } else {
          errors.push({
            filename: document.filename,
            user: {
              id: document.user.id,
              full_name: document.user.full_name,
              email: document.user.email
            },
            status: 'error',
            error: uploadResult.error,
            statusCode: uploadResult.status
          })
        }
        
      } catch (error) {
        console.error(`Error subiendo ${document.filename}:`, error)
        errors.push({
          filename: document.filename,
          user: document.user ? {
            id: document.user.id,
            full_name: document.user.full_name,
            email: document.user.email
          } : null,
          status: 'error',
          error: error.message
        })
      }
    }
    
    // Calcular estadísticas
    const stats = {
      total: documents.length,
      successful: results.length,
      failed: errors.length,
      successRate: (results.length / documents.length) * 100
    }
    
    if (progressCallback) {
      // Enviar resultado final por SSE
      progressCallback({
        type: 'complete',
        success: true,
        stats,
        results: results.length,
        errors: errors.length
      })
      
      res.write('data: [DONE]\n\n')
      res.end()
    } else {
      // Respuesta JSON normal
      res.status(200).json({
        success: true,
        data: {
          successful: results,
          failed: errors
        },
        stats,
        timestamp: new Date().toISOString()
      })
    }
    
  } catch (error) {
    console.error('Error en API de subida:', error)
    
    if (res.headersSent) {
      // Si ya se enviaron headers (SSE), enviar error por stream
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: error.message
      })}\n\n`)
      res.end()
    } else {
      res.status(500).json({
        error: 'Error interno del servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    }
  }
}

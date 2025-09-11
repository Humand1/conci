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
    
    // Validar parámetros de entrada (soportar tanto camelCase como snake_case)
    const { 
      documents, 
      folderId, 
      folder_id,  // Compatibilidad con snake_case del frontend
      signatureStatus = 'SIGNATURE_NOT_NEEDED',
      signatureCoordinates = null,
      signature_coordinates = null,  // Compatibilidad con snake_case del frontend
      sendNotification = false,
      send_notification = false  // Compatibilidad con snake_case del frontend
    } = req.body
    
    // Usar el valor correcto (priorizar camelCase, fallback a snake_case)
    const finalFolderId = folderId || folder_id
    const finalSignatureCoordinates = signatureCoordinates || signature_coordinates
    const finalSendNotification = sendNotification || send_notification
    
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        error: 'Documentos requeridos',
        message: 'Debe proporcionar al menos un documento para subir'
      })
    }
    
    if (!finalFolderId) {
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
        if (finalSignatureCoordinates && signatureStatus === 'PENDING') {
          // Extraer coordenadas normalizadas del objeto complejo
          let coords = finalSignatureCoordinates
          
          // Si viene con estructura compleja (normalized, absolute, etc.), extraer solo normalized
          if (finalSignatureCoordinates.normalized) {
            coords = finalSignatureCoordinates.normalized
            console.log(`📍 Extrayendo coordenadas normalizadas:`, coords)
          }
          
          // Calcular height si no existe (usar proporción similar al width)
          let height = coords.height
          if (!height && coords.width) {
            // Usar una proporción razonable para el height basado en el width
            height = coords.width * 0.2 // 20% del width como height por defecto
            console.log(`📏 Height calculado automáticamente: ${height}`)
          }
          
          // Crear array con un solo objeto de coordenadas (formato esperado por la API)
          formattedCoordinates = [{
            page: coords.page || 0,
            x: coords.x || 0,
            y: coords.y || 0,
            width: coords.width || 0.1,
            height: height || 0.02
          }]
          
          console.log(`✅ Coordenadas formateadas para API:`, formattedCoordinates)
        }
        
        // DEBUG: Información antes de subir
        console.log(`\n🔄 PROCESANDO DOCUMENTO ${i + 1}/${documents.length}`)
        console.log(`📁 Archivo: ${document.filename}`)
        console.log(`👤 Usuario: ${document.user.full_name} (ID: ${document.user.id})`)
        console.log(`📂 Folder ID: ${finalFolderId}`)
        console.log(`✍️ Signature Status: ${signatureStatus}`)
        console.log(`📍 Coordenadas formateadas:`, formattedCoordinates)
        console.log(`✉️ Send Notification: ${finalSendNotification}`)
        
        // Subir documento
        const uploadResult = await apiClient.uploadDocument(
          document.user.id || document.user.employee_internal_id,
          fileBuffer,
          document.filename,
          {
            folderId: finalFolderId,
            signatureStatus,
            signatureCoordinates: formattedCoordinates,
            sendNotification: finalSendNotification
          }
        )
        
        // DEBUG: Resultado de la subida
        console.log(`\n📊 RESULTADO DE SUBIDA:`)
        console.log(`✅ Éxito: ${uploadResult.success}`)
        console.log(`📊 Status: ${uploadResult.status}`)
        if (uploadResult.success) {
          console.log(`📄 Data:`, JSON.stringify(uploadResult.data, null, 2))
        } else {
          console.log(`❌ Error: ${uploadResult.error}`)
          if (uploadResult.fullError) {
            console.log(`🔍 Error completo:`, JSON.stringify(uploadResult.fullError, null, 2))
          }
        }
        
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
          console.log(`✅ Documento agregado a resultados exitosos`)
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
            statusCode: uploadResult.status,
            fullError: uploadResult.fullError
          })
          console.log(`❌ Documento agregado a errores`)
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

// API Route para mostrar el payload que se enviará a Humand (debug)
import formidable from 'formidable'
import { validateConfig, FILE_CONFIG } from '../../lib/config'
import { getHumandAPIKey } from '../../lib/config'

// Configuración para Next.js API
export const config = {
  api: {
    bodyParser: false, // Desactivar el parser por defecto para manejar archivos
  },
}

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
    
    // Configurar formidable para manejar archivos
    const form = formidable({
      maxFileSize: FILE_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024, // Convertir a bytes
      keepExtensions: true,
      allowEmptyFiles: false,
    })
    
    // Parsear el formulario
    const [fields, files] = await form.parse(req)
    
    // Validar que se subió un archivo
    if (!files.pdf || !files.pdf[0]) {
      return res.status(400).json({
        error: 'Archivo requerido',
        message: 'Debe subir un archivo PDF para generar el payload'
      })
    }
    
    // Validar parámetros
    const users = fields.users ? JSON.parse(fields.users[0]) : []
    const folderId = fields.folderId ? parseInt(fields.folderId[0]) : null
    const signatureStatus = fields.signatureStatus ? fields.signatureStatus[0] : 'SIGNATURE_NOT_NEEDED'
    const signatureCoordinates = fields.signatureCoordinates ? 
      JSON.parse(fields.signatureCoordinates[0]) : null
    const sendNotification = fields.sendNotification ? 
      fields.sendNotification[0] === 'true' : false
    
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        error: 'Usuarios requeridos',
        message: 'Debe proporcionar al menos un usuario para generar el payload'
      })
    }
    
    if (!folderId) {
      return res.status(400).json({
        error: 'Carpeta requerida',
        message: 'Debe especificar una carpeta de destino'
      })
    }
    
    const pdfFile = files.pdf[0]
    
    // Leer el archivo PDF
    const fs = require('fs')
    const pdfBuffer = fs.readFileSync(pdfFile.filepath)
    
    // Generar payloads para cada usuario
    const payloads = []
    const apiKey = getHumandAPIKey()
    
    for (let i = 0; i < Math.min(users.length, 3); i++) { // Limitar a 3 usuarios para el debug
      const user = users[i]
      
      // Preparar coordenadas de firma si se proporcionan
      let formattedCoordinates = null
      if (signatureCoordinates && signatureStatus === 'PENDING') {
        // Extraer coordenadas normalizadas del objeto complejo
        let coords = signatureCoordinates
        
        // Si viene con estructura compleja (normalized, absolute, etc.), extraer solo normalized
        if (signatureCoordinates.normalized) {
          coords = signatureCoordinates.normalized
        }
        
        // Calcular height si no existe (usar proporción similar al width)
        let height = coords.height
        if (!height && coords.width) {
          height = coords.width * 0.2 // 20% del width como height por defecto
        }
        
        formattedCoordinates = [{
          page: coords.page || 0,
          x: coords.x || 0,
          y: coords.y || 0,
          width: coords.width || 0.1,
          height: height || 0.02
        }]
      }
      
      // Generar payload JSON (igual que en uploadDocument)
      const requestBody = {
        file: pdfBuffer.toString('base64'), // Convertir buffer a base64
        folderId: folderId, // Como number
        name: pdfFile.originalFilename,
        sendNotification: sendNotification, // Como boolean
        signatureStatus: signatureStatus,
        signatureCoordinates: formattedCoordinates || [], // Como array
        allowDisagreement: false // Como boolean
      }
      
      // Información adicional para debug
      const debugInfo = {
        userId: user.id || user.employee_internal_id,
        userName: user.full_name,
        userEmail: user.email,
        endpoint: `/users/${user.id || user.employee_internal_id}/documents`,
        headers: {
          'Authorization': `Basic ${apiKey.substring(0, 20)}...`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        payload: requestBody,
        payloadStats: {
          originalFileSize: pdfBuffer.length,
          base64FileSize: requestBody.file.length,
          compressionRatio: (requestBody.file.length / pdfBuffer.length).toFixed(2),
          estimatedRequestSize: JSON.stringify(requestBody).length
        }
      }
      
      payloads.push(debugInfo)
    }
    
    // Limpiar archivo temporal
    fs.unlinkSync(pdfFile.filepath)
    
    // Respuesta con información completa
    res.status(200).json({
      success: true,
      message: `Payload generado para ${payloads.length} usuario(s) (máximo 3 para debug)`,
      totalUsers: users.length,
      debugPayloads: payloads,
      globalInfo: {
        apiBaseUrl: process.env.HUMAND_API_BASE_URL,
        timestamp: new Date().toISOString(),
        fileInfo: {
          originalName: pdfFile.originalFilename,
          size: pdfBuffer.length,
          mimeType: pdfFile.mimetype
        },
        requestConfig: {
          folderId,
          signatureStatus,
          sendNotification,
          hasSignatureCoordinates: !!signatureCoordinates
        }
      }
    })
    
  } catch (error) {
    console.error('Error generando payload de debug:', error)
    
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

// API Route para duplicar PDFs
import formidable from 'formidable'
import { getPDFProcessor } from '../../lib/pdf-processor'
import { validateConfig, FILE_CONFIG } from '../../lib/config'

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
        message: 'Debe subir un archivo PDF'
      })
    }
    
    // Validar parámetros
    const users = fields.users ? JSON.parse(fields.users[0]) : []
    const prefix = fields.prefix ? fields.prefix[0] : ''
    const namingPattern = fields.namingPattern ? fields.namingPattern[0] : 'username'
    const signatureCoordinates = fields.signatureCoordinates ? 
      JSON.parse(fields.signatureCoordinates[0]) : null
    
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        error: 'Usuarios requeridos',
        message: 'Debe proporcionar al menos un usuario'
      })
    }
    
    const pdfFile = files.pdf[0]
    
    // Obtener procesador de PDF
    const pdfProcessor = getPDFProcessor()
    
    // Validar archivo PDF
    const fileValidation = pdfProcessor.validatePDFFile({
      name: pdfFile.originalFilename,
      size: pdfFile.size,
      type: pdfFile.mimetype
    })
    
    if (!fileValidation.isValid) {
      return res.status(400).json({
        error: 'Archivo PDF inválido',
        message: 'El archivo no cumple con los requisitos',
        details: fileValidation.errors
      })
    }
    
    // Leer el archivo PDF
    const fs = require('fs')
    const pdfBuffer = fs.readFileSync(pdfFile.filepath)
    
    // Configurar callback de progreso para SSE (Server-Sent Events)
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
    
    // Duplicar PDF para usuarios
    const result = await pdfProcessor.duplicatePDFForUsers(pdfBuffer, users, {
      prefix,
      namingPattern,
      signatureCoordinates,
      onProgress: progressCallback
    })
    
    // Limpiar archivo temporal
    fs.unlinkSync(pdfFile.filepath)
    
    if (progressCallback) {
      // Enviar resultado final por SSE
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        success: result.success,
        data: result.success ? {
          stats: result.stats,
          filesCount: result.results.length,
          errorsCount: result.errors.length
        } : null,
        error: result.success ? null : result.error
      })}\n\n`)
      
      res.write('data: [DONE]\n\n')
      res.end()
    } else {
      // Respuesta JSON normal
      if (result.success) {
        // Convertir buffers a base64 para envío JSON
        const resultsWithBase64 = result.results.map(item => ({
          ...item,
          buffer: Buffer.from(item.buffer).toString('base64'),
          user: {
            id: item.user.id,
            full_name: item.user.full_name,
            email: item.user.email,
            employee_internal_id: item.user.employee_internal_id
          }
        }))
        
        res.status(200).json({
          success: true,
          data: resultsWithBase64,
          errors: result.errors,
          stats: result.stats,
          timestamp: new Date().toISOString()
        })
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
          timestamp: new Date().toISOString()
        })
      }
    }
    
  } catch (error) {
    console.error('Error en API de duplicación:', error)
    
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

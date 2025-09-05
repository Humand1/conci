// Procesador de PDFs para web usando pdf-lib
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { FILE_CONFIG, VALIDATION_CONFIG } from './config'

class PDFProcessor {
  constructor() {
    this.maxFileSize = FILE_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024 // Convertir a bytes
  }
  
  // Validar archivo PDF
  validatePDFFile(file) {
    const errors = []
    
    // Validar tamaño
    if (file.size > this.maxFileSize) {
      errors.push(`El archivo es demasiado grande. Máximo ${FILE_CONFIG.MAX_FILE_SIZE_MB}MB`)
    }
    
    // Validar tipo MIME
    if (!VALIDATION_CONFIG.PDF_MIME_TYPES.includes(file.type)) {
      errors.push('El archivo debe ser un PDF válido')
    }
    
    // Validar extensión
    const fileName = file.name.toLowerCase()
    const hasValidExtension = FILE_CONFIG.ALLOWED_EXTENSIONS.some(ext => 
      fileName.endsWith(ext)
    )
    
    if (!hasValidExtension) {
      errors.push('El archivo debe tener extensión .pdf')
    }
    
    // Validar nombre de archivo
    if (file.name.length > VALIDATION_CONFIG.MAX_FILENAME_LENGTH) {
      errors.push(`El nombre del archivo es demasiado largo. Máximo ${VALIDATION_CONFIG.MAX_FILENAME_LENGTH} caracteres`)
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  // Leer archivo PDF desde File object
  async readPDFFile(file) {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      
      return {
        success: true,
        document: pdfDoc,
        buffer: arrayBuffer,
        pageCount: pdfDoc.getPageCount(),
        size: file.size
      }
    } catch (error) {
      console.error('Error leyendo PDF:', error)
      return {
        success: false,
        error: `Error leyendo el archivo PDF: ${error.message}`
      }
    }
  }
  
  // Duplicar PDF para múltiples usuarios
  async duplicatePDFForUsers(originalBuffer, users, options = {}) {
    const {
      prefix = '',
      namingPattern = 'username',
      signatureCoordinates = null,
      onProgress = null
    } = options
    
    const results = []
    const errors = []
    
    try {
      // Cargar el PDF original una sola vez
      const originalPdf = await PDFDocument.load(originalBuffer)
      
      for (let i = 0; i < users.length; i++) {
        const user = users[i]
        
        try {
          // Reportar progreso
          if (onProgress) {
            onProgress({
              current: i + 1,
              total: users.length,
              user: user.full_name || 'Usuario desconocido',
              percentage: Math.round(((i + 1) / users.length) * 100)
            })
          }
          
          // Crear copia del PDF
          const pdfCopy = await PDFDocument.create()
          const pages = await pdfCopy.copyPages(originalPdf, originalPdf.getPageIndices())
          
          pages.forEach((page) => pdfCopy.addPage(page))
          
          // Aplicar coordenadas de firma si se proporcionan
          if (signatureCoordinates) {
            await this.applySignatureArea(pdfCopy, signatureCoordinates, user)
          }
          
          // Generar el PDF como buffer
          const pdfBytes = await pdfCopy.save()
          
          // Generar nombre de archivo
          const filename = this.generateFilename(user, prefix, namingPattern)
          
          results.push({
            user,
            filename,
            buffer: pdfBytes,
            size: pdfBytes.length,
            success: true
          })
          
        } catch (error) {
          console.error(`Error procesando PDF para ${user.full_name}:`, error)
          errors.push({
            user,
            filename: this.generateFilename(user, prefix, namingPattern),
            error: error.message,
            success: false
          })
        }
      }
      
      return {
        success: true,
        results,
        errors,
        stats: {
          total: users.length,
          successful: results.length,
          failed: errors.length,
          successRate: (results.length / users.length) * 100
        }
      }
      
    } catch (error) {
      console.error('Error en duplicación masiva:', error)
      return {
        success: false,
        error: error.message,
        results: [],
        errors: []
      }
    }
  }
  
  // Aplicar área de firma al PDF
  async applySignatureArea(pdfDoc, signatureCoordinates, user) {
    try {
      const { page, x, y, width, height } = signatureCoordinates
      
      // Validar coordenadas
      if (page < 0 || page >= pdfDoc.getPageCount()) {
        throw new Error(`Página ${page} no existe en el documento`)
      }
      
      const pdfPage = pdfDoc.getPage(page)
      const { width: pageWidth, height: pageHeight } = pdfPage.getSize()
      
      // Validar que las coordenadas estén dentro de la página
      if (x < 0 || y < 0 || x + width > pageWidth || y + height > pageHeight) {
        console.warn('Coordenadas de firma fuera de los límites de la página, ajustando...')
      }
      
      // Dibujar rectángulo de firma (opcional, para visualización)
      pdfPage.drawRectangle({
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: Math.min(width, pageWidth - x),
        height: Math.min(height, pageHeight - y),
        borderColor: rgb(0.7, 0.7, 0.7),
        borderWidth: 1,
        opacity: 0.3
      })
      
      // Agregar texto indicativo (opcional)
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const fontSize = 8
      
      pdfPage.drawText('Área de firma', {
        x: Math.max(0, x + 2),
        y: Math.max(0, y + height - fontSize - 2),
        size: fontSize,
        font,
        color: rgb(0.5, 0.5, 0.5),
        opacity: 0.7
      })
      
    } catch (error) {
      console.error('Error aplicando área de firma:', error)
      // No lanzar error, continuar sin área de firma
    }
  }
  
  // Generar nombre de archivo basado en el patrón
  generateFilename(user, prefix, namingPattern) {
    let identifier = ''
    
    switch (namingPattern) {
      case 'username':
        identifier = user.employee_internal_id || user.id || 'usuario'
        break
      case 'email':
        const email = user.email || ''
        identifier = email.includes('@') ? email.split('@')[0] : email || user.id || 'usuario'
        break
      case 'employee_id':
        identifier = user.employee_internal_id || user.id || 'usuario'
        break
      case 'full_name':
        identifier = (user.full_name || 'Usuario Desconocido')
          .replace(/[^a-zA-Z0-9\s]/g, '') // Remover caracteres especiales
          .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
          .toLowerCase()
        break
      default:
        identifier = user.employee_internal_id || user.id || 'usuario'
    }
    
    // Limpiar identificador
    identifier = this.cleanFilename(identifier)
    
    // Construir nombre final
    const filename = prefix ? `${prefix}_${identifier}.pdf` : `${identifier}.pdf`
    
    return filename
  }
  
  // Limpiar nombre de archivo
  cleanFilename(filename) {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_') // Reemplazar caracteres no válidos
      .replace(/\s+/g, '_') // Reemplazar espacios múltiples
      .replace(/_+/g, '_') // Reemplazar guiones bajos múltiples
      .replace(/^_|_$/g, '') // Remover guiones bajos al inicio y final
      .toLowerCase()
  }
  
  // Obtener información del PDF
  async getPDFInfo(buffer) {
    try {
      const pdfDoc = await PDFDocument.load(buffer)
      
      return {
        success: true,
        info: {
          pageCount: pdfDoc.getPageCount(),
          title: pdfDoc.getTitle() || 'Sin título',
          author: pdfDoc.getAuthor() || 'Desconocido',
          creator: pdfDoc.getCreator() || 'Desconocido',
          producer: pdfDoc.getProducer() || 'Desconocido',
          creationDate: pdfDoc.getCreationDate(),
          modificationDate: pdfDoc.getModificationDate(),
          size: buffer.length
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }
  
  // Obtener dimensiones de una página específica
  async getPageDimensions(buffer, pageIndex = 0) {
    try {
      const pdfDoc = await PDFDocument.load(buffer)
      
      if (pageIndex >= pdfDoc.getPageCount()) {
        throw new Error(`La página ${pageIndex} no existe`)
      }
      
      const page = pdfDoc.getPage(pageIndex)
      const { width, height } = page.getSize()
      
      return {
        success: true,
        dimensions: { width, height },
        pageIndex
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }
  
  // Validar coordenadas de firma
  validateSignatureCoordinates(coordinates, pageWidth, pageHeight) {
    const { x, y, width, height } = coordinates
    const errors = []
    
    // Validar que las coordenadas sean números válidos
    if (typeof x !== 'number' || typeof y !== 'number' || 
        typeof width !== 'number' || typeof height !== 'number') {
      errors.push('Las coordenadas deben ser números válidos')
      return { isValid: false, errors }
    }
    
    // Validar que las coordenadas sean positivas
    if (x < 0 || y < 0 || width <= 0 || height <= 0) {
      errors.push('Las coordenadas deben ser valores positivos')
    }
    
    // Validar tamaño mínimo y máximo
    const minSize = VALIDATION_CONFIG.MIN_SIGNATURE_SIZE * Math.min(pageWidth, pageHeight)
    const maxSize = VALIDATION_CONFIG.MAX_SIGNATURE_SIZE * Math.min(pageWidth, pageHeight)
    
    if (width < minSize || height < minSize) {
      errors.push(`El área de firma es demasiado pequeña (mínimo ${minSize}px)`)
    }
    
    if (width > maxSize || height > maxSize) {
      errors.push(`El área de firma es demasiado grande (máximo ${maxSize}px)`)
    }
    
    // Validar que esté dentro de los límites de la página
    if (x + width > pageWidth || y + height > pageHeight) {
      errors.push('El área de firma se sale de los límites de la página')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  // Convertir coordenadas normalizadas a coordenadas absolutas
  denormalizeCoordinates(normalizedCoords, pageWidth, pageHeight) {
    return {
      x: normalizedCoords.x * pageWidth,
      y: normalizedCoords.y * pageHeight,
      width: normalizedCoords.width * pageWidth,
      height: normalizedCoords.height * pageHeight
    }
  }
  
  // Convertir coordenadas absolutas a coordenadas normalizadas
  normalizeCoordinates(absoluteCoords, pageWidth, pageHeight) {
    return {
      x: absoluteCoords.x / pageWidth,
      y: absoluteCoords.y / pageHeight,
      width: absoluteCoords.width / pageWidth,
      height: absoluteCoords.height / pageHeight
    }
  }
}

// Crear instancia singleton
let processorInstance = null

export const getPDFProcessor = () => {
  if (!processorInstance) {
    processorInstance = new PDFProcessor()
  }
  return processorInstance
}

export default PDFProcessor

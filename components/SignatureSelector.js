// Componente para seleccionar coordenadas de firma en PDF - Mejorado con técnicas de DYLO
import { useState, useRef, useEffect } from 'react'
import { X, PenTool, Save, RotateCcw, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react'

export default function SignatureSelector({ pdfFile, onClose, onSave }) {
  const canvasRef = useRef(null)
  const [pdfDoc, setPdfDoc] = useState(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [currentRect, setCurrentRect] = useState(null)
  const [signatureArea, setSignatureArea] = useState(null)
  const [scale, setScale] = useState(1.5) // Escala fija como en DYLO
  const [loading, setLoading] = useState(true)
  const [pdfjsLib, setPdfjsLib] = useState(null)
  
  // Cargar PDF.js dinámicamente con configuración robusta como DYLO
  useEffect(() => {
    const loadPDFJS = async () => {
      if (typeof window !== 'undefined' && !pdfjsLib) {
        try {
          const pdfjs = await import('pdfjs-dist')
          
          // Configurar el worker con CDN fijo como en DYLO
          pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
          
          setPdfjsLib(pdfjs)
          console.log('PDF.js cargado exitosamente con worker fijo')
        } catch (error) {
          console.error('Error cargando PDF.js:', error)
        }
      }
    }
    
    loadPDFJS()
  }, [])
  
  useEffect(() => {
    if (pdfjsLib && pdfFile) {
      loadPDF()
    }
  }, [pdfFile, pdfjsLib])
  
  const loadPDF = async () => {
    if (!pdfFile) return
    
    try {
      setLoading(true)
      console.log('Iniciando carga de PDF...')
      
      // Cargar PDF usando PDF.js con manejo robusto como DYLO
      const arrayBuffer = await pdfFile.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
      const pdf = await loadingTask.promise
      
      setPdfDoc(pdf)
      setTotalPages(pdf.numPages)
      setCurrentPage(0)
      
      console.log(`PDF cargado: ${pdf.numPages} páginas`)
      
      // Renderizar la primera página automáticamente
      await renderPage(0, pdf)
      
    } catch (error) {
      console.error('Error cargando PDF:', error)
      handlePDFLoadError()
    } finally {
      setLoading(false)
    }
  }
  
  const handlePDFLoadError = () => {
    // Fallback robusto como en DYLO
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      canvas.width = 595
      canvas.height = 842
      
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      ctx.fillStyle = '#666'
      ctx.font = '16px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('Error cargando PDF', canvas.width / 2, canvas.height / 2)
      ctx.fillText('Intente recargar el archivo', canvas.width / 2, canvas.height / 2 + 30)
      ctx.textAlign = 'left'
    }
  }
  
  const renderPage = async (pageNum, pdf = null) => {
    const canvas = canvasRef.current
    const pdfDocument = pdf || pdfDoc
    
    if (!canvas || !pdfDocument) {
      console.log('Canvas o PDF no disponible:', { canvas: !!canvas, pdfDocument: !!pdfDocument })
      return
    }
    
    try {
      console.log(`Renderizando página ${pageNum + 1} de ${pdfDocument.numPages}`)
      
      // Obtener página (PDF.js usa índices basados en 1)
      const page = await pdfDocument.getPage(pageNum + 1)
      
      // Usar escala fija como en DYLO para consistencia
      const viewport = page.getViewport({ scale })
      
      // Configurar canvas con dimensiones del viewport
      canvas.width = viewport.width
      canvas.height = viewport.height
      
      const ctx = canvas.getContext('2d')
      
      // Limpiar canvas completamente
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Renderizar la página del PDF
      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      }
      
      await page.render(renderContext).promise
      console.log('Página renderizada exitosamente')
      
      // Dibujar área de firma existente si hay una
      if (signatureArea) {
        drawSignatureArea(ctx, signatureArea)
      }
      
    } catch (error) {
      console.error('Error renderizando página:', error)
      
      // Fallback robusto como en DYLO
      const ctx = canvas.getContext('2d')
      canvas.width = 595
      canvas.height = 842
      
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      ctx.fillStyle = '#666'
      ctx.font = '16px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('Error cargando página del PDF', canvas.width / 2, canvas.height / 2)
      ctx.textAlign = 'left'
    }
  }
  
  const drawSignatureArea = (ctx, area) => {
    // Guardar estado del contexto
    ctx.save()
    
    // Dibujar borde del área de firma
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.strokeRect(area.x, area.y, area.width, area.height)
    
    // Rellenar con color semi-transparente
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'
    ctx.fillRect(area.x, area.y, area.width, area.height)
    
    // Texto indicativo
    ctx.fillStyle = '#3b82f6'
    ctx.font = '12px Arial'
    ctx.setLineDash([])
    ctx.fillText('Área de firma', area.x + 5, area.y + 15)
    
    // Restaurar estado del contexto
    ctx.restore()
  }
  
  const getMousePos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    }
  }
  
  const handleMouseDown = (e) => {
    const pos = getMousePos(e)
    
    // Limpiar área de firma existente al empezar a dibujar una nueva
    if (signatureArea) {
      setSignatureArea(null)
    }
    
    setIsDrawing(true)
    setStartPos(pos)
    setCurrentRect({ x: pos.x, y: pos.y, width: 0, height: 0 })
  }
  
  const handleMouseMove = (e) => {
    if (!isDrawing) return
    
    const pos = getMousePos(e)
    const rect = {
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      width: Math.abs(pos.x - startPos.x),
      height: Math.abs(pos.y - startPos.y)
    }
    
    setCurrentRect(rect)
    
    // Re-renderizar página y dibujar rectángulo temporal
    renderPageWithTempRect(rect)
  }
  
  const renderPageWithTempRect = async (tempRect) => {
    const canvas = canvasRef.current
    if (!canvas || !pdfDoc) return
    
    try {
      // Re-renderizar la página base
      const page = await pdfDoc.getPage(currentPage + 1)
      const viewport = page.getViewport({ scale })
      
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      }
      
      await page.render(renderContext).promise
      
      // Dibujar rectángulo temporal
      if (tempRect) {
        drawSignatureArea(ctx, tempRect)
      }
      
    } catch (error) {
      console.error('Error re-renderizando con rectángulo temporal:', error)
    }
  }
  
  const handleMouseUp = () => {
    if (!isDrawing || !currentRect) return
    
    setIsDrawing(false)
    
    // Validar tamaño mínimo
    if (currentRect.width < 50 || currentRect.height < 20) {
      alert('El área de firma debe ser más grande (mínimo 50×20 píxeles)')
      setCurrentRect(null)
      renderPage(currentPage)
      return
    }
    
    setSignatureArea(currentRect)
    setCurrentRect(null)
  }
  
  const clearSignature = () => {
    setSignatureArea(null)
    renderPage(currentPage)
  }
  
  const handleSave = async () => {
    if (!signatureArea) {
      alert('Debe seleccionar un área de firma')
      return
    }
    
    try {
      const canvas = canvasRef.current
      
      // Obtener dimensiones reales del PDF (no del canvas renderizado) - técnica de DYLO
      const page = await pdfDoc.getPage(currentPage + 1)
      const viewport = page.getViewport({ scale: 1.0 }) // Escala 1:1 para dimensiones reales
      
      // Calcular el factor de escala entre canvas y PDF real
      const scaleX = viewport.width / canvas.width
      const scaleY = viewport.height / canvas.height
      
      // Convertir coordenadas del canvas a coordenadas del PDF real
      const pdfX1 = signatureArea.x * scaleX
      const pdfY1 = signatureArea.y * scaleY
      const pdfX2 = (signatureArea.x + signatureArea.width) * scaleX
      const pdfY2 = (signatureArea.y + signatureArea.height) * scaleY
      
      // Normalizar coordenadas (dividir por dimensiones del PDF para obtener valores entre 0 y 1)
      const normalizedX = pdfX1 / viewport.width
      const normalizedY = pdfY1 / viewport.height
      const normalizedWidth = (pdfX2 - pdfX1) / viewport.width
      const normalizedHeight = (pdfY2 - pdfY1) / viewport.height
      
      // Validar que las coordenadas normalizadas estén en el rango correcto - validación de DYLO
      if (normalizedX < 0 || normalizedY < 0 || normalizedX > 1 || normalizedY > 1 ||
          normalizedWidth <= 0 || normalizedHeight <= 0 ||
          (normalizedX + normalizedWidth) > 1 || (normalizedY + normalizedHeight) > 1) {
        alert('Error: Las coordenadas están fuera del rango válido del documento')
        return
      }
      
      // Crear objeto de coordenadas en el formato correcto para la API de Humand
      const coords = {
        page: currentPage, // Mantener base 0 para consistencia interna
        x: normalizedX,
        y: normalizedY,
        width: normalizedWidth,
        height: normalizedHeight
      }
      
      console.log('Coordenadas de firma calculadas:', coords)
      
      // Coordenadas absolutas para compatibilidad
      const absoluteCoords = {
        page: currentPage,
        x: signatureArea.x,
        y: signatureArea.y,
        width: signatureArea.width,
        height: signatureArea.height
      }
      
      onSave({
        normalized: coords,
        absolute: absoluteCoords,
        pageWidth: canvas.width,
        pageHeight: canvas.height,
        pdfWidth: viewport.width,
        pdfHeight: viewport.height
      })
      
    } catch (error) {
      console.error('Error al procesar coordenadas de firma:', error)
      alert('Error al procesar las coordenadas de firma. Intente nuevamente.')
    }
  }
  
  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1)
      setSignatureArea(null)
      renderPage(currentPage + 1)
    }
  }
  
  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
      setSignatureArea(null)
      renderPage(currentPage - 1)
    }
  }
  
  const goToLastPage = () => {
    if (totalPages > 1 && currentPage < totalPages - 1) {
      setCurrentPage(totalPages - 1)
      setSignatureArea(null)
      renderPage(totalPages - 1)
    }
  }
  
  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-container max-w-4xl">
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="spinner spinner-lg mb-4" />
              <p className="text-lg text-gray-600">Cargando PDF...</p>
              <p className="text-sm text-gray-500 mt-2">Configurando renderizado optimizado</p>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="modal-overlay">
      <div className="modal-container max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <PenTool className="w-6 h-6 mr-2" />
              Configurar Área de Firma
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Haz clic y arrastra para seleccionar el área donde se colocará la firma
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Controles */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={prevPage}
                disabled={currentPage === 0}
                className="btn btn-sm btn-outline"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 min-w-[100px] text-center">
                Página {currentPage + 1} de {totalPages}
              </span>
              <button
                onClick={nextPage}
                disabled={currentPage >= totalPages - 1}
                className="btn btn-sm btn-outline"
                title="Página siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {totalPages > 1 && (
                <button
                  onClick={goToLastPage}
                  disabled={currentPage >= totalPages - 1}
                  className="btn btn-sm btn-outline"
                  title="Ir a la última página"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {signatureArea && (
              <div className="text-sm text-gray-600">
                Área: {Math.round(signatureArea.width)} × {Math.round(signatureArea.height)} px
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={clearSignature}
              disabled={!signatureArea}
              className="btn btn-sm btn-outline"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Limpiar
            </button>
          </div>
        </div>
        
        {/* Canvas */}
        <div className="flex-1 overflow-auto p-6">
          <div className="flex justify-center">
            <div className="border border-gray-300 shadow-lg">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="cursor-crosshair max-w-full h-auto"
                style={{ maxHeight: '70vh' }}
              />
            </div>
          </div>
        </div>
        
        {/* Instrucciones mejoradas */}
        <div className="p-4 bg-blue-50 border-t">
          <div className="text-sm text-blue-800">
            <strong>Instrucciones:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Haz clic y arrastra para seleccionar el área donde se colocará la firma</li>
              <li>Solo se permite <strong>una área de firma</strong> por documento</li>
              <li>Al crear una nueva área, la anterior se eliminará automáticamente</li>
              <li>El área debe tener un tamaño mínimo de 50×20 píxeles</li>
              <li>Puedes cambiar de página si el documento tiene múltiples páginas</li>
              <li>Usa el botón ⏭️ para ir directamente a la última página</li>
              <li><strong>Nuevo:</strong> Renderizado optimizado para mejor precisión</li>
            </ul>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-500">
            {signatureArea ? (
              <span className="text-success-600">
                ✓ Área de firma seleccionada en página {currentPage + 1}
              </span>
            ) : (
              'Selecciona un área para continuar'
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="btn btn-outline"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!signatureArea}
              className="btn btn-primary"
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar Coordenadas
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

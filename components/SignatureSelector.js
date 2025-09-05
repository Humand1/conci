// Componente para seleccionar coordenadas de firma en PDF
import { useState, useRef, useEffect } from 'react'
import { X, PenTool, Save, RotateCcw, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react'
import dynamic from 'next/dynamic'

// Componente que solo se ejecuta en el cliente
function SignatureSelectorClient({ pdfFile, onClose, onSave }) {
  const canvasRef = useRef(null)
  const [pdfDoc, setPdfDoc] = useState(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [currentRect, setCurrentRect] = useState(null)
  const [signatureArea, setSignatureArea] = useState(null)
  const [scale, setScale] = useState(1)
  const [loading, setLoading] = useState(true)
  const [pdfjsLib, setPdfjsLib] = useState(null)
  
  // Cargar PDF.js dinámicamente solo en el cliente
  useEffect(() => {
    const loadPDFJS = async () => {
      if (typeof window !== 'undefined' && !pdfjsLib) {
        try {
          const pdfjs = await import('pdfjs-dist')
          
          // Configurar el worker
          pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
          
          setPdfjsLib(pdfjs)
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
      
      // Cargar PDF usando PDF.js
      const arrayBuffer = await pdfFile.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
      const pdf = await loadingTask.promise
      
      setPdfDoc(pdf)
      setTotalPages(pdf.numPages)
      setCurrentPage(0)
      
      // Renderizar la primera página automáticamente
      await renderPage(0, pdf)
      
    } catch (error) {
      console.error('Error cargando PDF:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const renderPage = async (pageNum, pdf = null) => {
    const canvas = canvasRef.current
    if (!canvas || !pdfDoc) return
    
    try {
      const pdfDocument = pdf || pdfDoc
      const page = await pdfDocument.getPage(pageNum + 1) // PDF.js usa índices basados en 1
      
      const viewport = page.getViewport({ scale: 1.5 })
      
      // Configurar canvas con el tamaño real de la página del PDF
      canvas.width = viewport.width
      canvas.height = viewport.height
      
      const ctx = canvas.getContext('2d')
      
      // Renderizar la página del PDF
      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      }
      
      await page.render(renderContext).promise
      
      // Dibujar área de firma existente si hay una
      if (signatureArea) {
        drawSignatureArea(ctx, signatureArea)
      }
      
    } catch (error) {
      console.error('Error renderizando página:', error)
      
      // Fallback: mostrar un canvas en blanco con mensaje de error
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
    
    // Redibujar canvas
    renderPage(currentPage)
    
    // Dibujar rectángulo temporal
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    drawSignatureArea(ctx, rect)
  }
  
  const handleMouseUp = () => {
    if (!isDrawing || !currentRect) return
    
    setIsDrawing(false)
    
    // Validar tamaño mínimo
    if (currentRect.width < 50 || currentRect.height < 20) {
      alert('El área de firma debe ser más grande')
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
  
  const handleSave = () => {
    if (!signatureArea) {
      alert('Debe seleccionar un área de firma')
      return
    }
    
    const canvas = canvasRef.current
    
    // Normalizar coordenadas (0-1)
    const normalizedCoords = {
      page: currentPage,
      x: signatureArea.x / canvas.width,
      y: signatureArea.y / canvas.height,
      width: signatureArea.width / canvas.width,
      height: signatureArea.height / canvas.height
    }
    
    // Coordenadas absolutas para la API
    const absoluteCoords = {
      page: currentPage,
      x: signatureArea.x,
      y: signatureArea.y,
      width: signatureArea.width,
      height: signatureArea.height
    }
    
    onSave({
      normalized: normalizedCoords,
      absolute: absoluteCoords,
      pageWidth: canvas.width,
      pageHeight: canvas.height
    })
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
        
        {/* Instrucciones */}
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

// Exportar el componente usando dynamic de Next.js para que solo se ejecute en el cliente
const SignatureSelector = dynamic(() => Promise.resolve(SignatureSelectorClient), {
  ssr: false,
  loading: () => (
    <div className="modal-overlay">
      <div className="modal-container max-w-4xl">
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <div className="spinner spinner-lg mb-4" />
            <p className="text-lg text-gray-600">Cargando selector de firma...</p>
          </div>
        </div>
      </div>
    </div>
  )
})

export default SignatureSelector

// Componente para subir archivos PDF
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useApp, useNotification } from '../pages/_app'
import { FileText, Upload, X, AlertCircle, CheckCircle } from 'lucide-react'
import { getPDFProcessor } from '../lib/pdf-processor'

export default function PDFUploader() {
  const { pdfFile, setPdfFile } = useApp()
  const { addNotification } = useNotification()
  const [pdfInfo, setPdfInfo] = useState(null)
  const [validating, setValidating] = useState(false)
  
  const onDrop = useCallback(async (acceptedFiles, rejectedFiles) => {
    // Manejar archivos rechazados
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles[0].errors.map(error => {
        switch (error.code) {
          case 'file-too-large':
            return 'El archivo es demasiado grande (máximo 50MB)'
          case 'file-invalid-type':
            return 'Tipo de archivo no válido. Solo se permiten archivos PDF'
          default:
            return error.message
        }
      })
      addNotification(errors.join(', '), 'error')
      return
    }
    
    if (acceptedFiles.length === 0) return
    
    const file = acceptedFiles[0]
    setValidating(true)
    
    try {
      // Validar archivo usando el procesador de PDF
      const processor = getPDFProcessor()
      const validation = processor.validatePDFFile(file)
      
      if (!validation.isValid) {
        addNotification(validation.errors.join(', '), 'error')
        return
      }
      
      // Leer información del PDF
      const pdfData = await processor.readPDFFile(file)
      
      if (!pdfData.success) {
        addNotification(pdfData.error, 'error')
        return
      }
      
      // Obtener información adicional del PDF
      const infoResult = await processor.getPDFInfo(pdfData.buffer)
      
      if (infoResult.success) {
        setPdfInfo(infoResult.info)
      }
      
      setPdfFile(file)
      addNotification('PDF cargado exitosamente', 'success')
      
    } catch (error) {
      console.error('Error procesando PDF:', error)
      addNotification('Error procesando el archivo PDF', 'error')
    } finally {
      setValidating(false)
    }
  }, [setPdfFile, addNotification])
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: false
  })
  
  const removePDF = () => {
    setPdfFile(null)
    setPdfInfo(null)
    addNotification('PDF removido', 'info')
  }
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  if (pdfFile) {
    return (
      <div className="space-y-4">
        {/* Archivo cargado */}
        <div className="border border-success-200 bg-success-50 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <FileText className="w-8 h-8 text-success-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-success-800 truncate">
                  {pdfFile.name}
                </h3>
                <div className="mt-1 text-sm text-success-600 space-y-1">
                  <p>Tamaño: {formatFileSize(pdfFile.size)}</p>
                  {pdfInfo && (
                    <>
                      <p>Páginas: {pdfInfo.pageCount}</p>
                      {pdfInfo.title && pdfInfo.title !== 'Sin título' && (
                        <p>Título: {pdfInfo.title}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={removePDF}
              className="flex-shrink-0 ml-4 text-success-400 hover:text-success-600"
              title="Remover archivo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mt-3 flex items-center text-sm text-success-600">
            <CheckCircle className="w-4 h-4 mr-1" />
            Archivo PDF válido y listo para duplicar
          </div>
        </div>
        
        {/* Información adicional del PDF */}
        {pdfInfo && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Información del documento
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Páginas:</span>
                <span className="ml-2 text-gray-900">{pdfInfo.pageCount}</span>
              </div>
              <div>
                <span className="text-gray-500">Tamaño:</span>
                <span className="ml-2 text-gray-900">{formatFileSize(pdfInfo.size)}</span>
              </div>
              {pdfInfo.author && pdfInfo.author !== 'Desconocido' && (
                <div>
                  <span className="text-gray-500">Autor:</span>
                  <span className="ml-2 text-gray-900">{pdfInfo.author}</span>
                </div>
              )}
              {pdfInfo.creator && pdfInfo.creator !== 'Desconocido' && (
                <div>
                  <span className="text-gray-500">Creador:</span>
                  <span className="ml-2 text-gray-900">{pdfInfo.creator}</span>
                </div>
              )}
              {pdfInfo.creationDate && (
                <div>
                  <span className="text-gray-500">Fecha de creación:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(pdfInfo.creationDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'dropzone-active' : ''} ${validating ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center justify-center space-y-4">
          {validating ? (
            <>
              <div className="spinner spinner-lg" />
              <div className="text-center">
                <p className="text-lg font-medium text-gray-900">
                  Validando archivo PDF...
                </p>
                <p className="text-sm text-gray-500">
                  Por favor espere mientras procesamos el documento
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full">
                {isDragActive ? (
                  <Upload className="w-8 h-8 text-primary-600" />
                ) : (
                  <FileText className="w-8 h-8 text-primary-600" />
                )}
              </div>
              
              <div className="text-center">
                <p className="text-lg font-medium text-gray-900">
                  {isDragActive ? 'Suelta el archivo aquí' : 'Selecciona o arrastra un archivo PDF'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Máximo 50MB • Solo archivos PDF
                </p>
              </div>
              
              <button
                type="button"
                className="btn btn-primary"
              >
                <Upload className="w-4 h-4 mr-2" />
                Seleccionar archivo
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Instrucciones */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Instrucciones
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Selecciona un archivo PDF válido (máximo 50MB)</li>
                <li>El archivo se duplicará para cada usuario seleccionado</li>
                <li>Los nombres de archivo se generarán automáticamente</li>
                <li>Puedes configurar coordenadas de firma si es necesario</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

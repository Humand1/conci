// Componente modal para mostrar progreso
import { X, FileText, Upload, Loader } from 'lucide-react'

export default function ProgressModal({ type, current, total, onClose }) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0
  
  const getTitle = () => {
    switch (type) {
      case 'duplicate':
        return 'Duplicando PDFs'
      case 'upload':
        return 'Subiendo Documentos'
      default:
        return 'Procesando'
    }
  }
  
  const getIcon = () => {
    switch (type) {
      case 'duplicate':
        return <FileText className="w-8 h-8 text-primary-600" />
      case 'upload':
        return <Upload className="w-8 h-8 text-primary-600" />
      default:
        return <Loader className="w-8 h-8 text-primary-600 animate-spin" />
    }
  }
  
  const getMessage = () => {
    switch (type) {
      case 'duplicate':
        return `Duplicando archivo ${current} de ${total}`
      case 'upload':
        return `Subiendo archivo ${current} de ${total}`
      default:
        return `Procesando ${current} de ${total}`
    }
  }
  
  return (
    <div className="modal-overlay">
      <div className="modal-container max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {getTitle()}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={current < total}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <div className="text-center">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              {getIcon()}
            </div>
            
            {/* Progress message */}
            <p className="text-lg font-medium text-gray-900 mb-2">
              {getMessage()}
            </p>
            
            {/* Progress bar */}
            <div className="progress mb-4">
              <div 
                className="progress-bar"
                style={{ width: `${percentage}%` }}
              />
            </div>
            
            {/* Percentage */}
            <p className="text-sm text-gray-500">
              {percentage}% completado
            </p>
            
            {/* Status */}
            {current >= total ? (
              <div className="mt-4 p-3 bg-success-50 rounded-lg">
                <p className="text-success-800 font-medium">
                  ¡Proceso completado exitosamente!
                </p>
              </div>
            ) : (
              <div className="mt-4 p-3 bg-primary-50 rounded-lg">
                <p className="text-primary-800 text-sm">
                  Por favor espere mientras se completa el proceso...
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        {current >= total && (
          <div className="flex justify-end p-6 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="btn btn-primary"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

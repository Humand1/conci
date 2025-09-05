// Componente para mostrar resultados de duplicación
import { useApp } from '../pages/_app'
import { FileText, Download, Upload, CheckCircle, AlertCircle, User } from 'lucide-react'

export default function DuplicationResults({ onUpload }) {
  const { duplicatedFiles, selectedFolder } = useApp()
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  const downloadFile = (file) => {
    try {
      // Convertir buffer base64 a blob
      const binaryString = atob(file.buffer)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      
      const blob = new Blob([bytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = file.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error descargando archivo:', error)
    }
  }
  
  const downloadAll = () => {
    duplicatedFiles.forEach((file, index) => {
      setTimeout(() => {
        downloadFile(file)
      }, index * 100) // Pequeño delay entre descargas
    })
  }
  
  if (duplicatedFiles.length === 0) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay archivos duplicados
            </h3>
            <p className="text-gray-500">
              Duplicar PDFs en la pestaña de Configuración para ver los resultados aquí
            </p>
          </div>
        </div>
      </div>
    )
  }
  
  const totalSize = duplicatedFiles.reduce((sum, file) => sum + file.size, 0)
  
  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center">
                <FileText className="w-6 h-6 mr-2" />
                Archivos Duplicados
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {duplicatedFiles.length} archivos generados • {formatFileSize(totalSize)} total
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={downloadAll}
                className="btn btn-outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar Todos
              </button>
              
              <button
                onClick={onUpload}
                disabled={!selectedFolder}
                className="btn btn-primary"
              >
                <Upload className="w-4 h-4 mr-2" />
                Subir a Humand
              </button>
            </div>
          </div>
        </div>
        
        <div className="card-body">
          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-success-50 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-success-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-success-600">
                    {duplicatedFiles.length}
                  </p>
                  <p className="text-sm text-success-600">Archivos generados</p>
                </div>
              </div>
            </div>
            
            <div className="bg-primary-50 rounded-lg p-4">
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-primary-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-primary-600">
                    {formatFileSize(totalSize)}
                  </p>
                  <p className="text-sm text-primary-600">Tamaño total</p>
                </div>
              </div>
            </div>
            
            <div className="bg-warning-50 rounded-lg p-4">
              <div className="flex items-center">
                <User className="w-8 h-8 text-warning-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-warning-600">
                    {duplicatedFiles.length}
                  </p>
                  <p className="text-sm text-warning-600">Usuarios únicos</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Información de destino */}
          {selectedFolder && (
            <div className="bg-primary-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-primary-800 mb-1">
                Carpeta de destino seleccionada:
              </h3>
              <p className="text-primary-700">{selectedFolder.name}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Lista de archivos */}
      <div className="card">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Archivo</th>
                  <th className="table-header-cell">Usuario</th>
                  <th className="table-header-cell">Tamaño</th>
                  <th className="table-header-cell">Acciones</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {duplicatedFiles.map((file, index) => (
                  <tr key={index} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {file.filename}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-600">
                              {(file.user.full_name || file.user.email || 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {file.user.full_name || 'Sin nombre'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {file.user.email || 'Sin email'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">
                        {formatFileSize(file.size)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => downloadFile(file)}
                        className="btn btn-sm btn-outline"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Descargar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Instrucciones */}
      <div className="card">
        <div className="card-body">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Próximos pasos
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Revisa la lista de archivos generados</li>
                    <li>Descarga archivos individuales si es necesario</li>
                    <li>Verifica que la carpeta de destino sea correcta</li>
                    <li>Haz clic en "Subir a Humand" para enviar todos los archivos</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

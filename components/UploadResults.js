// Componente para mostrar resultados de subida
import { useApp } from '../pages/_app'
import { Upload, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'

export default function UploadResults() {
  const { uploadResults } = useApp()
  
  if (uploadResults.length === 0) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="text-center py-12">
            <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay resultados de subida
            </h3>
            <p className="text-gray-500">
              Los resultados de subida aparecerán aquí después de subir archivos a Humand
            </p>
          </div>
        </div>
      </div>
    )
  }
  
  const successfulUploads = uploadResults.filter(result => result.status === 'success')
  const failedUploads = uploadResults.filter(result => result.status === 'error')
  const successRate = (successfulUploads.length / uploadResults.length) * 100
  
  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold flex items-center">
            <Upload className="w-6 h-6 mr-2" />
            Resultados de Subida
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {uploadResults.length} archivos procesados • {successRate.toFixed(1)}% éxito
          </p>
        </div>
        
        <div className="card-body">
          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-success-50 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-success-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-success-600">
                    {successfulUploads.length}
                  </p>
                  <p className="text-sm text-success-600">Subidas exitosas</p>
                </div>
              </div>
            </div>
            
            <div className="bg-error-50 rounded-lg p-4">
              <div className="flex items-center">
                <XCircle className="w-8 h-8 text-error-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-error-600">
                    {failedUploads.length}
                  </p>
                  <p className="text-sm text-error-600">Subidas fallidas</p>
                </div>
              </div>
            </div>
            
            <div className="bg-primary-50 rounded-lg p-4">
              <div className="flex items-center">
                <Upload className="w-8 h-8 text-primary-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-primary-600">
                    {successRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-primary-600">Tasa de éxito</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Barra de progreso general */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progreso general</span>
              <span>{successfulUploads.length} / {uploadResults.length}</span>
            </div>
            <div className="progress">
              <div 
                className="progress-bar progress-bar-success"
                style={{ width: `${successRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Lista de resultados */}
      <div className="card">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Estado</th>
                  <th className="table-header-cell">Archivo</th>
                  <th className="table-header-cell">Usuario</th>
                  <th className="table-header-cell">Error</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {uploadResults.map((result, index) => (
                  <tr key={index} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center">
                        {result.status === 'success' ? (
                          <div className="flex items-center text-success-600">
                            <CheckCircle className="w-5 h-5 mr-2" />
                            <span className="text-sm font-medium">Exitoso</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-error-600">
                            <XCircle className="w-5 h-5 mr-2" />
                            <span className="text-sm font-medium">Error</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm font-medium text-gray-900">
                        {result.filename}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-600">
                              {(result.user.full_name || result.user.email || 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {result.user.full_name || 'Sin nombre'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {result.user.email || 'Sin email'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      {result.status === 'error' ? (
                        <div className="text-sm text-error-600">
                          {result.error || 'Error desconocido'}
                          {result.statusCode && (
                            <span className="text-xs text-gray-500 block">
                              Código: {result.statusCode}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Acciones para errores */}
      {failedUploads.length > 0 && (
        <div className="card">
          <div className="card-body">
            <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-warning-400" />
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-warning-800">
                    Archivos con errores de subida
                  </h3>
                  <div className="mt-2 text-sm text-warning-700">
                    <p>
                      {failedUploads.length} archivos no pudieron ser subidos. 
                      Revisa los errores en la tabla anterior para más detalles.
                    </p>
                  </div>
                  <div className="mt-4">
                    <button className="btn btn-sm btn-warning">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reintentar Fallidos
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Resumen final */}
      <div className="card">
        <div className="card-body">
          <div className="text-center">
            {successRate === 100 ? (
              <div className="text-success-600">
                <CheckCircle className="w-12 h-12 mx-auto mb-3" />
                <h3 className="text-lg font-medium mb-2">
                  ¡Subida completada exitosamente!
                </h3>
                <p className="text-sm">
                  Todos los archivos fueron subidos correctamente a Humand.
                </p>
              </div>
            ) : successfulUploads.length > 0 ? (
              <div className="text-warning-600">
                <AlertCircle className="w-12 h-12 mx-auto mb-3" />
                <h3 className="text-lg font-medium mb-2">
                  Subida completada con algunos errores
                </h3>
                <p className="text-sm">
                  {successfulUploads.length} de {uploadResults.length} archivos fueron subidos exitosamente.
                </p>
              </div>
            ) : (
              <div className="text-error-600">
                <XCircle className="w-12 h-12 mx-auto mb-3" />
                <h3 className="text-lg font-medium mb-2">
                  Error en la subida
                </h3>
                <p className="text-sm">
                  No se pudo subir ningún archivo. Revisa los errores y vuelve a intentar.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Página principal de la aplicación
import { useState, useEffect } from 'react'
import { useApp, useNotification } from './_app'
import { 
  FileText, 
  Users, 
  Upload, 
  Settings, 
  Download,
  CheckCircle,
  AlertCircle,
  Loader,
  FolderOpen,
  PenTool
} from 'lucide-react'

// Componentes
import PDFUploader from '../components/PDFUploader'
import SegmentationSelector from '../components/SegmentationSelector'
import UsersList from '../components/UsersList'
import DuplicationResults from '../components/DuplicationResults'
import UploadResults from '../components/UploadResults'
import ProgressModal from '../components/ProgressModal'
import SignatureSelector from '../components/SignatureSelector'

export default function Home() {
  const {
    loading,
    segmentations,
    selectedSegmentations,
    users,
    folders,
    selectedFolder,
    pdfFile,
    duplicatedFiles,
    uploadResults,
    signatureCoordinates,
    duplicateConfig,
    setLoading,
    setSegmentations,
    setUsers,
    setFolders,
    setSelectedFolder,
    setDuplicatedFiles,
    setUploadResults,
    setDuplicateConfig
  } = useApp()
  
  const { addNotification } = useNotification()
  
  // Estados locales
  const [activeTab, setActiveTab] = useState('upload')
  const [showSegmentationModal, setShowSegmentationModal] = useState(false)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [progressData, setProgressData] = useState(null)
  const [stats, setStats] = useState({
    totalSegmentations: 0,
    totalUsers: 0,
    duplicatedFiles: 0,
    uploadedFiles: 0
  })
  
  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData()
  }, [])
  
  // Actualizar estadísticas
  useEffect(() => {
    setStats({
      totalSegmentations: selectedSegmentations.length,
      totalUsers: users.length,
      duplicatedFiles: duplicatedFiles.length,
      uploadedFiles: uploadResults.filter(r => r.status === 'success').length
    })
  }, [selectedSegmentations, users, duplicatedFiles, uploadResults])
  
  const loadInitialData = async () => {
    setLoading(true)
    try {
      // Cargar segmentaciones y carpetas en paralelo
      const [segmentationsRes, foldersRes] = await Promise.all([
        fetch('/api/segmentations'),
        fetch('/api/folders')
      ])
      
      if (segmentationsRes.ok) {
        const segmentationsData = await segmentationsRes.json()
        setSegmentations(segmentationsData.data)
      } else {
        throw new Error('Error cargando segmentaciones')
      }
      
      if (foldersRes.ok) {
        const foldersData = await foldersRes.json()
        setFolders(foldersData.data)
        if (foldersData.data.length > 0) {
          setSelectedFolder(foldersData.data[0])
        }
      } else {
        throw new Error('Error cargando carpetas')
      }
      
      addNotification('Datos cargados exitosamente', 'success')
    } catch (error) {
      console.error('Error cargando datos iniciales:', error)
      addNotification('Error cargando datos iniciales', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  const handleSegmentationsSelected = async (selectedItems) => {
    if (selectedItems.length === 0) {
      setUsers([])
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          segmentationItemIds: selectedItems.map(item => item.item)
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setUsers(data.data)
        addNotification(`${data.data.length} usuarios cargados`, 'success')
      } else {
        throw new Error('Error cargando usuarios')
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error)
      addNotification('Error cargando usuarios', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  const handleDuplicatePDF = async () => {
    if (!pdfFile) {
      addNotification('Debe seleccionar un archivo PDF', 'warning')
      return
    }
    
    if (users.length === 0) {
      addNotification('Debe seleccionar usuarios', 'warning')
      return
    }
    
    setShowProgressModal(true)
    setProgressData({ type: 'duplicate', current: 0, total: users.length })
    
    try {
      const formData = new FormData()
      formData.append('pdf', pdfFile)
      formData.append('users', JSON.stringify(users))
      formData.append('prefix', duplicateConfig.prefix)
      formData.append('namingPattern', duplicateConfig.namingPattern)
      
      if (signatureCoordinates && duplicateConfig.signatureStatus === 'PENDING') {
        formData.append('signatureCoordinates', JSON.stringify(signatureCoordinates))
      }
      
      const response = await fetch('/api/duplicate-pdf', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const data = await response.json()
        setDuplicatedFiles(data.data)
        addNotification(`${data.stats.successful} archivos duplicados exitosamente`, 'success')
        setActiveTab('results')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error duplicando PDF')
      }
    } catch (error) {
      console.error('Error duplicando PDF:', error)
      addNotification('Error duplicando PDF', 'error')
    } finally {
      setShowProgressModal(false)
      setProgressData(null)
    }
  }
  
  const handleUploadDocuments = async () => {
    if (duplicatedFiles.length === 0) {
      addNotification('Debe duplicar archivos primero', 'warning')
      return
    }
    
    if (!selectedFolder) {
      addNotification('Debe seleccionar una carpeta de destino', 'warning')
      return
    }
    
    setShowProgressModal(true)
    setProgressData({ type: 'upload', current: 0, total: duplicatedFiles.length })
    
    try {
      const response = await fetch('/api/upload-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documents: duplicatedFiles,
          folderId: selectedFolder.id,
          signatureStatus: duplicateConfig.signatureStatus,
          signatureCoordinates: signatureCoordinates,
          sendNotification: duplicateConfig.sendNotification
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setUploadResults([...data.data.successful, ...data.data.failed])
        addNotification(`${data.stats.successful} archivos subidos exitosamente`, 'success')
        setActiveTab('upload-results')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error subiendo documentos')
      }
    } catch (error) {
      console.error('Error subiendo documentos:', error)
      addNotification('Error subiendo documentos', 'error')
    } finally {
      setShowProgressModal(false)
      setProgressData(null)
    }
  }
  
  const tabs = [
    { id: 'upload', label: 'Configuración', icon: Settings },
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'results', label: 'Duplicación', icon: FileText },
    { id: 'upload-results', label: 'Subida', icon: Upload }
  ]
  
  if (loading && segmentations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4 text-primary-600" />
          <p className="text-lg text-gray-600">Cargando aplicación...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Multiplicador de PDFs
              </h1>
              <p className="text-gray-600 mt-1">
                Sistema web para duplicar y distribuir documentos PDF
              </p>
            </div>
            
            {/* Estadísticas rápidas */}
            <div className="hidden md:flex space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">{stats.totalSegmentations}</div>
                <div className="text-sm text-gray-500">Segmentaciones</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success-600">{stats.totalUsers}</div>
                <div className="text-sm text-gray-500">Usuarios</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-warning-600">{stats.duplicatedFiles}</div>
                <div className="text-sm text-gray-500">Duplicados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success-600">{stats.uploadedFiles}</div>
                <div className="text-sm text-gray-500">Subidos</div>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'upload' && (
          <div className="space-y-8">
            {/* PDF Upload Section */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold flex items-center">
                  <FileText className="w-6 h-6 mr-2" />
                  Archivo PDF
                </h2>
              </div>
              <div className="card-body">
                <PDFUploader />
              </div>
            </div>
            
            {/* Segmentations Section */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold flex items-center">
                  <Users className="w-6 h-6 mr-2" />
                  Segmentaciones de Usuarios
                </h2>
              </div>
              <div className="card-body">
                <button
                  onClick={() => setShowSegmentationModal(true)}
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Users className="w-4 h-4 mr-2" />
                  )}
                  Seleccionar Segmentaciones
                </button>
                
                {selectedSegmentations.length > 0 && (
                  <div className="mt-4 p-4 bg-primary-50 rounded-lg">
                    <p className="text-sm text-primary-800">
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      {selectedSegmentations.length} segmentaciones seleccionadas
                    </p>
                    <p className="text-sm text-primary-600 mt-1">
                      {users.length} usuarios encontrados
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Configuration Section */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold flex items-center">
                  <Settings className="w-6 h-6 mr-2" />
                  Configuración
                </h2>
              </div>
              <div className="card-body space-y-4">
                {/* Naming Pattern */}
                <div className="form-group">
                  <label className="form-label">Patrón de nomenclatura</label>
                  <select
                    className="form-select"
                    value={duplicateConfig.namingPattern}
                    onChange={(e) => setDuplicateConfig(prev => ({
                      ...prev,
                      namingPattern: e.target.value
                    }))}
                  >
                    <option value="username">Username</option>
                    <option value="email">Email</option>
                    <option value="employee_id">ID Empleado</option>
                    <option value="full_name">Nombre Completo</option>
                  </select>
                </div>
                
                {/* File Prefix */}
                <div className="form-group">
                  <label className="form-label">Prefijo de archivo (opcional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: documento, contrato"
                    value={duplicateConfig.prefix}
                    onChange={(e) => setDuplicateConfig(prev => ({
                      ...prev,
                      prefix: e.target.value
                    }))}
                  />
                </div>
                
                {/* Signature Configuration */}
                <div className="form-group">
                  <label className="form-label">Configuración de firma</label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="signatureStatus"
                        value="SIGNATURE_NOT_NEEDED"
                        checked={duplicateConfig.signatureStatus === 'SIGNATURE_NOT_NEEDED'}
                        onChange={(e) => setDuplicateConfig(prev => ({
                          ...prev,
                          signatureStatus: e.target.value
                        }))}
                        className="mr-2"
                      />
                      Sin firma
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="signatureStatus"
                        value="PENDING"
                        checked={duplicateConfig.signatureStatus === 'PENDING'}
                        onChange={(e) => setDuplicateConfig(prev => ({
                          ...prev,
                          signatureStatus: e.target.value
                        }))}
                        className="mr-2"
                      />
                      Requiere firma
                    </label>
                  </div>
                  
                  {duplicateConfig.signatureStatus === 'PENDING' && (
                    <div className="mt-2">
                      <button
                        onClick={() => setShowSignatureModal(true)}
                        className="btn btn-outline"
                        disabled={!pdfFile}
                      >
                        <PenTool className="w-4 h-4 mr-2" />
                        Configurar Coordenadas de Firma
                      </button>
                      {signatureCoordinates && (
                        <p className="text-sm text-success-600 mt-1">
                          <CheckCircle className="w-4 h-4 inline mr-1" />
                          Coordenadas configuradas
                        </p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Folder Selection */}
                <div className="form-group">
                  <label className="form-label">Carpeta de destino</label>
                  <select
                    className="form-select"
                    value={selectedFolder?.id || ''}
                    onChange={(e) => {
                      const folder = folders.find(f => f.id === e.target.value)
                      setSelectedFolder(folder)
                    }}
                  >
                    {folders.map(folder => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Notification Option */}
                <div className="form-group">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={duplicateConfig.sendNotification}
                      onChange={(e) => setDuplicateConfig(prev => ({
                        ...prev,
                        sendNotification: e.target.checked
                      }))}
                      className="mr-2"
                    />
                    Notificar al usuario por email
                  </label>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleDuplicatePDF}
                disabled={!pdfFile || users.length === 0 || loading}
                className="btn btn-primary btn-lg"
              >
                {loading ? (
                  <Loader className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <FileText className="w-5 h-5 mr-2" />
                )}
                Duplicar PDFs ({users.length} usuarios)
              </button>
            </div>
          </div>
        )}
        
        {activeTab === 'users' && (
          <UsersList />
        )}
        
        {activeTab === 'results' && (
          <DuplicationResults onUpload={handleUploadDocuments} />
        )}
        
        {activeTab === 'upload-results' && (
          <UploadResults />
        )}
      </main>
      
      {/* Modals */}
      {showSegmentationModal && (
        <SegmentationSelector
          segmentations={segmentations}
          onClose={() => setShowSegmentationModal(false)}
          onSelect={handleSegmentationsSelected}
        />
      )}
      
      {showSignatureModal && pdfFile && (
        <SignatureSelector
          pdfFile={pdfFile}
          onClose={() => setShowSignatureModal(false)}
          onSave={(coordinates) => {
            setSignatureCoordinates(coordinates)
            setShowSignatureModal(false)
            addNotification('Coordenadas de firma guardadas', 'success')
          }}
        />
      )}
      
      {showProgressModal && progressData && (
        <ProgressModal
          type={progressData.type}
          current={progressData.current}
          total={progressData.total}
          onClose={() => setShowProgressModal(false)}
        />
      )}
    </div>
  )
}

// Archivo principal de la aplicación Next.js
import '../styles/globals.css'
import { useState, useEffect } from 'react'
import Head from 'next/head'
import { UI_CONFIG } from '../lib/config'

// Componente de notificación
function Notification({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 5000)
    
    return () => clearTimeout(timer)
  }, [onClose])
  
  const typeClasses = {
    success: 'alert-success',
    error: 'alert-error',
    warning: 'alert-warning',
    info: 'alert-info'
  }
  
  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md ${typeClasses[type] || 'alert-info'} animate-slide-up`}>
      <div className="flex items-center justify-between">
        <span>{message}</span>
        <button 
          onClick={onClose}
          className="ml-4 text-lg font-bold hover:opacity-70"
        >
          ×
        </button>
      </div>
    </div>
  )
}

// Context para notificaciones globales
import { createContext, useContext } from 'react'

const NotificationContext = createContext()

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification debe usarse dentro de NotificationProvider')
  }
  return context
}

function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  
  const addNotification = (message, type = 'info') => {
    const id = Date.now()
    setNotifications(prev => [...prev, { id, message, type }])
  }
  
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }
  
  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <div className="notification-container">
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            message={notification.message}
            type={notification.type}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

// Context para el estado global de la aplicación
const AppContext = createContext()

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp debe usarse dentro de AppProvider')
  }
  return context
}

function AppProvider({ children }) {
  const [loading, setLoading] = useState(false)
  const [segmentations, setSegmentations] = useState([])
  const [selectedSegmentations, setSelectedSegmentations] = useState([])
  const [users, setUsers] = useState([])
  const [folders, setFolders] = useState([])
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [pdfFile, setPdfFile] = useState(null)
  const [duplicatedFiles, setDuplicatedFiles] = useState([])
  const [uploadResults, setUploadResults] = useState([])
  const [signatureCoordinates, setSignatureCoordinates] = useState(null)
  
  // Configuración de duplicación
  const [duplicateConfig, setDuplicateConfig] = useState({
    prefix: '',
    namingPattern: 'username',
    signatureStatus: 'SIGNATURE_NOT_NEEDED',
    sendNotification: false
  })
  
  const value = {
    // Estado
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
    
    // Setters
    setLoading,
    setSegmentations,
    setSelectedSegmentations,
    setUsers,
    setFolders,
    setSelectedFolder,
    setPdfFile,
    setDuplicatedFiles,
    setUploadResults,
    setSignatureCoordinates,
    setDuplicateConfig,
    
    // Funciones de utilidad
    clearAll: () => {
      setSelectedSegmentations([])
      setUsers([])
      setPdfFile(null)
      setDuplicatedFiles([])
      setUploadResults([])
      setSignatureCoordinates(null)
    },
    
    resetDuplication: () => {
      setDuplicatedFiles([])
      setUploadResults([])
    }
  }
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

// Componente principal de la aplicación
export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>{UI_CONFIG.APP_TITLE}</title>
        <meta name="description" content={UI_CONFIG.APP_DESCRIPTION} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Meta tags para PWA */}
        <meta name="theme-color" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PDF Multiplicador" />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={UI_CONFIG.APP_TITLE} />
        <meta property="og:description" content={UI_CONFIG.APP_DESCRIPTION} />
        <meta property="og:site_name" content="PDF Multiplicador" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={UI_CONFIG.APP_TITLE} />
        <meta name="twitter:description" content={UI_CONFIG.APP_DESCRIPTION} />
      </Head>
      
      <NotificationProvider>
        <AppProvider>
          <div className="min-h-screen bg-gray-50">
            <Component {...pageProps} />
          </div>
        </AppProvider>
      </NotificationProvider>
    </>
  )
}

// Configuración global de error handling
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason)
    // Aquí podrías enviar el error a un servicio de logging
  })
  
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error)
    // Aquí podrías enviar el error a un servicio de logging
  })
}

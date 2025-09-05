// Componente para seleccionar segmentaciones
import { useState, useEffect } from 'react'
import { useApp, useNotification } from '../pages/_app'
import { X, Search, Users, CheckCircle, Loader } from 'lucide-react'

export default function SegmentationSelector({ segmentations, onClose, onSelect }) {
  const { setSelectedSegmentations } = useApp()
  const { addNotification } = useNotification()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [groupSelections, setGroupSelections] = useState({})
  const [totalUsers, setTotalUsers] = useState(0)
  const [calculating, setCalculating] = useState(false)
  
  // Filtrar segmentaciones por término de búsqueda
  const filteredSegmentations = segmentations.filter(group =>
    group.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.items.some(item => 
      item.display_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )
  
  // Calcular total de usuarios únicos cuando cambian las selecciones
  useEffect(() => {
    calculateUniqueUsers()
  }, [selectedItems])
  
  const calculateUniqueUsers = async () => {
    if (selectedItems.length === 0) {
      setTotalUsers(0)
      return
    }
    
    setCalculating(true)
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          segmentationItemIds: selectedItems.map(item => item.item),
          limit: 0 // Sin límite para obtener el conteo total
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setTotalUsers(data.stats.totalUsers)
      } else {
        console.error('Error calculando usuarios únicos')
      }
    } catch (error) {
      console.error('Error calculando usuarios únicos:', error)
    } finally {
      setCalculating(false)
    }
  }
  
  const handleItemToggle = (group, item) => {
    const itemKey = `${group.group}_${item.name}`
    const itemData = {
      group: group.group,
      item: item.name,
      display_name: item.display_name,
      user_count: item.user_count
    }
    
    setSelectedItems(prev => {
      const exists = prev.find(selected => 
        selected.group === group.group && selected.item === item.name
      )
      
      if (exists) {
        return prev.filter(selected => 
          !(selected.group === group.group && selected.item === item.name)
        )
      } else {
        return [...prev, itemData]
      }
    })
    
    // Actualizar estado del grupo
    updateGroupSelection(group)
  }
  
  const handleGroupToggle = (group) => {
    const groupKey = group.group
    const isGroupSelected = groupSelections[groupKey]
    
    if (isGroupSelected) {
      // Deseleccionar todos los items del grupo
      setSelectedItems(prev => 
        prev.filter(selected => selected.group !== group.group)
      )
    } else {
      // Seleccionar todos los items del grupo
      const groupItems = group.items.map(item => ({
        group: group.group,
        item: item.name,
        display_name: item.display_name,
        user_count: item.user_count
      }))
      
      setSelectedItems(prev => {
        // Remover items existentes del grupo y agregar todos
        const filtered = prev.filter(selected => selected.group !== group.group)
        return [...filtered, ...groupItems]
      })
    }
    
    setGroupSelections(prev => ({
      ...prev,
      [groupKey]: !isGroupSelected
    }))
  }
  
  const updateGroupSelection = (group) => {
    const groupItems = group.items
    const selectedGroupItems = selectedItems.filter(selected => selected.group === group.group)
    
    const isFullySelected = groupItems.length === selectedGroupItems.length
    const isPartiallySelected = selectedGroupItems.length > 0 && selectedGroupItems.length < groupItems.length
    
    setGroupSelections(prev => ({
      ...prev,
      [group.group]: isFullySelected
    }))
  }
  
  const handleSelectAll = () => {
    const allItems = filteredSegmentations.flatMap(group =>
      group.items.map(item => ({
        group: group.group,
        item: item.name,
        display_name: item.display_name,
        user_count: item.user_count
      }))
    )
    
    setSelectedItems(allItems)
    
    // Actualizar selecciones de grupos
    const newGroupSelections = {}
    filteredSegmentations.forEach(group => {
      newGroupSelections[group.group] = true
    })
    setGroupSelections(newGroupSelections)
  }
  
  const handleDeselectAll = () => {
    setSelectedItems([])
    setGroupSelections({})
  }
  
  const handleAccept = () => {
    if (selectedItems.length === 0) {
      addNotification('Debe seleccionar al menos una segmentación', 'warning')
      return
    }
    
    setSelectedSegmentations(selectedItems)
    onSelect(selectedItems)
    onClose()
  }
  
  const isItemSelected = (group, item) => {
    return selectedItems.some(selected => 
      selected.group === group.group && selected.item === item.name
    )
  }
  
  const getGroupSelectionState = (group) => {
    const groupItems = group.items
    const selectedGroupItems = selectedItems.filter(selected => selected.group === group.group)
    
    if (selectedGroupItems.length === 0) return 'none'
    if (selectedGroupItems.length === groupItems.length) return 'all'
    return 'partial'
  }
  
  return (
    <div className="modal-overlay">
      <div className="modal-container max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Seleccionar Segmentaciones
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Elige las segmentaciones de usuarios para duplicar el PDF
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Resumen y controles */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-6">
              <div className="text-sm">
                <span className="font-medium text-gray-900">
                  {selectedItems.length}
                </span>
                <span className="text-gray-500 ml-1">segmentaciones seleccionadas</span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-primary-600">
                  {calculating ? (
                    <Loader className="w-4 h-4 animate-spin inline" />
                  ) : (
                    totalUsers.toLocaleString()
                  )}
                </span>
                <span className="text-gray-500 ml-1">usuarios únicos</span>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleSelectAll}
                className="btn btn-sm btn-outline"
              >
                Seleccionar todo
              </button>
              <button
                onClick={handleDeselectAll}
                className="btn btn-sm btn-outline"
              >
                Deseleccionar todo
              </button>
            </div>
          </div>
          
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar segmentaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-10"
            />
          </div>
        </div>
        
        {/* Lista de segmentaciones */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {filteredSegmentations.map((group) => {
              const groupState = getGroupSelectionState(group)
              
              return (
                <div key={group.group} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Header del grupo */}
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={groupState === 'all'}
                          ref={(el) => {
                            if (el) el.indeterminate = groupState === 'partial'
                          }}
                          onChange={() => handleGroupToggle(group)}
                          className="form-checkbox h-4 w-4 text-primary-600 rounded"
                        />
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-gray-900">
                            {group.display_name}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {group.items.length} segmentaciones
                          </p>
                        </div>
                      </label>
                      
                      <div className="text-sm text-gray-500">
                        {selectedItems.filter(item => item.group === group.group).length} / {group.items.length} seleccionadas
                      </div>
                    </div>
                  </div>
                  
                  {/* Items del grupo */}
                  <div className="divide-y divide-gray-200">
                    {group.items.map((item) => (
                      <div key={item.name} className="px-4 py-3 hover:bg-gray-50">
                        <label className="flex items-center justify-between cursor-pointer">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={isItemSelected(group, item)}
                              onChange={() => handleItemToggle(group, item)}
                              className="form-checkbox h-4 w-4 text-primary-600 rounded"
                            />
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">
                                {item.display_name}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <div className="text-sm text-gray-500">
                              <Users className="w-4 h-4 inline mr-1" />
                              {item.user_count || 0}
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          
          {filteredSegmentations.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'No se encontraron segmentaciones que coincidan con la búsqueda' : 'No hay segmentaciones disponibles'}
              </p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-500">
            {selectedItems.length > 0 && (
              <>
                {selectedItems.length} segmentaciones seleccionadas • {' '}
                {calculating ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin inline mr-1" />
                    Calculando usuarios...
                  </>
                ) : (
                  `${totalUsers.toLocaleString()} usuarios únicos`
                )}
              </>
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
              onClick={handleAccept}
              disabled={selectedItems.length === 0}
              className="btn btn-primary"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Aceptar ({selectedItems.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente para mostrar la lista de usuarios
import { useState } from 'react'
import { useApp } from '../pages/_app'
import { Users, Search, Filter, Download, User } from 'lucide-react'

export default function UsersList() {
  const { users, selectedSegmentations } = useApp()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  
  // Filtrar usuarios por término de búsqueda
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase()
    return (
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.employee_internal_id?.toLowerCase().includes(searchLower)
    )
  })
  
  // Ordenar usuarios
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aValue, bValue
    
    switch (sortBy) {
      case 'name':
        aValue = a.full_name || ''
        bValue = b.full_name || ''
        break
      case 'email':
        aValue = a.email || ''
        bValue = b.email || ''
        break
      case 'employee_id':
        aValue = a.employee_internal_id || ''
        bValue = b.employee_internal_id || ''
        break
      default:
        aValue = a.full_name || ''
        bValue = b.full_name || ''
    }
    
    const comparison = aValue.localeCompare(bValue)
    return sortOrder === 'asc' ? comparison : -comparison
  })
  
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }
  
  const exportUsers = () => {
    const csvContent = [
      ['Nombre', 'Email', 'ID Empleado'],
      ...sortedUsers.map(user => [
        user.full_name || '',
        user.email || '',
        user.employee_internal_id || ''
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `usuarios_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  const getSortIcon = (field) => {
    if (sortBy !== field) return null
    return sortOrder === 'asc' ? '↑' : '↓'
  }
  
  if (selectedSegmentations.length === 0) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay segmentaciones seleccionadas
            </h3>
            <p className="text-gray-500 mb-6">
              Selecciona segmentaciones en la pestaña de Configuración para ver los usuarios
            </p>
          </div>
        </div>
      </div>
    )
  }
  
  if (users.length === 0) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron usuarios
            </h3>
            <p className="text-gray-500">
              Las segmentaciones seleccionadas no contienen usuarios
            </p>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center">
                <Users className="w-6 h-6 mr-2" />
                Lista de Usuarios
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {filteredUsers.length} de {users.length} usuarios mostrados
              </p>
            </div>
            
            <button
              onClick={exportUsers}
              className="btn btn-outline"
              disabled={sortedUsers.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </button>
          </div>
        </div>
        
        <div className="card-body">
          {/* Controles de búsqueda y filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, email o ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="form-select"
              >
                <option value="name">Ordenar por nombre</option>
                <option value="email">Ordenar por email</option>
                <option value="employee_id">Ordenar por ID</option>
              </select>
            </div>
          </div>
          
          {/* Información de segmentaciones */}
          <div className="bg-primary-50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-primary-800 mb-2">
              Segmentaciones seleccionadas:
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedSegmentations.map((seg, index) => (
                <span
                  key={`${seg.group}_${seg.item}`}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                >
                  {seg.display_name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Lista de usuarios */}
      <div className="card">
        <div className="card-body p-0">
          {sortedUsers.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                No se encontraron usuarios que coincidan con la búsqueda
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th 
                      className="table-header-cell cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        Nombre {getSortIcon('name')}
                      </div>
                    </th>
                    <th 
                      className="table-header-cell cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('email')}
                    >
                      <div className="flex items-center">
                        Email {getSortIcon('email')}
                      </div>
                    </th>
                    <th 
                      className="table-header-cell cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('employee_id')}
                    >
                      <div className="flex items-center">
                        ID Empleado {getSortIcon('employee_id')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {sortedUsers.map((user, index) => (
                    <tr key={user.id || index} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary-600">
                                {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {user.full_name || 'Sin nombre'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-900">
                          {user.email || 'Sin email'}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-900">
                          {user.employee_internal_id || 'Sin ID'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Paginación (si es necesaria en el futuro) */}
      {sortedUsers.length > 0 && (
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Mostrando {sortedUsers.length} de {users.length} usuarios
              </div>
              <div className="text-sm text-gray-500">
                {selectedSegmentations.length} segmentaciones seleccionadas
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

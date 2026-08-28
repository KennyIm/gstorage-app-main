import React, { useState, useEffect } from 'react'
import apiClient from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useUI } from '../context/UIContext'
import {
  Users, Search, Plus, Edit, UserX, UserCheck, X, Lock,
  Shield, KeyRound, Building, Smartphone, Laptop, Truck, Phone
} from 'lucide-react'

export default function GestionarEmpleados() {
  document.title = "Gestionar Personas - GStorage"
  const [activeTab, setActiveTab] = useState('NORMAL')
  const [users, setUsers] = useState([])
  const [operativos, setOperativos] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sucursales, setSucursales] = useState([])
  const { showLoader, hideLoader, showToast } = useUI()
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [modalError, setModalError] = useState(null)
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'OPERARIO',
    sucursal: '',

    nombre: '',
    rut: '',
    telefono: '',
    rol_operativo: 'PATIO',
    activo: true
  })
  const { user: currentUser } = useAuth()
  const handleApiError = (err, defaultMsg = 'Ocurrió un error inesperado.') => {
    if (err.response) {
      if (err.response.status === 403) {
        const mensajePermiso = err.response.data?.detail || 'No tienes permisos para realizar esta acción.'
        showToast(mensajePermiso, 'error')
        return mensajePermiso
      } else if (err.response.status === 401) {
        showToast('Sesión caducada, ingresa nuevamente.', 'error')
      } else {
        showToast(defaultMsg, 'error')
        console.error(err)
      }
    } else {
      showToast('Error de conexión con el servidor.', 'error')
    }
    return defaultMsg
  }

  const fetchUsuarios = async () => {
    try {
      const response = await apiClient.get('/api/usuarios/users/')
      setUsers(response.data)
    } catch (err) {
      console.error("Error cargando usuarios web:", err)
      handleApiError(err, "No se pudieron cargar los usuarios web.")
    }
  }

  const fetchOperativos = async () => {
    try {
      const response = await apiClient.get('/api/usuarios/personal-operativo/')
      const data = Array.isArray(response.data)
        ? response.data
        : (response.data.results || [])
      setOperativos(data)
    } catch (err) {
      console.error("Error cargando personal operativo:", err)
      handleApiError(err, "No se pudo cargar el personal operativo.")
    }
  }

  const fetchSucursales = async () => {
    try {
      const response = await apiClient.get('/api/usuarios/sucursales/')
      setSucursales(response.data)
    } catch (err) {
      console.error("Error cargando sucursales:", err)
      handleApiError(err, "No se pudieron cargar las sucursales.")
    }
  }

  const fetchAllData = async () => {
    setLoading(true)
    await Promise.all([fetchUsuarios(), fetchOperativos(), fetchSucursales()])
    setLoading(false)
  }

  useEffect(() => {
    fetchAllData()
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleRutChange = (e) => {
    let value = e.target.value.replace(/[^0-9kK]/g, '')
    if (value.length > 9) value = value.slice(0, 9)

    if (value.length > 1) {
      const cuerpo = value.slice(0, -1)
      const dv = value.slice(-1).toUpperCase()
      value = `${cuerpo}-${dv}`
    }
    setFormData(prev => ({ ...prev, rut: value }))
  }

  const filteredUsers = users.filter(u => {
    const fullName = `${u.first_name} ${u.last_name}`.toLowerCase()
    const email = u.email?.toLowerCase() || ''
    const username = u.username.toLowerCase()
    const term = searchTerm.toLowerCase()
    return fullName.includes(term) || email.includes(term) || username.includes(term)
  })

  const filteredOperativos = operativos.filter(op => {
    const name = op.nombre?.toLowerCase() || ''
    const term = searchTerm.toLowerCase()
    return name.includes(term)
  })

  const handleOpenModal = (itemToEdit = null) => {
    setModalError(null)
    setEditingItem(itemToEdit)
    if (activeTab === 'NORMAL') {
      if (itemToEdit) {
        const nombreSuc = itemToEdit.perfil?.sucursal_nombre || itemToEdit.perfil?.sucursal
        const sucursalObj = sucursales.find(s => s.nombre === nombreSuc)
        const idSucursal = sucursalObj ? sucursalObj.id : ''
        setFormData(prev => ({
          ...prev,
          username: itemToEdit.username,
          first_name: itemToEdit.first_name,
          last_name: itemToEdit.last_name,
          email: itemToEdit.email,
          password: '',
          role: itemToEdit.perfil?.rol || 'OPERARIO',
          sucursal: idSucursal || "",
        }))
      } else {
        const defaultSucursal = sucursales.length > 0 ? sucursales[0].id : ''
        setFormData(prev => ({
          ...prev,
          username: '', first_name: '', last_name: '', email: '', password: '', role: 'OPERARIO', sucursal: defaultSucursal
        }))
      }
    } else {
      if (itemToEdit) {
        setFormData(prev => ({
          ...prev,
          nombre: itemToEdit.nombre || '',
          rut: '',
          telefono: '',
          rol_operativo: itemToEdit.rol || 'PATIO',
          activo: itemToEdit.activo ?? true
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          nombre: '', rut: '', telefono: '', rol_operativo: 'PATIO', activo: true
        }))
      }
    }
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setModalError(null)
    try {
      if (activeTab === 'NORMAL') {
        if (!formData.sucursal) {
          setModalError("Debes asignar una sucursal a este empleado.")
          return
        }
        if (editingItem) {
          await apiClient.patch(`/api/usuarios/perfil/${editingItem.id}/`, {
            rol: formData.role,
            sucursal: formData.sucursal
          })
          showToast("Rol de usuario actualizado.", "success")
        } else {
          const res = await apiClient.post('/api/usuarios/register/', {
            username: formData.username,
            password: formData.password,
            email: formData.email,
            first_name: formData.first_name,
            last_name: formData.last_name
          })
          const newUserId = res.data.id
          await apiClient.patch(`/api/usuarios/perfil/${newUserId}/`, {
            empresa: currentUser.perfil.empresa,
            rol: formData.role,
            sucursal: formData.sucursal
          })
          showToast("Usuario creado con éxito.", "success")
        }
        fetchUsuarios()
      } else {
        if (editingItem) {
          const payload = {
            nombre: formData.nombre,
            rol: formData.rol_operativo,
            activo: formData.activo
          }
          if (formData.rut) payload.rut = formData.rut
          if (formData.telefono) payload.telefono = formData.telefono
          await apiClient.patch(`/api/usuarios/personal-operativo/${editingItem.id}/`, payload)
          showToast("Personal operativo actualizado.", "success")
        } else {
          if (!formData.rut || !formData.telefono) {
            setModalError("El RUT y el Teléfono son obligatorios para el registro operativo.")
            return
          }

          await apiClient.post('/api/usuarios/personal-operativo/', {
            nombre: formData.nombre,
            rut: formData.rut,
            telefono: formData.telefono,
            rol: formData.rol_operativo,
            activo: formData.activo
          })
          showToast("Personal operativo registrado exitosamente.", "success")
        }
        fetchOperativos()
      }
      setShowModal(false)
    } catch (err) {
      console.error(err.response || err)
      if (err.response?.status === 403) {
        const msg = handleApiError(err)
        setModalError(msg)
        return
      }
      if (err.response?.status === 500) {
        setModalError("Error en el servidor: Es muy probable que el RUT o el teléfono ya pertenezcan a otro usuario.")
        return
      }
      if (err.response?.data && typeof err.response.data === 'object') {
        const errorData = err.response.data
        const formattedErrors = Object.keys(errorData).map(key => {
          const val = errorData[key]
          const msg = Array.isArray(val) ? val.join(' ') : String(val)

          if (key === 'detail' || key === 'non_field_errors' || key === 'error') {
            return msg
          }
          const fieldName = key === 'rut' ? 'RUT' : key === 'telefono' ? 'Teléfono' : key === 'username' ? 'Usuario' : key
          return `${fieldName}: ${msg}`
        }).join('\n')

        setModalError(formattedErrors || "Revisa los campos ingresados.")
      } else {
        setModalError("Ocurrió un error inesperado al guardar los datos.")
      }
    }
  }

  const handleToggleStatus = async (item) => {
    const isNormal = activeTab === 'NORMAL'
    const name = isNormal ? item.username : item.nombre
    const action = (isNormal ? item.is_active : item.activo) ? 'DESACTIVAR' : 'ACTIVAR'
    if (!window.confirm(`¿Seguro que deseas ${action} a ${name}?`)) return
    try {
      if (isNormal) {
        if (item.is_active) {
          await apiClient.delete(`/api/usuarios/users/${item.id}/`)
        } else {
          await apiClient.patch(`/api/usuarios/users/${item.id}/`, { is_active: true })
        }
        fetchUsuarios()
      } else {
        if (item.activo) {
          await apiClient.delete(`/api/usuarios/personal-operativo/${item.id}/`)
        } else {
          await apiClient.patch(`/api/usuarios/personal-operativo/${item.id}/`, { activo: true })
        }
        fetchOperativos()
      }
      showToast(`Estado de ${name} actualizado.`, "success")
    } catch (err) {
      handleApiError(err, "Error al cambiar el estado del usuario.")
    }
  }

  const handleAdminPasswordReset = async (userId, userName) => {
    const newPassword = window.prompt(`Ingresa la nueva contraseña para ${userName}:`)
    if (!newPassword) return
    if (newPassword.length < 8) {
      showToast("La contraseña debe tener al menos 8 caracteres.", "error")
      return
    }
    showLoader()
    try {
      const response = await apiClient.put(`/api/usuarios/admin-reset-password/${userId}/`, {
        password: newPassword
      })
      showToast(response.data.detail || "Contraseña actualizada exitosamente.", "success")
    } catch (err) {
      console.error("Error en reset password:", err.response?.data)
      handleApiError(err, "No se pudo cambiar la contraseña.")
    } finally {
      hideLoader()
    }
  }
  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Cargando personal...</div>
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-8 max-w-md border border-gray-200">
        <button
          onClick={() => { setActiveTab('NORMAL'); setSearchTerm(''); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer ${activeTab === 'NORMAL'
            ? 'bg-white text-indigo-600 shadow-md'
            : 'text-gray-500 hover:text-gray-800'
            }`}
        >
          <Laptop className="w-4 h-4" />
          <span>Usuarios Web</span>
        </button>

        <button
          onClick={() => { setActiveTab('OPERATIVO'); setSearchTerm(''); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer ${activeTab === 'OPERATIVO'
            ? 'bg-white text-blue-600 shadow-md'
            : 'text-gray-500 hover:text-gray-800'
            }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Operativos (OTP)</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={activeTab === 'NORMAL' ? "Buscar usuario por nombre, usuario o email..." : "Buscar operativo por nombre..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <button
            onClick={() => handleOpenModal(null)}
            className={`flex items-center justify-center gap-2 px-6 py-2.5 text-white rounded-lg transition font-medium shadow-md cursor-pointer ${activeTab === 'NORMAL' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
          >
            <Plus className="w-5 h-5" />
            <span>{activeTab === 'NORMAL' ? 'Nuevo Usuario Web' : 'Registrar Operativo'}</span>
          </button>
        </div>
        {activeTab === 'NORMAL' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Usuario</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Email</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Rol</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Sucursal</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Estado</th>
                  <th className="text-right py-4 px-4 text-sm font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isMe = u.id === currentUser.id;
                  const targetIsOwner = u.perfil?.rol === 'DUENO';
                  const iamOwner = currentUser.perfil?.rol === 'DUENO';
                  const canEdit = !isMe && (iamOwner || !targetIsOwner);
                  const nombreSucursal = u.perfil?.sucursal_nombre || u.perfil?.sucursal || 'Sin Asignar';

                  return (
                    <tr key={u.id} className={`border-b border-gray-100 hover:bg-gray-50 transition ${!u.is_active ? 'bg-gray-50/50 opacity-60' : ''}`}>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${u.is_active ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{u.first_name} {u.last_name}</p>
                            <p className="text-xs text-gray-500">@{u.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-600">{u.email}</td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${u.perfil?.rol === 'DUENO' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {u.perfil?.rol_display || u.perfil?.rol || 'Sin Rol'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Building className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{nombreSucursal}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal(u)}
                            disabled={!canEdit}
                            className={`p-2 rounded-lg transition ${canEdit ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-300 cursor-not-allowed'}`}
                            title="Editar Rol"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAdminPasswordReset(u.id, u.username)}
                            disabled={!canEdit || !u.is_active}
                            className={`p-2 rounded-lg transition ${canEdit && u.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-gray-300 cursor-not-allowed'}`}
                            title="Cambiar Contraseña"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={!canEdit}
                            className={`p-2 rounded-lg transition ${!canEdit ? 'text-gray-300 cursor-not-allowed' : u.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                            title={u.is_active ? 'Desactivar' : 'Activar'}
                          >
                            {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {activeTab === 'OPERATIVO' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Nombre</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Rol en Terreno</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">RUT</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Teléfono OTP</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Estado</th>
                  <th className="text-right py-4 px-4 text-sm font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredOperativos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">
                      No hay personal operativo registrado.
                    </td>
                  </tr>
                ) : (
                  filteredOperativos.map((op) => (
                    <tr key={op.id} className={`border-b border-gray-100 hover:bg-gray-50 transition ${!op.activo ? 'bg-gray-50/50 opacity-60' : ''}`}>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${op.activo ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                            {op.rol === 'CHOFER' ? <Truck className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{op.nombre}</p>
                            <p className="text-xs text-gray-400">Acceso RUT + OTP</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${op.rol === 'PATIO' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                          }`}>
                          {op.rol === 'PATIO' ? 'Bodeguero Patio' : 'Conductor Reparto'}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-gray-500">
                        {op.rut_enmascarado || '****'}
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span>{op.telefono_enmascarado || '****'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${op.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {op.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal(op)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Editar Datos Operativos"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(op)}
                            className={`p-2 rounded-lg transition ${op.activo ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                            title={op.activo ? 'Dar de Baja' : 'Activar'}
                          >
                            {op.activo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-in fade-in zoom-in duration-200">

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {activeTab === 'NORMAL'
                  ? (editingItem ? 'Editar Rol de Usuario' : 'Nuevo Usuario Web')
                  : (editingItem ? 'Editar Operativo' : 'Registrar Operativo')}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>

            {modalError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{modalError}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === 'NORMAL' && (
                <>
                  {!editingItem && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                          <input type="text" name="first_name" className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            value={formData.first_name} onChange={handleChange} required />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                          <input type="text" name="last_name" className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            value={formData.last_name} onChange={handleChange} required />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Usuario (Login)</label>
                        <input type="text" name="username" className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                          value={formData.username} onChange={handleChange} required />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" name="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                          value={formData.email} onChange={handleChange} required />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input type="password" name="password" className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            value={formData.password} onChange={handleChange} required />
                        </div>
                      </div>
                    </>
                  )}

                  {editingItem && (
                    <div className="p-4 bg-gray-50 rounded-lg mb-4">
                      <p className="text-sm text-gray-500">Usuario</p>
                      <p className="font-medium text-gray-900">{editingItem.first_name} {editingItem.last_name}</p>
                      <p className="text-sm text-gray-500 mt-2">Email</p>
                      <p className="font-medium text-gray-900">{editingItem.email}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rol Asignado</label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select
                          name="role"
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                          value={formData.role}
                          onChange={handleChange}
                        >
                          <option value="OPERARIO">Operario</option>
                          <option value="JEFE_BODEGA">Jefe de Bodega</option>
                          <option value="SECRETARIA">Secretaria</option>
                          <option value="ADMINISTRATIVO">Administrativo</option>
                          <option value="DUENO">Dueño</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select
                          name="sucursal"
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                          value={formData.sucursal}
                          onChange={handleChange}
                          required
                        >
                          <option value="" disabled hidden>Selecciona sucursal...</option>
                          {sucursales.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {activeTab === 'OPERATIVO' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                    <input
                      type="text"
                      name="nombre"
                      placeholder="Ej: Juan Pérez"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.nombre}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol en Terreno</label>
                    <select
                      name="rol_operativo"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      value={formData.rol_operativo}
                      onChange={handleChange}
                    >
                      <option value="PATIO">Bodeguero de Patio</option>
                      <option value="CHOFER">Conductor de Reparto</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      RUT {editingItem && '(Dejar en blanco para mantener)'}
                    </label>
                    <input
                      type="text"
                      placeholder="12345678-9"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.rut}
                      onChange={handleRutChange}
                      required={!editingItem}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono Móvil {editingItem && '(Dejar en blanco para mantener)'}
                    </label>
                    <input
                      type="text"
                      name="telefono"
                      placeholder="+56912345678"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.telefono}
                      onChange={handleChange}
                      required={!editingItem}
                    />
                    <span className="text-xs text-gray-400 mt-1 block">
                      A este número le llegará el código SMS/WhatsApp para ingresar.
                    </span>
                  </div>

                  {editingItem && (
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="activoCheck"
                        name="activo"
                        checked={formData.activo}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <label htmlFor="activoCheck" className="text-sm font-medium text-gray-700">
                        Usuario Activo (Permitir ingreso OTP)
                      </label>
                    </div>
                  )}
                </>
              )}
              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium shadow-md transition ${activeTab === 'NORMAL' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                  {editingItem ? 'Guardar Cambios' : 'Crear Registro'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
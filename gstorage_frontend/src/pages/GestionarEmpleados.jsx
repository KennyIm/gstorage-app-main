import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Users, Search, Plus, Edit, UserX, UserCheck, X, Lock, Shield, KeyRound, Building } from 'lucide-react';

export default function GestionarEmpleados() {
  document.title = "Gestionar Personas";
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sucursales, setSucursales] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'OPERARIO',
    sucursal: '' 
  });
  const [modalError, setModalError] = useState(null);

  const { user: currentUser } = useAuth();

  // --- CARGA DE DATOS ---
  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/usuarios/users/');
      setUsers(response.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchSucursales = async () => {
    try {
      const response = await apiClient.get('/api/usuarios/sucursales/');
      setSucursales(response.data);
    } catch (err) {
      console.error("Error cargando sucursales:", err);
    }
  };

  useEffect(() => {
    fetchUsuarios();
    fetchSucursales();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // --- FILTRADO ---
  const filteredUsers = users.filter(u => {
    const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
    const email = u.email?.toLowerCase() || '';
    const username = u.username.toLowerCase();
    const term = searchTerm.toLowerCase();
    return fullName.includes(term) || email.includes(term) || username.includes(term);
  });

  // --- LÓGICA DE MODAL ---
  const handleOpenModal = (userToEdit = null) => {
    setModalError(null);
    if (userToEdit) {
      setEditingUser(userToEdit);
      
      const nombreSuc = userToEdit.perfil?.sucursal_nombre || userToEdit.perfil?.sucursal;
      const sucursalObj = sucursales.find(s => s.nombre === nombreSuc);
      const idSucursal = sucursalObj ? sucursalObj.id : '';

      setFormData({
        username: userToEdit.username,
        first_name: userToEdit.first_name,
        last_name: userToEdit.last_name,
        email: userToEdit.email,
        password: '',
        role: userToEdit.perfil?.rol || 'OPERARIO',
        sucursal: idSucursal || "",
      });
    } else {
      setEditingUser(null);
      const defaultSucursal = sucursales.length > 0 ? sucursales[0].id : '';
      setFormData({
        username: '', first_name: '', last_name: '', email: '', password: '', role: 'OPERARIO', sucursal: defaultSucursal
      });
    }
    setShowModal(true);
  };

  // --- LÓGICA DE GUARDADO ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);

    if (!formData.sucursal) {
      setModalError("Debes asignar una sucursal a este empleado.");
      return;
    }

    try {
      if (editingUser) {
        await apiClient.patch(`/api/usuarios/perfil/${editingUser.id}/`, {
          rol: formData.role,
          sucursal: formData.sucursal
        });
      } else {
        const res = await apiClient.post('/api/usuarios/register/', {
          username: formData.username,
          password: formData.password,
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name
        });

        const newUserId = res.data.id;
        await apiClient.patch(`/api/usuarios/perfil/${newUserId}/`, {
          empresa: currentUser.perfil.empresa,
          rol: formData.role,
          sucursal: formData.sucursal 
        });
      }

      setShowModal(false);
      fetchUsuarios();
    } catch (err) {
      console.error(err.response);
      if (err.response?.data) {
        const errorData = err.response.data;
        const errorMessages = Object.keys(errorData).map(key => {
          const messages = Array.isArray(errorData[key]) ? errorData[key].join(' ') : errorData[key];
          if (key === 'detail' || key === 'non_field_errors') return messages;
          return `${key}: ${messages}`;
        }).join('\n');
        setModalError(errorMessages);
      } else {
        setModalError("Ocurrió un error al guardar. Intente nuevamente.");
      }
    }
  };

  // --- ACCIONES (ACTIVAR / DESACTIVAR / PASSWORD) ---
  const handleToggleStatus = async (user) => {
    const action = user.is_active ? 'DESACTIVAR' : 'ACTIVAR';
    if (!window.confirm(`¿Seguro que deseas ${action} a ${user.username}?`)) return;

    try {
      if (user.is_active) {
        await apiClient.delete(`/api/usuarios/users/${user.id}/`);
      } else {
        await apiClient.patch(`/api/usuarios/users/${user.id}/`, { is_active: true });
      }
      fetchUsuarios();
    } catch (err) {
      alert("Error al cambiar el estado.");
    }
  };

  const handleAdminPasswordReset = async (userId, userName) => {
    const newPassword = window.prompt(`Ingresa la nueva contraseña para ${userName}:`);
    if (newPassword) {
      if (newPassword.length < 8) {
        alert("La contraseña debe tener al menos 8 caracteres.");
        return;
      }
      try {
        await apiClient.put(`/api/usuarios/admin-reset-password/${userId}/`, {
          new_password: newPassword
        });
        alert("Contraseña actualizada exitosamente.");
      } catch (err) {
        alert("Error al cambiar la contraseña.");
      }
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando empleados...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Usuarios</h1>
        <p className="text-gray-600">Administra las cuentas y permisos de tu empresa</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <button
            onClick={() => handleOpenModal(null)}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            <Plus className="w-5 h-5" />
            Nuevo Usuario
          </button>
        </div>

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
                          className={`p-2 rounded-lg transition ${!canEdit ? 'text-gray-300 cursor-not-allowed' :
                            u.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
                            }`}
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
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingUser ? 'Editar Rol de Usuario' : 'Nuevo Usuario'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>

            {modalError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{modalError}</div>}

            <form onSubmit={handleSubmit} className="space-y-5">
              {!editingUser && (
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

              {editingUser && (
                <div className="p-4 bg-gray-50 rounded-lg mb-4">
                  <p className="text-sm text-gray-500">Usuario</p>
                  <p className="font-medium text-gray-900">{editingUser.first_name} {editingUser.last_name}</p>
                  <p className="text-sm text-gray-500 mt-2">Email</p>
                  <p className="font-medium text-gray-900">{editingUser.email}</p>
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

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md">
                  {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
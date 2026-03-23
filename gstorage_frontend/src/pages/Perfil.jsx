import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api';
import ChangePasswordModal from '../components/ChangePasswordModal';
import EditProfileModal from '../components/EditProfileModal'; 
import { User, Mail, Calendar, Shield, Edit, Phone, Building } from 'lucide-react';

export default function Perfil() {
  const { user, authTokens } = useAuth(); 
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const handleProfileUpdate = () => {
     window.location.reload(); 
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) return <div className="p-8 text-center">Cargando perfil...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Mi Perfil</h1>
        <p className="text-gray-600">Gestiona tu información personal y configuración de cuenta</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-8 mb-6 border border-gray-100">
        <div className="flex flex-col md:flex-row items-start justify-between mb-8 gap-4">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-3xl font-bold text-white">
                {user.first_name ? user.first_name[0].toUpperCase() : user.username[0].toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {user.first_name} {user.last_name}
              </h2>
              <p className="text-indigo-600 font-medium">@{user.username}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
          >
            <Edit className="w-4 h-4" />
            Editar Datos
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Email */}
          <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="w-5 h-5 text-indigo-500" />
              <p className="text-sm font-medium text-gray-500 uppercase">Correo Electrónico</p>
            </div>
            <p className="text-gray-900 font-medium pl-8">{user.email}</p>
          </div>

          {/* Rol */}
          <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-indigo-500" />
              <p className="text-sm font-medium text-gray-500 uppercase">Rol Asignado</p>
            </div>
            <p className="text-gray-900 font-medium pl-8">
              {user.perfil?.rol_display || 'Sin Rol'}
            </p>
          </div>

          {/* Empresa */}
          <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <Building className="w-5 h-5 text-indigo-500" />
              <p className="text-sm font-medium text-gray-500 uppercase">Empresa</p>
            </div>
            <p className="text-gray-900 font-medium pl-8">
              {user.perfil?.empresa_nombre || 'Sin Empresa'}
            </p>
          </div>

          {/* Teléfono */}
          <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <Phone className="w-5 h-5 text-indigo-500" />
              <p className="text-sm font-medium text-gray-500 uppercase">Teléfono</p>
            </div>
            <p className="text-gray-900 font-medium pl-8">
              {user.perfil?.telefono || 'No registrado'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
           <Shield className="w-6 h-6 text-indigo-600" />
           Configuración de Seguridad
        </h2>
        <div className="space-y-4">
          <button 
            className="w-full text-left p-4 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-indigo-300 transition group"
            data-bs-toggle="modal" 
            data-bs-target="#changePasswordModal"
            onClick={() => setShowPasswordModal(true)}
          >
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-gray-900 font-medium mb-1 group-hover:text-indigo-700">Cambiar Contraseña</p>
                    <p className="text-gray-500 text-sm">Actualiza tu contraseña de acceso periódicamente</p>
                </div>
                <Edit className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
            </div>
          </button>
        </div>
      </div>

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
      
      {showEditModal && (
        <EditProfileModal 
            user={user} 
            onClose={() => setShowEditModal(false)} 
            onUpdateSuccess={handleProfileUpdate}
        />
      )}
    </div>
  );
}
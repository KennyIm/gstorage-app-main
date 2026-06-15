import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api';
import ChangePasswordModal from '../components/ChangePasswordModal';
import EditProfileModal from '../components/EditProfileModal';
import { User, Mail, Calendar, Shield, Edit, Phone, Building, Warehouse, QrCode, ShieldAlert, Trash2, Trash, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Perfil() {
  document.title = "Perfil - GStorage";
  const navigate = useNavigate()
  const { user, authTokens } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [loading2fa, setLoading2fa] = useState(false);
  const is2faActivo = user?.perfil?.is_2fa_enabled || false;
  const [error, setError] = useState(null);

  const handleDesactivar2FA = async () => {
    setLoading2fa(true);
    try {
      await apiClient.post('/api/usuarios/2fa/desactivar/')
      alert("Seguridad modificada: Doble factor eliminado.")
      window.location.reload()
    } catch (err) {
      alert("Hubo un error al intentar desactivar el 2FA.")
    } finally {
      setLoading2fa(false);
      setShowDisableModal(false);
    }
  }

  const handleProfileUpdate = () => {
    window.location.reload();
  };
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);

        const [sucursalesRes] = await Promise.all([
          apiClient.get('/api/usuarios/sucursales/')
        ]);

        setSucursales(sucursalesRes.data);
        setLoading(false);

      } catch (err) {
        if (err.response && err.response.status === 401) {
          if (logoutUser) logoutUser();
        } else {
          console.error("Error al cargar datos:", err);
          setError("No se pudo cargar la información de las sucursales.");
        }
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getNombreSucursal = (id) => {
    if (!id) return 'Sin sucursal';
    const sucursal = sucursales.find(s => String(s.id) === String(id));
    return sucursal ? sucursal.nombre : `Suc ${id}`
  }

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
  if (loading) return <div>Cargando perfil...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Mi Perfil</h1>
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
              <Warehouse className="w-5 h-5 text-indigo-500" />
              <p className="text-sm font-medium text-gray-500 uppercase">Sucursal</p>
            </div>
            <p className="text-gray-900 font-medium pl-8">
              {user?.perfil?.sucursal_nombre.replace('Sucursal ', '') || 'Sin sucursal'}
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
          {!is2faActivo ? (
            <button
              className="w-full text-left p-4 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-indigo-300 transition group"
              onClick={() => navigate('/perfil/2fa')}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-900 font-medium mb-1 group-hover:text-indigo-700">Autenticación de Doble Factor (2FA)</p>
                  <p className="text-gray-500 text-sm">Protege el acceso a tu cuenta vinculando un token digital en tu celular</p>
                </div>
                <QrCode className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
              </div>
            </button>
          ) : (
            <button
              className="w-full text-left p-4 border border-rose-200 bg-rose-50/20 rounded-xl hover:bg-rose-50 hover:border-rose-400 transition group"
              onClick={() => setShowDisableModal(true)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-rose-900 font-bold mb-1 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    Desactivar Doble Factor (2FA)
                  </p>
                  <p className="text-gray-500 text-sm">Tu cuenta actualmente está blindada. Haz clic aquí si deseas remover la protección.</p>
                </div>
                <Trash2 className="w-5 h-5 text-rose-400 group-hover:text-rose-600 transition" />
              </div>
            </button>
          )}
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
      {showDisableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">

            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-rose-50">
              <div className="flex items-center gap-2 text-rose-700 font-black text-xs uppercase tracking-wider">
                <ShieldAlert className="w-5 h-5" />
                <span>Confirmar Acción de Seguridad</span>
              </div>
              <button
                onClick={() => setShowDisableModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 text-center">
              <p className="text-gray-900 font-bold text-base mb-2">¿Estás seguro de eliminar la doble verificación?</p>
              <p className="text-gray-500 text-xs leading-relaxed">
                Al remover el 2FA, la seguridad de tu cuenta se reducirá significativamente. Cualquier persona que descubra tu contraseña genérica podrá acceder libremente a los registros logísticos de la empresa.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDisableModal(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-100 transition"
                disabled={loading2fa}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDesactivar2FA}
                className="px-4 py-2 bg-rose-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-rose-700 shadow-sm transition flex items-center gap-1.5"
                disabled={loading2fa}
              >
                {loading2fa ? 'Procesando...' : 'Sí, eliminar protección'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lock, AlertCircle, CheckCircle } from 'lucide-react';
import apiClient from '../services/api';

export default function ResetPassword() {
  document.title = "Reestablecer Contraseña";
  const [newPassword1, setNewPassword1] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { uid, token } = useParams(); 
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword1 !== newPassword2) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    setIsLoading(true);

    try {
      await apiClient.post('/api/usuarios/password-reset/confirm/', {
        uidb64: uid,
        token: token,
        new_password1: newPassword1,
        new_password2: newPassword2
      });
      setSuccess(true);
      
      // Redirigir al login después de 3 segundos
      setTimeout(() => navigate('/login'), 3000);

    } catch (err) {
      console.error(err.response?.data);
      const msg = err.response?.data?.token || err.response?.data?.password || 'Error al restablecer contraseña.';
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-gray-900 mb-2 font-medium text-2xl">¡Contraseña Restablecida!</h1>
          <p className="text-gray-600 mb-6">
            Tu contraseña ha sido actualizada correctamente. Serás redirigido al inicio de sesión en breve.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-gray-900 mb-2 font-medium text-2xl">Nueva Contraseña</h1>
          <p className="text-gray-600">Ingresa tu nueva contraseña para confirmar el cambio.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 mb-2 font-medium">Nueva Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={newPassword1}
                onChange={(e) => setNewPassword1(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-700 mb-2 font-medium">Confirmar Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={newPassword2}
                onChange={(e) => setNewPassword2(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50"
          >
            {isLoading ? 'Guardando...' : 'Restablecer Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
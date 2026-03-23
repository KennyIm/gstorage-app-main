import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import { Search, Plus, Edit, X, UserCircle, Phone, FileText, Power, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function DriversCatalog() {
  // --- ESTADOS ---
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  // Estados del Modal
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  
  // FormData basado en tus campos de Django
  const [formData, setFormData] = useState({
    nombre_completo: '',
    rut_conductor: '',
    numero_licencia: '',
    telefono: '',
    activo: true
  });

  // --- CARGA DE DATOS ---
  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/inventario/conductores/');
      setDrivers(response.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Error al cargar la lista de conductores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  // --- FILTRADO ---
  const filteredDrivers = drivers.filter(driver => {
    const term = searchTerm.toLowerCase();
    return (
      driver.nombre_completo.toLowerCase().includes(term) ||
      (driver.rut_conductor && driver.rut_conductor.toLowerCase().includes(term)) ||
      (driver.numero_licencia && driver.numero_licencia.toLowerCase().includes(term))
    );
  });

  // --- HANDLERS (MODAL) ---
  const handleOpenModal = (driver = null) => {
    setError(null);
    if (driver) {
      setEditingDriver(driver);
      setFormData({
        nombre_completo: driver.nombre_completo,
        rut_conductor: driver.rut_conductor,
        numero_licencia: driver.numero_licencia,
        telefono: driver.telefono || '',
        activo: driver.activo !== undefined ? driver.activo : true
      });
    } else {
      setEditingDriver(null);
      setFormData({
        nombre_completo: '',
        rut_conductor: '',
        numero_licencia: '',
        telefono: '',
        activo: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDriver(null);
    setFormData({
        nombre_completo: '',
        rut_conductor: '',
        numero_licencia: '',
        telefono: '',
        activo: true
    });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      if (editingDriver) {
        await apiClient.put(`/api/inventario/conductores/${editingDriver.id_conductor}/`, formData);
      } else {
        await apiClient.post('/api/inventario/conductores/', formData);
      }
      handleCloseModal();
      fetchDrivers();
    } catch (err) {
      console.error(err);
      setError("Error al guardar el conductor. Verifique los datos.");
    }
  };

  // --- LÓGICA DE ESTADO (DELETE = Desactivar, PATCH = Activar) ---
  const handleToggleStatus = async (driver) => {
    const isActive = driver.activo !== undefined ? driver.activo : true;
    const action = isActive ? 'DESACTIVAR' : 'ACTIVAR';
    
    if (!window.confirm(`¿Seguro que deseas ${action} a ${driver.nombre_completo}?`)) return;

    try {
        if (isActive) {
            // DELETE para desactivar (Soft Delete)
            await apiClient.delete(`/api/inventario/conductores/${driver.id_conductor}/`);
        } else {
            // PATCH para activar
            await apiClient.patch(`/api/inventario/conductores/${driver.id_conductor}/`, { activo: true });
        }
        fetchDrivers();
    } catch (err) {
        console.error(err);
        alert("Error al cambiar el estado del conductor.");
    }
  };

  // --- RENDER ---
  if (loading) return <div className="p-8 text-center text-gray-500">Cargando conductores...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Catálogo de Conductores</h1>
        <p className="text-gray-600">Registra y gestiona los conductores autorizados de la flota.</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, RUT o licencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Nuevo Conductor
          </button>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Conductor / RUT</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Licencia</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Contacto</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Estado</th>
                <th className="text-right py-4 px-4 text-sm font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((driver) => {
                const isActivo = driver.activo !== undefined ? driver.activo : true;

                return (
                  <tr 
                    key={driver.id_conductor} 
                    className={`border-b border-gray-100 transition ${!isActivo ? 'bg-gray-50/50 opacity-60' : 'hover:bg-gray-50'}`}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isActivo ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                          <UserCircle className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{driver.nombre_completo}</p>
                          <p className="text-xs text-gray-500">{driver.rut_conductor}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="font-mono text-sm">{driver.numero_licencia}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                        {driver.telefono ? (
                            <div className="flex items-center gap-2">
                                <Phone className="w-3.5 h-3.5" />
                                <span className="text-sm">{driver.telefono}</span>
                            </div>
                        ) : (
                            <span className="text-gray-400 italic text-sm">Sin teléfono</span>
                        )}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        isActivo 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {isActivo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        
                        {/* Editar */}
                        <button
                          onClick={() => handleOpenModal(driver)}
                          disabled={!isActivo} 
                          className={`p-2 rounded-lg transition ${isActivo ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-300 cursor-not-allowed'}`}
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Activar / Desactivar */}
                        <button
                            onClick={() => handleToggleStatus(driver)}
                            className={`p-2 rounded-lg transition ${
                                isActivo 
                                ? 'text-red-600 hover:bg-red-50' 
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={isActivo ? "Desactivar Conductor" : "Reactivar Conductor"}
                        >
                            {isActivo ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>

                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredDrivers.length === 0 && (
            <div className="text-center py-12 text-gray-500">
                No se encontraron conductores.
            </div>
          )}
        </div>
      </div>

      {/* MODAL FORMULARIO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform scale-100 transition-all">
            
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingDriver ? 'Editar Conductor' : 'Nuevo Conductor'}
              </h2>
              <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2 border border-red-100">
                    <AlertCircle size={16}/> {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Nombre Completo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
                <div className="relative">
                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={formData.nombre_completo}
                        onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Ej. Juan Pérez"
                        required
                    />
                </div>
              </div>

              {/* RUT */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RUT *</label>
                <input
                  type="text"
                  value={formData.rut_conductor}
                  onChange={(e) => setFormData({ ...formData, rut_conductor: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="12.345.678-9"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Licencia */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">N° Licencia *</label>
                    <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={formData.numero_licencia}
                            onChange={(e) => setFormData({ ...formData, numero_licencia: e.target.value })}
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="A4-1234"
                            required
                        />
                    </div>
                </div>

                {/* Teléfono */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="tel"
                            value={formData.telefono}
                            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="+56 9 ..."
                        />
                    </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100 mt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium shadow-sm"
                >
                  {editingDriver ? 'Guardar Cambios' : 'Crear Conductor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
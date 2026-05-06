import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import { Link } from 'react-router-dom';
import { useUI } from '../../context/UIContext';
import {
  Search, Plus, Edit, X, MapPin, Map,
  Power, CheckCircle, XCircle, AlertCircle, ArrowLeft, Loader2
} from 'lucide-react';

export default function DestinationsCatalog() {
  document.title = "Gestión de Destinos - GStorage";
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const { showLoader, hideLoader, showToast } = useUI();

  const [showModal, setShowModal] = useState(false);
  const [editingDestination, setEditingDestination] = useState(null);

  const [formData, setFormData] = useState({
    nombre_ciudad: '',
    region: '',
    activo: true
  });

  const fetchDestinations = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/inventario/destinos/');
      setDestinations(response.data);
      setError(null);
    } catch (err) {
      console.error(err);
      showToast('Error al cargar los datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, []);

  const filteredDestinations = destinations.filter(dest => {
    const term = searchTerm.toLowerCase();
    return (
      dest.nombre_ciudad.toLowerCase().includes(term) ||
      (dest.region && dest.region.toLowerCase().includes(term))
    );
  });

  const handleOpenModal = (destination = null) => {
    setError(null);
    if (destination) {
      setEditingDestination(destination);
      setFormData({
        nombre_ciudad: destination.nombre_ciudad,
        region: destination.region || '',
        activo: destination.activo !== undefined ? destination.activo : true
      });
    } else {
      setEditingDestination(null);
      setFormData({
        nombre_ciudad: '',
        region: '',
        activo: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDestination(null);
    setFormData({
      nombre_ciudad: '',
      region: '',
      activo: true
    });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    showLoader();

    try {
      if (editingDestination) {
        await apiClient.put(`/api/inventario/destinos/${editingDestination.id_destino}/`, formData);
        showToast('Registro actualizado con éxito', 'success');
      } else {
        await apiClient.post('/api/inventario/destinos/', formData);
        showToast('Registro creado con éxito', 'success');
      }
      handleCloseModal();
      fetchDestinations();
    } catch (err) {
      console.error(err);
      showToast('Error al guardar el destino Verifique los datos.', 'error');
    } finally {
      hideLoader();
    }
  };

  const handleToggleStatus = async (destination) => {
    const isActive = destination.activo !== undefined ? destination.activo : true;
    const action = isActive ? 'DESACTIVAR' : 'ACTIVAR';

    if (!window.confirm(`¿Seguro que deseas ${action} el destino ${destination.nombre_ciudad}?`)) return;

    try {
      if (isActive) {
        await apiClient.delete(`/api/inventario/destinos/${destination.id_destino}/`);
      } else {
        await apiClient.patch(`/api/inventario/destinos/${destination.id_destino}/`, { activo: true });
      }
      fetchDestinations();
    } catch (err) {
      console.error(err);
      showToast('Error al cambiar el estado.', 'error');
    }
  };

  if (loading) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
          <p>Cargando destinos...</p>
        </div>
      );
    }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Destinos</h1>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por ciudad o región..."
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
            Nuevo Destino
          </button>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Ciudad</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Región</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Estado</th>
                <th className="text-right py-4 px-4 text-sm font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredDestinations.map((dest) => {
                const isActivo = dest.activo !== undefined ? dest.activo : true;

                return (
                  <tr
                    key={dest.id_destino}
                    className={`border-b border-gray-100 transition ${!isActivo ? 'bg-gray-50/50 opacity-60' : 'hover:bg-gray-50'}`}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isActivo ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                          <MapPin className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-gray-900">{dest.nombre_ciudad}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Map className="w-4 h-4 text-gray-400" />
                        {dest.region || 'Sin especificar'}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${isActivo
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
                          onClick={() => handleOpenModal(dest)}
                          disabled={!isActivo}
                          className={`p-2 rounded-lg transition ${isActivo ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-300 cursor-not-allowed'}`}
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Activar / Desactivar */}
                        <button
                          onClick={() => handleToggleStatus(dest)}
                          className={`p-2 rounded-lg transition ${isActivo
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-green-600 hover:bg-green-50'
                            }`}
                          title={isActivo ? "Desactivar" : "Activar"}
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

          {filteredDestinations.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No se encontraron destinos registrados.
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
                {editingDestination ? 'Editar Destino' : 'Nuevo Destino'}
              </h2>
              <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2 border border-red-100">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Nombre Ciudad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Ciudad *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.nombre_ciudad}
                    onChange={(e) => setFormData({ ...formData, nombre_ciudad: e.target.value })}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Ej. Santiago"
                    required
                  />
                </div>
              </div>

              {/* Región */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Región</label>
                <div className="relative">
                  <Map className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full pl-9 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Ej. Metropolitana"
                  />
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
                  {editingDestination ? 'Guardar Cambios' : 'Crear Destino'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
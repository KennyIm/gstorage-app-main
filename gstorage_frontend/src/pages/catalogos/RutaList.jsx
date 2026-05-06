import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import { Link } from 'react-router-dom';
import { useUI } from '../../context/UIContext';
import {
  Search, Plus, Edit, X, Route, MapPin, AlignLeft,
  Power, CheckCircle, XCircle, AlertCircle, ArrowLeft, Loader2
} from 'lucide-react';

export default function RoutesCatalog() {
  document.title = "Gestión de Rutas - GStorage";
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const { showLoader, hideLoader, showToast } = useUI();

  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);

  const [formData, setFormData] = useState({
    codigo_ruta: '',
    nombre_ruta: '',
    descripcion: '',
    activo: true
  });

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/inventario/rutas/');
      setRoutes(response.data);
      setError(null);
    } catch (err) {
      console.error(err);
      showToast('Error al cargar la lista de rutas.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const filteredRoutes = routes.filter(route => {
    const term = searchTerm.toLowerCase();
    return (
      route.nombre_ruta.toLowerCase().includes(term) ||
      (route.descripcion && route.descripcion.toLowerCase().includes(term)) ||
      route.codigo_ruta.toLowerCase().includes(term)
    );
  });

  const handleOpenModal = (route = null) => {
    setError(null);
    if (route) {
      setEditingRoute(route);
      setFormData({
        codigo_ruta: route.codigo_ruta,
        nombre_ruta: route.nombre_ruta,
        descripcion: route.descripcion || '',
        activo: route.activo !== undefined ? route.activo : true
      });
    } else {
      setEditingRoute(null);
      setFormData({
        nombre_ruta: '',
        descripcion: '',
        codigo_ruta: '',
        activo: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRoute(null);
    setFormData({
      codigo_ruta: '',
      nombre_ruta: '',
      descripcion: '',
      activo: true
    });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    showLoader();
    const { activo, ...payload } = formData;
    try {
      if (editingRoute) {
        await apiClient.put(`/api/inventario/rutas/${editingRoute.id_ruta}/`, payload);
        showToast('Registro actualizado con éxito', 'success');
      } else {
        await apiClient.post('/api/inventario/rutas/', payload);
        showToast('Registro creado con éxito', 'success');
      }
      handleCloseModal();
      fetchRoutes();
    } catch (err) {
      console.error(err);
      showToast("Error al guardar la ruta. Verifique los datos.", 'error');
    } finally {
      hideLoader();
    }
  };

  const handleToggleStatus = async (route) => {
    const isActive = route.activo !== undefined ? route.activo : true;
    const action = isActive ? 'DESACTIVAR' : 'ACTIVAR';

    if (!window.confirm(`¿Seguro que deseas ${action} la ruta ${route.nombre_ruta}?`)) return;

    try {
      if (isActive) {
        await apiClient.delete(`/api/inventario/rutas/${route.id_ruta}/`);
      } else {
        await apiClient.patch(`/api/inventario/rutas/${route.id_ruta}/`, { activo: true });
      }
      fetchRoutes();
    } catch (err) {
      console.error(err);
      showToast('Error al cambiar el estado de la ruta.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
        <p>Cargando rutas...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Rutas</h1>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código, nombre o descripción..."
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
            Nueva Ruta
          </button>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className='text-left py-4 px-4 text-sm font-semibold text-gray-600'>Código de Ruta</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Nombre de Ruta</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Descripción</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Estado</th>
                <th className="text-right py-4 px-4 text-sm font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoutes.map((route) => {
                const isActivo = route.activo !== undefined ? route.activo : true;

                return (
                  <tr
                    key={route.id_ruta}
                    className={`border-b border-gray-100 transition ${!isActivo ? 'bg-gray-50/50 opacity-60' : 'hover:bg-gray-50'}`}
                  >
                    <td className='py-4 px-4'>
                      <div className='flex items-center gap-3'>
                        <div className={`p-2 rounded-lg ${isActivo ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                          <Route className='w-5 h-5' />
                        </div>
                        <span className='font-semibold text-gray-900'>{route.codigo_ruta}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">{route.nombre_ruta}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-start gap-2 max-w-md">
                        <AlignLeft className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-600 text-sm truncate block">
                          {route.descripcion || 'Sin descripción'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${isActivo
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                        }`}>
                        {isActivo ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">

                        {/* Editar */}
                        <button
                          onClick={() => handleOpenModal(route)}
                          disabled={!isActivo}
                          className={`p-2 rounded-lg transition ${isActivo ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-300 cursor-not-allowed'}`}
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Activar / Desactivar */}
                        <button
                          onClick={() => handleToggleStatus(route)}
                          className={`p-2 rounded-lg transition ${isActivo
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-green-600 hover:bg-green-50'
                            }`}
                          title={isActivo ? "Desactivar Ruta" : "Reactivar Ruta"}
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

          {filteredRoutes.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No se encontraron rutas registradas.
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
                {editingRoute ? 'Editar Ruta' : 'Nueva Ruta'}
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Código de Ruta <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="codigo_ruta"
                  value={formData.codigo_ruta || ''}
                  onChange={(e) => setFormData({ ...formData, codigo_ruta: e.target.value })}
                  placeholder="Ej: 001"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">Este código aparecerá en las Órdenes de Entrega</p>
              </div>

              {/* Nombre Ruta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Ruta *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.nombre_ruta}
                    onChange={(e) => setFormData({ ...formData, nombre_ruta: e.target.value })}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Ej. Ruta Norte Express"
                    required
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <div className="relative">
                  <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    className="w-full pl-9 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]"
                    placeholder="Detalles sobre el recorrido, paradas o restricciones..."
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
                  {editingRoute ? 'Guardar Cambios' : 'Crear Ruta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
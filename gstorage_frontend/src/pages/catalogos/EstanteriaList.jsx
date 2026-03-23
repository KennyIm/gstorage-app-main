import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import { Search, Plus, Edit, X, Archive, Box, Ruler, Power, CheckCircle, XCircle, AlertCircle, LayoutGrid } from 'lucide-react';

export default function ShelvesCatalog() {
  // --- ESTADOS ---
  const [shelves, setShelves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  // Estados del Modal
  const [showModal, setShowModal] = useState(false);
  const [editingShelf, setEditingShelf] = useState(null);
  
  const [formData, setFormData] = useState({
    codigo_estanteria: '',
    pos_x: 0, pos_y: 0, pos_z: 0,
    num_modulos_ancho: 1, num_niveles_alto: 1, num_profundidad: 1,
    ancho_hueco_m: 1.0, alto_hueco_m: 1.0, profundo_hueco_m: 1.0,
    activo: true 
  });

  // --- CARGA DE DATOS ---
  const fetchShelves = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/inventario/estanterias/');
      setShelves(response.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Error al cargar estanterías.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShelves();
  }, []);

  // --- FILTRADO ---
  const filteredShelves = shelves.filter(shelf => 
    shelf.codigo_estanteria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- HANDLERS (MODAL) ---
  const handleOpenModal = (shelf = null) => {
    setError(null);
    if (shelf) {
      setEditingShelf(shelf);
      setFormData({
        codigo_estanteria: shelf.codigo_estanteria,
        pos_x: shelf.pos_x, pos_y: shelf.pos_y, pos_z: shelf.pos_z,
        num_modulos_ancho: shelf.num_modulos_ancho, 
        num_niveles_alto: shelf.num_niveles_alto, 
        num_profundidad: shelf.num_profundidad,
        ancho_hueco_m: shelf.ancho_hueco_m, 
        alto_hueco_m: shelf.alto_hueco_m, 
        profundo_hueco_m: shelf.profundo_hueco_m,
        activo: shelf.activo !== undefined ? shelf.activo : true
      });
    } else {
      setEditingShelf(null);
      setFormData({
        codigo_estanteria: '',
        pos_x: 0, pos_y: 0, pos_z: 0,
        num_modulos_ancho: 1, num_niveles_alto: 1, num_profundidad: 1,
        ancho_hueco_m: 1.0, alto_hueco_m: 1.0, profundo_hueco_m: 1.0,
        activo: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingShelf(null);
    setError(null);
  };

  // Handler refinado para inputs (Enteros vs Flotantes)
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'codigo_estanteria') {
        setFormData(prev => ({ ...prev, [name]: value }));
    } else {
        // Determinar si el campo espera un entero o un decimal
        const isInteger = ['num_modulos_ancho', 'num_niveles_alto', 'num_profundidad'].includes(name);
        
        let val;
        if (value === '') {
            val = ''; // Permitir vaciar el input mientras se escribe
        } else {
            val = isInteger ? parseInt(value) : parseFloat(value);
        }
        
        setFormData(prev => ({ ...prev, [name]: val }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // 1. Limpiamos el payload: Extraemos 'activo' para NO enviarlo en PUT/POST
    // ya que el backend podría rechazarlo si no está en el serializador de escritura.
    const { activo, ...payload } = formData;

    // Asegurarse de que los valores numéricos no sean strings vacíos al enviar
    const sanitizedPayload = Object.fromEntries(
        Object.entries(payload).map(([key, val]) => {
            if (key !== 'codigo_estanteria' && (val === '' || isNaN(val))) {
                return [key, 0]; 
            }
            return [key, val];
        })
    );

    try {
      if (editingShelf) {
        // UPDATE
        await apiClient.put(`/api/inventario/estanterias/${editingShelf.id}/`, sanitizedPayload);
      } else {
        // CREATE
        await apiClient.post('/api/inventario/estanterias/', sanitizedPayload);
      }
      handleCloseModal();
      fetchShelves();
    } catch (err) {
      console.error(err);
      setError("Error al guardar la estantería. Verifique los datos.");
    }
  };

  // --- LÓGICA DE ESTADO (Soft Delete) ---
  const handleToggleStatus = async (shelf) => {
    const isActive = shelf.activo !== undefined ? shelf.activo : true;
    const action = isActive ? 'DESACTIVAR' : 'ACTIVAR';
    
    if (!window.confirm(`¿Seguro que deseas ${action} la estantería ${shelf.codigo_estanteria}?`)) return;

    try {
        if (isActive) {
            // DELETE para desactivar (usando .id)
            await apiClient.delete(`/api/inventario/estanterias/${shelf.id}/`);
        } else {
            // PATCH para activar (usando .id)
            await apiClient.patch(`/api/inventario/estanterias/${shelf.id}/`, { activo: true });
        }
        fetchShelves();
    } catch (err) {
        console.error(err);
        alert("Error al cambiar el estado.");
    }
  };

  // --- RENDER ---
  if (loading) return <div className="p-8 text-center text-gray-500">Cargando estanterías...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Catálogo de Estanterías</h1>
        <p className="text-gray-600">Configura la disposición física y capacidad de tu almacén.</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código..."
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
            Nueva Estantería
          </button>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Estantería</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Posición (m)</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Estructura</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Dim. Hueco</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Estado</th>
                <th className="text-right py-4 px-4 text-sm font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredShelves.map((shelf) => {
                const isActivo = shelf.activo !== undefined ? shelf.activo : true;
                const totalHuecos = (shelf.num_modulos_ancho || 0) * (shelf.num_niveles_alto || 0) * (shelf.num_profundidad || 0);

                return (
                  <tr 
                    key={shelf.id} 
                    className={`border-b border-gray-100 transition ${!isActivo ? 'bg-gray-50/50 opacity-60' : 'hover:bg-gray-50'}`}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isActivo ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                          <Archive className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="font-semibold text-gray-900 block">{shelf.codigo_estanteria}</span>
                            <span className="text-xs text-gray-500 font-mono">ID: {shelf.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded w-fit">
                             <AlertCircle className="w-3 h-3 text-gray-400" />
                             X:{shelf.pos_x} Y:{shelf.pos_y} Z:{shelf.pos_z}
                        </div>
                    </td>
                    <td className="py-4 px-4">
                        <div className="flex flex-col text-sm">
                            <span className="font-medium text-gray-700">{totalHuecos} Huecos Totales</span>
                            <span className="text-gray-500 text-xs">
                                {shelf.num_modulos_ancho} ancho x {shelf.num_niveles_alto} alto x {shelf.num_profundidad} prof
                            </span>
                        </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                            <Box className="w-4 h-4 text-gray-400" />
                            {shelf.ancho_hueco_m}m x {shelf.alto_hueco_m}m x {shelf.profundo_hueco_m}m
                        </div>
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
                        
                        <button
                          onClick={() => handleOpenModal(shelf)}
                          disabled={!isActivo} 
                          className={`p-2 rounded-lg transition ${isActivo ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-300 cursor-not-allowed'}`}
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => handleToggleStatus(shelf)}
                            className={`p-2 rounded-lg transition ${
                                isActivo 
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

          {filteredShelves.length === 0 && (
            <div className="text-center py-12 text-gray-500">
                No se encontraron estanterías registradas.
            </div>
          )}
        </div>
      </div>

      {/* MODAL FORMULARIO COMPLEJO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 transform scale-100 transition-all max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingShelf ? 'Editar Estantería' : 'Nueva Estantería'}
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

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Sección Principal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código Identificador *</label>
                <div className="relative">
                    <Archive className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        name="codigo_estanteria"
                        value={formData.codigo_estanteria}
                        onChange={handleChange}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono uppercase"
                        placeholder="EST-A01"
                        required
                    />
                </div>
              </div>

              {/* Grid de 3 Columnas para secciones técnicas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. Posición */}
                <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2 mb-2 text-indigo-600 font-semibold text-sm">
                        <LayoutGrid className="w-4 h-4" /> Posición (m)
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">Eje X</label>
                        <input type="number" name="pos_x" step="0.1" value={formData.pos_x} onChange={handleChange} className="w-full mt-1 p-2 border border-gray-200 rounded text-sm focus:border-indigo-500 outline-none" required />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">Eje Y (Suelo)</label>
                        <input type="number" name="pos_y" step="0.1" value={formData.pos_y} onChange={handleChange} className="w-full mt-1 p-2 border border-gray-200 rounded text-sm focus:border-indigo-500 outline-none" required />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">Eje Z</label>
                        <input type="number" name="pos_z" step="0.1" value={formData.pos_z} onChange={handleChange} className="w-full mt-1 p-2 border border-gray-200 rounded text-sm focus:border-indigo-500 outline-none" required />
                    </div>
                </div>

                {/* 2. Estructura */}
                <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2 mb-2 text-indigo-600 font-semibold text-sm">
                        <LayoutGrid className="w-4 h-4" /> Estructura (Cant)
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">Módulos Ancho</label>
                        <input type="number" name="num_modulos_ancho" min="1" value={formData.num_modulos_ancho} onChange={handleChange} className="w-full mt-1 p-2 border border-gray-200 rounded text-sm focus:border-indigo-500 outline-none" required />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">Niveles Alto</label>
                        <input type="number" name="num_niveles_alto" min="1" value={formData.num_niveles_alto} onChange={handleChange} className="w-full mt-1 p-2 border border-gray-200 rounded text-sm focus:border-indigo-500 outline-none" required />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">Profundidad</label>
                        <input type="number" name="num_profundidad" min="1" value={formData.num_profundidad} onChange={handleChange} className="w-full mt-1 p-2 border border-gray-200 rounded text-sm focus:border-indigo-500 outline-none" required />
                    </div>
                </div>

                {/* 3. Dimensiones Hueco */}
                <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2 mb-2 text-indigo-600 font-semibold text-sm">
                        <Ruler className="w-4 h-4" /> Dim. Hueco (m)
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">Ancho</label>
                        <input type="number" name="ancho_hueco_m" step="0.01" value={formData.ancho_hueco_m} onChange={handleChange} className="w-full mt-1 p-2 border border-gray-200 rounded text-sm focus:border-indigo-500 outline-none" required />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">Alto</label>
                        <input type="number" name="alto_hueco_m" step="0.01" value={formData.alto_hueco_m} onChange={handleChange} className="w-full mt-1 p-2 border border-gray-200 rounded text-sm focus:border-indigo-500 outline-none" required />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">Profundidad</label>
                        <input type="number" name="profundo_hueco_m" step="0.01" value={formData.profundo_hueco_m} onChange={handleChange} className="w-full mt-1 p-2 border border-gray-200 rounded text-sm focus:border-indigo-500 outline-none" required />
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
                  {editingShelf ? 'Guardar Cambios' : 'Crear Estantería'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
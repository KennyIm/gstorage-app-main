import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Edit, Trash2, Package, MapPin, User,
  Calendar, Activity, Truck, Scale, Box, FileText,
  Loader2, Info, DollarSign, Warehouse,
  PackageCheck,
  Sparkle
} from 'lucide-react';
import { useUI } from '../context/UIContext';

export default function MercanciaDetail() {
  document.title = "Detalles de Mercancia - GStorage";
  const [mercancia, setMercancia] = useState(null);

  const [clientes, setClientes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [destinos, setDestinos] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [sucursales, setSucursales] = useState([]);

  const [loading, setLoading] = useState(true);

  const { showToast } = useUI();

  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logoutUser } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const mercanciaRes = await apiClient.get(`/api/inventario/mercancias/${id}/`);
        setMercancia(mercanciaRes.data);

        const [clientesRes, destinosRes, ubicacionesRes, sucursalesRes, provRes] = await Promise.all([
          apiClient.get('/api/inventario/clientes/'),
          apiClient.get('/api/inventario/destinos/'),
          apiClient.get('/api/inventario/ubicaciones/'),
          apiClient.get('/api/usuarios/sucursales/'),
          apiClient.get('/api/inventario/proveedores/')
        ]);

        setClientes(clientesRes.data);
        setDestinos(destinosRes.data);
        setUbicaciones(ubicacionesRes.data);
        setSucursales(sucursalesRes.data);
        setProveedores(provRes.data)

      } catch (err) {
        if (err.response && err.response.status === 401) {
          showToast('Credenciales de autenticación no válidas, por favor ingrese de nuevo.', 'error');
          logoutUser();
        } else {
          console.error("Error al cargar datos:", err);
          showToast('No se pudo cargar la información necesaria.', 'error');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, logoutUser, showToast]);

  const getNombreCliente = (id) => {
    if (!id) return 'No asignado';
    const cliente = clientes.find(c => c.id_cliente === id);
    return cliente ? cliente.nombre_cliente : `ID: ${id} (No encontrado)`;
  };

  const getNombreDestino = (id) => {
    if (!id) return 'No asignado';
    const destino = destinos.find(d => d.id_destino === id);
    return destino ? destino.nombre_ciudad : `ID: ${id}`;
  };

  const getCodigoUbicacion = (id) => {
    if (!id) return 'Sin ubicación';
    const ubicacion = ubicaciones.find(u => u.id_ubicacion === id);
    return ubicacion ? ubicacion.codigo_ubicacion : `ID: ${id}`;
  };

  const getNombreSucursal = (id) => {
    if (!id) return 'Sin sucursal';
    const sucursal = sucursales.find(s => String(s.id) === String(id));
    return sucursal ? sucursal.nombre : `Suc ${id}`
  }

  const handleDelete = async () => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el Lote #${mercancia?.id_mercancia}?`)) {
      try {
        await apiClient.delete(`api/inventario/mercancias/${id}/`);
        showToast('Mercancía eliminada exitosamente.', 'success');
        navigate('/mercancias');
      } catch (err) {
        console.error("Error al eliminar:", err);
        showToast('No se pudo eliminar la mercancía.', 'error');
      }
    }
  };


  // --- RENDERIZADO DEL SPINNER LOCAL ---
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
        <p>Cargando detalles del lote...</p>
      </div>
    );
  }

  if (!mercancia) return <div className="p-8 text-center text-gray-500">No se encontró la mercancía.</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto">
        {user?.perfil?.sucursal_id && String(user.perfil.sucursal_id) !== String(mercancia.sucursal_id) && (
          <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg flex items-start gap-3 shadow-sm animate-fade-down animate-duration-300">
            <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-amber-800 font-bold text-sm">
                Estás viendo una mercancía de otra sucursal
              </h3>
              <p className="text-amber-700 text-xs mt-1">
                Esta carga pertenece a <strong>{getNombreSucursal(mercancia.sucursal_id)}</strong> (Tu sucursal actual es {getNombreSucursal(user.perfil.sucursal_id)}). Todo cambió o eliminación de información quedara registrado y almacenado.
              </p>
            </div>
          </div>
        )}

        {/* Header de Navegación */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/mercancias" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 transition shadow-sm">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">Lote #{mercancia.id_mercancia || mercancia.id || id}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${mercancia.estado === 'ALMACENADO' ? 'bg-green-50 text-green-700 border-green-200' :
                  mercancia.estado === 'DESPACHADO' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-gray-100 text-gray-600 border-gray-200'
                  }`}>
                  {mercancia.estado}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={`/mercancias/${id}/editar`}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition shadow-sm"
            >
              <Edit className="w-4 h-4" /> Editar
            </Link>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-700 font-medium rounded-lg hover:bg-red-100 transition shadow-sm"
            >
              <Trash2 className="w-4 h-4" /> Eliminar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-2 space-y-6">

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600" /> Datos del Lote
                </h3>
              </div>
              <div className="p-6">

                <div className="flex items-start gap-4 mb-6 p-4 bg-indigo-50/50 rounded-lg border border-indigo-100">
                  <div className="p-2 bg-white rounded-full shadow-sm text-indigo-600">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Cliente Asociado</span>
                    <span className="block text-lg font-semibold text-gray-900">
                      {getNombreCliente(mercancia.id_cliente)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 border border-gray-100 rounded-lg text-center hover:border-gray-200 transition bg-white">
                    <Package className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                    <span className="block text-xl font-bold text-gray-900">{mercancia.cantidad_bultos}</span>
                    <span className="text-xs text-gray-500 font-medium">Bultos</span>
                  </div>
                  <div className="p-4 border border-gray-100 rounded-lg text-center hover:border-gray-200 transition bg-white">
                    <Scale className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                    <span className="block text-xl font-bold text-gray-900">{(mercancia.kg || 0).toLocaleString('es-CL')}</span>
                    <span className="text-xs text-gray-500 font-medium">Kg</span>
                  </div>
                  <div className="p-4 border border-gray-100 rounded-lg text-center hover:border-gray-200 transition bg-white">
                    <Box className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                    <span className="block text-xl font-bold text-gray-900">{(mercancia.m3 || 0).toLocaleString('es-CL')}</span>
                    <span className="text-xs text-gray-500 font-medium">m³</span>
                  </div>
                  <div className="p-4 border border-emerald-100 rounded-lg text-center hover:border-emerald-200 transition bg-emerald-50">
                    <DollarSign className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
                    <span className="block text-xl font-bold text-emerald-700">
                      ${parseFloat(mercancia.precio_total || 0).toLocaleString('es-CL')}
                    </span>
                    <span className="text-xs text-emerald-600 font-medium">Valor Total</span>
                  </div>
                  <div className="p-4 border border-emerald-100 rounded-lg text-center hover:border-emerald-200 transition bg-blue-50">
                    <User className="w-5 h-5 text-blue-500 mx-auto mb-2" />
                    <span className="block text-sm font-bold text-gray-600 truncate px-1">
                      {(() => {
                        const provObj = proveedores.find(p => Number(p.id) === Number(mercancia.id_proveedor))
                        return provObj ? provObj.nombre_proveedor : "Sin Asignar"
                      })()}
                    </span>
                    <span className="text-xs text-blue-600 font-medium">Proveedor</span>
                  </div>
                  <div className="p-4 border border-emerald-100 rounded-lg text-center hover:border-emerald-200 transition bg-amber-50">
                    <FileText className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                    <span className="block text-sm font-bold text-gray-600 truncate px-1">
                      {mercancia.factura || "Sin Asignar"}
                    </span>
                    <span className="text-xs text-amber-600 font-medium">Factura</span>
                  </div>
                  <div className="p-4 border border-cyan-100 rounded-lg text-center hover:border-cyan-200 transition bg-cyan-50">
                    <Warehouse className="w-5 h-5 text-cyan-500 mx-auto mb-2" />
                    <span className="block text-sm font-bold text-gray-600 truncate px-1">
                      {getNombreSucursal(mercancia.sucursal_id).replace('Sucursal ', '')}
                    </span>
                    <span className="text-xs text-cyan-600 font-medium">Sucursal</span>
                  </div>
                  <div className="p-4 border border-red-100 rounded-lg text-center hover:border-red-200 transition bg-red-50">
                    <PackageCheck className="w-5 h-5 text-red-500 mx-auto mb-2" />
                    <span className="block text-sm font-bold text-gray-600 truncate px-1">
                      {mercancia.tipo || "Sin Especificar"}
                    </span>
                    <span className="text-xs text-red-600 font-medium">Tipo</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" /> Descripción
                  </h4>
                  <p className="text-gray-600 text-sm leading-relaxed p-3 bg-gray-50 rounded-lg border border-gray-100">
                    {mercancia.descripcion_carga || "Sin descripción registrada."}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                <Info className="w-4 h-4 text-gray-400" />
                <h3 className="font-semibold text-gray-700 text-sm">Información de Auditoría</h3>
              </div>
              {(() => {
                const nombreCreador = mercancia.creador_nombre || 'N/A';
                const iniciales = nombreCreador !== 'N/A' && nombreCreador !== 'Desconocido'
                  ? nombreCreador.substring(0, 2).toUpperCase()
                  : '?';

                return (
                  <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">

                    {/* Sección Creado Por */}
                    <div>
                      <span className="block text-xs text-gray-500 mb-1">Creado por</span>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                          {iniciales}
                        </div>
                        <span className="text-gray-900 font-medium">{nombreCreador}</span>
                      </div>
                    </div>

                    {/* Sección Última Modificación */}
                    <div>
                      <span className="block text-xs text-gray-500 mb-1">Última Modificación</span>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 font-medium">
                          {mercancia.ultima_modificacion
                            ? new Date(mercancia.ultima_modificacion).toLocaleString('es-CL', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })
                            : "Fecha no disponible"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" /> Logística
                </h3>
              </div>
              <div className="p-6 space-y-6">

                <div className="relative pl-4 border-l-2 border-indigo-200">
                  <span className="block text-xs font-medium text-gray-500 uppercase mb-1">N° de Orden</span>
                  <div className="flex items-center gap-2 text-gray-900 font-medium">
                    <Sparkle className="w-4 h-4 text-indigo-500" />
                    {mercancia.numero_orden_entrega || "Sin número de orden"}
                  </div>
                </div>

                <div className="relative pl-4 border-l-2 border-orange-200">
                  <span className="block text-xs font-medium text-gray-500 uppercase mb-1">Destino Final</span>
                  <div className="flex items-center gap-2 text-gray-900 font-medium">
                    <MapPin className="w-4 h-4 text-orange-500" />
                    {getNombreDestino(mercancia.id_destino)}
                  </div>
                </div>

                <div className="relative pl-4 border-l-2 border-gray-200">
                  <span className="block text-xs font-medium text-gray-500 uppercase mb-1">Despacho</span>
                  {mercancia.id_despacho ? (
                    <div className="flex items-center gap-2 text-blue-600 font-medium">
                      <Truck className="w-4 h-4" />
                      Despacho #{mercancia.id_despacho}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic text-sm">Pendiente de asignar</span>
                  )}
                </div>

              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-center">
                <button onClick={() => navigate('/historial')} className="text-indigo-600 text-sm font-medium hover:text-indigo-700 transition">
                  Ver historial de movimientos
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
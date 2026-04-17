import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Listbox, ListboxButton, ListboxOption, ListboxOptions, Transition,
  Menu, MenuButton, MenuItem, MenuItems,
} from '@headlessui/react';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Edit, Trash2, Truck, MapPin, User, Calendar,
  Clock, Package, CheckCircle, AlertCircle, Loader2, Map, Printer,
  Share2, X, ChevronsUpDown, Check, Download, ChevronDown
} from 'lucide-react';

export default function DespachoDetail() {
  document.title = "Detalles Despacho";
  const [despacho, setDespacho] = useState(null);
  const [mercancias, setMercancias] = useState([]);

  const [rutas, setRutas] = useState([]);
  const [camiones, setCamiones] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [clientes, setClientes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { logoutUser } = useAuth();

  const [modalInvitacionOpen, setModalInvitacionOpen] = useState(false);
  const [usuarioAInvitar, setUsuarioAInvitar] = useState('');
  const [mensajeInvitacion, setMensajeInvitacion] = useState({ tipo: '', texto: '' });
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);

  const esColaboradorInvitado = despacho?.colaboradores_activos?.some(
    (colab) => String(colab.id) === String(user?.id)
  );

  const isReadOnly =
    user?.perfil?.rol !== 'DUENO' &&
    String(despacho?.sucursal_id) !== String(user?.perfil?.sucursal_id) &&
    !esColaboradorInvitado;

  const puedeCompartir =
    user?.perfil?.rol === 'DUENO' ||
    String(despacho?.sucursal_id) === String(user?.perfil?.sucursal_id);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [despachoRes, mercanciasRes, rutasRes, camionesRes, conductoresRes, clientesRes] = await Promise.all([
          apiClient.get(`/api/inventario/despachos/${id}/`),
          apiClient.get(`/api/inventario/mercancias/?id_despacho=${id}`),
          apiClient.get('/api/inventario/rutas/'),
          apiClient.get('/api/inventario/camiones/'),
          apiClient.get('/api/inventario/conductores/'),
          apiClient.get('/api/inventario/clientes/'),
        ]);

        setDespacho(despachoRes.data);
        setMercancias(mercanciasRes.data);
        setRutas(rutasRes.data);
        setCamiones(camionesRes.data);
        setConductores(conductoresRes.data);
        setClientes(clientesRes.data);

        setLoading(false);
      } catch (err) {
        if (err.response && err.response.status === 401) {
          logoutUser();
        } else {
          console.error("Error al buscar la información:", err);
          setError("No se pudo cargar la información completa del despacho.");
        }
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (modalInvitacionOpen && despacho) {
      const fetchUsuarios = async () => {
        try {
          const res = await apiClient.get('/api/usuarios/users');
          const listaUsuarios = res.data.results || res.data;
          const usuariosElegibles = listaUsuarios.filter((u) => {
            const sucursalUsuario = u?.perfil?.sucursal_id || u?.perfil?.sucursal;
            const sucursalDespacho = despacho?.sucursal_id || despacho?.sucursal;

            return String(sucursalUsuario) !== String(sucursalDespacho);
          });

          setUsuarios(usuariosElegibles);

          if (usuariosElegibles.length > 0) {
            setUsuarioSeleccionado(usuariosElegibles[0]);
          } else {
            setUsuarioSeleccionado(null);
          }

        } catch (error) {
          console.error("Error cargando usuarios", error);
        }
      };
      fetchUsuarios();
    }
  }, [modalInvitacionOpen, despacho]);

  // --- Helpers para obtener Nombres ---
  const getNombreRuta = (id) => {
    const found = rutas.find(r => r.id_ruta === id);
    return found ? found.codigo_ruta : `Ruta ID: ${id}`;
  };

  const getInfoCamion = (id) => {
    const found = camiones.find(c => c.id_camion === id);
    return found ? `${found.marca} - ${found.patente}` : `Camión ID: ${id}`;
  };

  const getNombreConductor = (id) => {
    const found = conductores.find(c => c.id_conductor === id);
    return found ? found.nombre_completo : `Conductor ID: ${id}`;
  };

  const getNombreCliente = (id) => {
    const found = clientes.find(c => String(c.id_cliente) === String(id));
    return found ? found.nombre_cliente : `Cliente Desconocido`;
  };

  const getDireccionCliente = (id) => {
    const found = clientes.find(c => String(c.id_cliente) === String(id));
    return found ? found.direccion : `Dirección no registrada`;
  };


  const handleDelete = async () => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el Despacho #${id}? Esto puede desasignar mercancías.`)) {
      try {
        await apiClient.delete(`/api/inventario/despachos/${id}/`);
        navigate('/despachos');
      } catch (err) {
        setError('No se pudo eliminar el despacho.');
      }
    }
  };
  const handleInvitarColaborador = async (e) => {
    e.preventDefault();
    if (!usuarioSeleccionado) return;
    setMensajeInvitacion({ tipo: 'loading', texto: 'Procesando...' });

    try {
      const response = await apiClient.post(`/api/inventario/despachos/${id}/invitar/`, {
        usuario_invitado_id: usuarioSeleccionado.id
      });

      setMensajeInvitacion({ tipo: 'success', texto: response.data.mensaje });
      setUsuarioAInvitar('');
      setTimeout(() => {
        setModalInvitacionOpen(false);
        setMensajeInvitacion({ tipo: '', texto: '' });
      }, 2000);

    } catch (error) {
      const errorMsg = error.response?.data?.error || "Error al otorgar permiso.";
      setMensajeInvitacion({ tipo: 'error', texto: errorMsg });
    }
  };

  const getIniciales = (nombre) => nombre ? String(nombre).substring(0, 2).toUpperCase() : '??';

  // Helper para colores de estado
  const getStatusStyle = (status) => {
    switch (status) {
      case 'Entregado': return 'bg-green-100 text-green-800 border-green-200';
      case 'En Ruta': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'En Carga': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Programado': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleDescargarExcel = async (idDespacho) => {
    try {
      const response = await apiClient.get(`/api/inventario/despachos/${idDespacho}/excel/`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Hoja_de_Ruta_${getNombreRuta(idDespacho)}.xlsx`);
      document.body.appendChild(link);
      link.click();

      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error al descargar el Excel", err);
      alert("Hubo un problema al generar la hoja de ruta.");
    }
  };

  // --- RENDERIZADO ---

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
        <p>Cargando detalles del despacho...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 flex items-start gap-3 rounded-r-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button onClick={() => navigate('/despachos')} className="mt-3 text-sm font-medium text-red-800 hover:underline">
              Volver al listado
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!despacho) return <div className="p-8 text-center text-gray-500">No se encontró el despacho.</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      {isReadOnly && (
        <div className="bg-amber-100 text-amber-800 p-3 mb-4 rounded-lg border border-amber-200 font-bold text-center">
          Estás visualizando un despacho de otra sucursal. No tienes permisos para editarlo.
        </div>
      )}
      <div className="max-w-6xl mx-auto">

        {/* Header de Navegación */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/despachos" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 transition shadow-sm">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">Despacho #{id}</h1>
                <span className={`px-3 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(despacho.estado_despacho)}`}>
                  {despacho.estado_despacho}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">

            {/* BOTONES PRINCIPALES */}
            {puedeCompartir && (
              <button
                onClick={() => setModalInvitacionOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition font-medium text-sm shadow-sm"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Compartir</span>
              </button>
            )}

            {!isReadOnly && (
              <Link
                to={`/despachos/${id}/editar`}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition shadow-sm text-sm"
              >
                <Edit className="w-4 h-4" />
                <span className="hidden sm:inline">Editar</span>
              </Link>
            )}

            {/* MENÚ DESPLEGABLE*/}
            <Menu as="div" className="relative inline-block text-left">
              <MenuButton className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition shadow-sm text-sm">
                Acciones
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </MenuButton>

              <Transition
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <MenuItems className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black/5 focus:outline-none divide-y divide-gray-100">

                  {/* Exportaciones */}
                  <div className="p-1">
                    <MenuItem>
                      {({ focus }) => (
                        <button
                          onClick={() => navigate(`/despachos/${id}/imprimir-plantilla`)}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm ${focus ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                            }`}
                        >
                          <Printer className="w-4 h-4 text-gray-500" />
                          Imprimir Órdenes
                        </button>
                      )}
                    </MenuItem>
                    <MenuItem>
                      {({ focus }) => (
                        <button
                          onClick={() => handleDescargarExcel(despacho.id_despacho)}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm ${focus ? 'bg-green-50 text-green-700' : 'text-gray-700'
                            }`}
                        >
                          <Download className="w-4 h-4 text-green-600" /> {/* Cambié a icono genérico de descarga */}
                          Descargar Excel
                        </button>
                      )}
                    </MenuItem>
                  </div>

                  {/* Eliminar */}
                  {!isReadOnly && (
                    <div className="p-1">
                      <MenuItem>
                        {({ focus }) => (
                          <button
                            onClick={handleDelete}
                            className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium ${focus ? 'bg-red-50 text-red-700' : 'text-red-600'
                              }`}
                          >
                            <Trash2 className="w-4 h-4" />
                            Eliminar Despacho
                          </button>
                        )}
                      </MenuItem>
                    </div>
                  )}
                </MenuItems>
              </Transition>
            </Menu>

          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* COLUMNA IZQUIERDA: INFORMACIÓN PRINCIPAL */}
          <div className="lg:col-span-2 space-y-6">

            {/* Tarjeta de Ruta y Tiempos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                <Map className="w-4 h-4 text-indigo-600" />
                <h3 className="font-semibold text-gray-900">Información del Viaje</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Ruta Asignada</label>
                  <div className="flex items-center gap-2 text-gray-900 font-medium">
                    <MapPin className="w-4 h-4 text-indigo-500" />
                    {getNombreRuta(despacho.id_ruta)}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Fecha Programada</label>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {despacho.fecha_programada
                        ? new Date(despacho.fecha_programada).toLocaleDateString('es-CL')
                        : 'Sin definir'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Salida Real</label>
                    {despacho.fecha_salida_real ? (
                      <div className="flex items-center gap-2 text-blue-700 bg-blue-50 w-fit px-2 py-1 rounded">
                        <Clock className="w-4 h-4" />
                        {despacho.fecha_salida_real
                          ? new Date(despacho.fecha_salida_real).toLocaleString('es-CL', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                          : 'Sin definir'}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic text-sm flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Sin registrar
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjeta de Transporte */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                <Truck className="w-4 h-4 text-indigo-600" />
                <h3 className="font-semibold text-gray-900">Recursos de Transporte</h3>
              </div>
              <div className="p-6 flex flex-col sm:flex-row gap-6">
                <div className="flex-1 p-4 bg-gray-50 rounded-lg border border-gray-100 flex items-start gap-3">
                  <div className="p-2 bg-white rounded-full shadow-sm text-gray-600">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500">Vehículo</span>
                    <span className="block text-sm font-semibold text-gray-900">
                      {getInfoCamion(despacho.id_camion)}
                    </span>
                  </div>
                </div>

                <div className="flex-1 p-4 bg-gray-50 rounded-lg border border-gray-100 flex items-start gap-3">
                  <div className="p-2 bg-white rounded-full shadow-sm text-gray-600">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500">Conductor</span>
                    <span className="block text-sm font-semibold text-gray-900">
                      {getNombreConductor(despacho.id_conductor)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {despacho.colaboradores_activos && despacho.colaboradores_activos.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-blue-600" />
                    Acceso Compartido (Colaboradores)
                  </h3>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex -space-x-3 overflow-hidden">
                    {despacho.colaboradores_activos.map((colab) => (
                      <div
                        key={colab.id}
                        title={`${colab.nombre_completo} (Invitado por: ${colab.otorgado_por})`}
                        className="inline-flex items-center justify-center w-10 h-10 rounded-full border-2 border-white bg-blue-600 text-white text-xs font-bold shadow-sm cursor-help transition-transform hover:scale-110 hover:z-10"
                      >
                        {colab.nombre_completo.substring(0, 2).toUpperCase()}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-blue-700">
                    <span className="font-semibold">{despacho.colaboradores_activos.length} usuario(s)</span> de otra sucursal tienen permiso para editar este despacho.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA: MERCANCÍAS */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600" /> Carga Asignada
                </h3>
                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {mercancias.length}
                </span>
              </div>

              <div className="p-4 flex-1 overflow-y-auto max-h-[500px]">
                {mercancias.length > 0 ? (
                  <div className="space-y-3">
                    {mercancias.map(m => (
                      <div key={m.id_mercancia} className="group relative bg-white border border-gray-200 rounded-lg p-3 hover:border-indigo-300 hover:shadow-sm transition-all">

                        {/* ENCABEZADO DE LA TARJETA */}
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-indigo-600">Lote #{m.id_mercancia}</span>
                            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                              Factura: {m.factura || 'S/N'}
                            </span>
                          </div>

                          <Link to={`/mercancias/${m.id_mercancia}`} className="text-gray-400 hover:text-indigo-600 bg-gray-50 p-1 rounded-md transition-colors">
                            <ArrowLeft className="w-4 h-4 rotate-180" />
                          </Link>
                        </div>

                        <h4 className="text-sm font-bold text-gray-900 line-clamp-1 truncate">
                          {getNombreCliente(m.id_cliente)}
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="truncate">{getDireccionCliente(m.id_cliente)}</span>
                        </p>

                        <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded line-clamp-2 italic border border-gray-100">
                          "{m.descripcion_carga || 'Sin descripción'}"
                        </p>

                        {/* PIE DE LA TARJETA: Bultos */}
                        <div className="mt-2 flex items-center justify-between text-xs font-semibold text-gray-600 pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{m.cantidad_bultos} bultos</span>
                          </div>
                          <span>{m.kg} kg / {m.m3} m³</span>
                        </div>

                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                    <Package className="w-12 h-12 mb-2 opacity-20" />
                    <p className="text-sm font-medium">No hay mercancía asignada a este despacho.</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <Link
                  to="/mercancias"
                  className="block w-full py-2.5 text-center text-sm text-indigo-600 font-bold hover:bg-indigo-50 rounded-lg border border-dashed border-indigo-300 hover:border-indigo-400 transition"
                >
                  Asignar más carga
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      {modalInvitacionOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">

            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-600" />
                Colaboración Transversal
              </h3>
              <button
                onClick={() => {
                  setModalInvitacionOpen(false);
                  setMensajeInvitacion({ tipo: '', texto: '' });
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInvitarColaborador} className="p-5">
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                Otorga permisos de edición a un usuario de otra sucursal para que pueda gestionar este despacho y su carga asociada.
              </p>

              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                  Seleccionar Usuario a Invitar
                </label>

                <Listbox value={usuarioSeleccionado} onChange={setUsuarioSeleccionado}>
                  <div className="relative mt-1">
                    <ListboxButton className="relative w-full cursor-pointer rounded-lg bg-white py-2.5 pl-3 pr-10 text-left border border-gray-300 focus:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/50 sm:text-sm shadow-sm transition">
                      {usuarioSeleccionado ? (
                        <span className="flex items-center gap-3">
                          {/* Avatar Círculo */}
                          <div className="w-6 h-6 shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                            {getIniciales(usuarioSeleccionado.username)}
                          </div>
                          <span className="block truncate font-medium text-gray-700">
                            {usuarioSeleccionado.username}
                            {usuarioSeleccionado.first_name ? ` (${usuarioSeleccionado.first_name} ${usuarioSeleccionado.last_name})` : ''}
                          </span>
                        </span>
                      ) : (
                        <span className="block truncate text-gray-400">
                          {usuarios.length === 0 ? "No hay usuarios elegibles" : "Cargando usuarios..."}
                        </span>
                      )}

                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronsUpDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                      </span>
                    </ListboxButton>

                    <Transition
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                    >
                      <ListboxOptions className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                        {usuarios.map((usuario) => (
                          <ListboxOption
                            key={usuario.id}
                            className={({ focus }) =>
                              `relative cursor-pointer select-none py-2 pl-10 pr-4 transition-colors ${focus ? 'bg-blue-50 text-blue-900' : 'text-gray-700'
                              }`
                            }
                            value={usuario}
                          >
                            {({ selected }) => (
                              <>
                                <div className="flex items-center gap-3">
                                  <div className="w-6 h-6 shrink-0 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                                    {getIniciales(usuario.username)}
                                  </div>
                                  <span className={`block truncate ${selected ? 'font-bold' : 'font-normal'}`}>
                                    {usuario.username}
                                  </span>
                                </div>

                                {selected ? (
                                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                                    <Check className="h-4 w-4" aria-hidden="true" />
                                  </span>
                                ) : null}
                              </>
                            )}
                          </ListboxOption>
                        ))}
                      </ListboxOptions>
                    </Transition>
                  </div>
                </Listbox>
              </div>
              {mensajeInvitacion.texto && (
                <div className={`p-3 rounded-lg text-sm mb-4 ${mensajeInvitacion.tipo === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
                  mensajeInvitacion.tipo === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                    'bg-blue-50 text-blue-800'
                  }`}>
                  {mensajeInvitacion.texto}
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setModalInvitacionOpen(false)}
                  className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={mensajeInvitacion.tipo === 'loading'}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm"
                >
                  {mensajeInvitacion.tipo === 'loading' ? 'Enviando...' : 'Otorgar Acceso'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
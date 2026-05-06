import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import Select from 'react-select';
import {
    Save, ArrowLeft, User, MapPin, Package, Scale, Box, Truck, FileText, CheckSquare, AlertCircle
} from 'lucide-react';

export default function CotizacionEdit() {
    document.title = "Editar Cotización - GStorage";
    const { id } = useParams();
    const navigate = useNavigate();
    const { logoutUser, user } = useAuth();
    const { showLoader, hideLoader, showToast } = useUI();

    const [clientes, setClientes] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [loadingInicial, setLoadingInicial] = useState(true);
    const [isReadOnly, setIsReadOnly] = useState(false);

    const [formData, setFormData] = useState({
        rut_cliente: '',
        nombre_cliente: '',
        rut_proveedor: '',
        proveedor: '',
        contacto: '',
        destino: '',
        cantidad: 1,
        tipo_bultos: '',
        kg: '',
        m3: '',
        cotiza_proveedor: false,
        estado_cotizacion: '',
        monto: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoadingInicial(true);
            try {
                const [cotRes, clientesRes, provRes] = await Promise.all([
                    apiClient.get(`/api/inventario/cotizaciones/${id}/`),
                    apiClient.get('/api/inventario/clientes/'),
                    apiClient.get('/api/inventario/proveedores/')
                ]);

                const cot = cotRes.data;

                // REGLAS DE BLOQUEO
                const isCotizado = cot.estado_cotizacion === 'Cotizado';
                const isCreator = user?.id === cot.id_usuario_creacion;
                const esColaboradorInvitado = cot.colaboradores_activos?.some(
                    (colab) => String(colab.id) === String(user?.id)
                )

                const debeBloquearse = isCotizado || (!isCreator && !esColaboradorInvitado)

                if (debeBloquearse) {
                    setIsReadOnly(true);
                    showToast(
                        isCotizado
                            ? 'Esta cotización ya fue confirmada y no se puede editar.'
                            : 'No tienes permisos para editar esta cotización.',
                        'info'
                    );
                } else {
                    setIsReadOnly(false);
                }

                setFormData({
                    rut_cliente: cot.rut_cliente || '',
                    nombre_cliente: cot.nombre_cliente || '',
                    rut_proveedor: cot.rut_proveedor || '',
                    proveedor: cot.proveedor || '',
                    contacto: cot.contacto || '',
                    destino: cot.destino || '',
                    cantidad: cot.cantidad || 1,
                    tipo_bultos: cot.tipo_bultos || '',
                    kg: cot.kg || '',
                    m3: cot.m3 || '',
                    cotiza_proveedor: cot.cotiza_proveedor || false,
                    estado_cotizacion: cot.estado_cotizacion,
                    monto: cot.monto || ''
                });

                setClientes(clientesRes.data);
                setProveedores(provRes.data);
            } catch (err) {
                if (err.response && err.response.status === 401) {
                    showToast('Sesión expirada.', 'error');
                    logoutUser();
                } else {
                    showToast('Error al cargar la cotización.', 'error');
                    navigate('/cotizaciones');
                }
            } finally {
                setLoadingInicial(false);
            }
        };
        fetchData();
    }, [id, logoutUser, showToast, navigate, user?.id]);

    const handleChange = (e) => {
        if (isReadOnly) return;
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isReadOnly) return;

        showLoader();
        try {
            const payload = {
                ...formData,
                cantidad: parseInt(formData.cantidad) || 1,
                kg: formData.kg ? parseFloat(formData.kg) : null,
                m3: formData.m3 ? parseFloat(formData.m3) : null,
            };

            await apiClient.put(`/api/inventario/cotizaciones/${id}/`, payload);
            showToast('Cotización actualizada exitosamente', 'success');
            navigate('/cotizaciones');
        } catch (err) {
            showToast('Error al actualizar la cotización.', 'error');
        } finally {
            hideLoader();
        }
    };

    if (loadingInicial) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="w-10 h-10 border-4 border-red-800 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-4xl mx-auto">

                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                            {isReadOnly ? 'Ver Cotización' : 'Editar Cotización'} #{id}
                        </h1>
                    </div>
                    <Link to="/cotizaciones" className="hidden sm:flex items-center gap-2 text-gray-500 hover:text-red-800 transition font-medium">
                        <ArrowLeft className="w-5 h-5" /> Volver
                    </Link>
                </div>

                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">

                    {isReadOnly && (
                        <div className="bg-amber-50 p-4 border-b border-amber-200 flex items-center gap-3">
                            <p className="text-sm font-bold text-amber-800">
                                {formData.estado_cotizacion === 'Cotizado'
                                    ? 'Modo Lectura: Esta cotización ya ha sido confirmada y cerrada.'
                                    : 'Modo Lectura: No tienes permiso de edición. Solicita acceso al creador de la cotización.'}
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
                        {/* SECCIÓN 1: CLIENTE */}
                        <div>
                            <h3 className="text-sm font-bold text-red-800 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                <User className="w-5 h-5" /> Datos del Cliente
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {!isReadOnly && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Buscar Cliente Existente (Autocompletar)</label>
                                        <Select
                                            isClearable
                                            options={clientes.map(c => ({
                                                value: c.id_cliente,
                                                label: `${c.nombre_cliente} (${c.rut_cliente || 'Sin RUT'})`,
                                                rut: c.rut_cliente,
                                                nombre: c.nombre_cliente
                                            }))}
                                            onChange={(opt) => {
                                                if (opt) setFormData(prev => ({ ...prev, rut_cliente: opt.rut || '', nombre_cliente: opt.nombre }));
                                            }}
                                            className="text-sm"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Razón Social / Nombre *</label>
                                    <input type="text" name="nombre_cliente" value={formData.nombre_cliente} onChange={handleChange} required disabled={isReadOnly}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-red-800" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">RUT Cliente</label>
                                    <input type="text" name="rut_cliente" value={formData.rut_cliente} onChange={handleChange} disabled={isReadOnly}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-red-800" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Contacto Directo</label>
                                    <input type="text" name="contacto" value={formData.contacto} onChange={handleChange} disabled={isReadOnly}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-red-800" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Dirección / Destino</label>
                                    <input type="text" name="destino" value={formData.destino} onChange={handleChange} disabled={isReadOnly}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-red-800" />
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN 2: PROVEEDOR */}
                        <div>
                            <h3 className="text-sm font-bold text-red-800 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                <Truck className="w-5 h-5" /> Datos del Proveedor
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {!isReadOnly && (
                                    <div className="md:col-span-2">
                                        <Select
                                            placeholder="Autocompletar proveedor..." isClearable
                                            options={proveedores.map(p => ({
                                                value: p.rut, label: `${p.nombre_proveedor} (${p.rut})`, rut: p.rut, nombre: p.nombre_proveedor
                                            }))}
                                            onChange={(opt) => {
                                                if (opt) setFormData(prev => ({ ...prev, rut_proveedor: opt.rut || '', proveedor: opt.nombre }));
                                            }}
                                            className="text-sm"
                                        />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre Proveedor</label>
                                    <input type="text" name="proveedor" value={formData.proveedor} onChange={handleChange} disabled={isReadOnly}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-red-800" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">RUT Proveedor</label>
                                    <input type="text" name="rut_proveedor" value={formData.rut_proveedor} onChange={handleChange} disabled={isReadOnly}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-red-800" />
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN 3: ESPECIFICACIONES DE CARGA */}
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
                                <Package className="w-5 h-5" /> Especificaciones de la Carga
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Bultos</label>
                                    <input type="number" name="cantidad" value={formData.cantidad} onChange={handleChange} min="1" disabled={isReadOnly} required
                                        className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-60 disabled:bg-gray-100 outline-none focus:ring-2 focus:ring-red-800" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo</label>
                                    <input type="text" name="tipo_bultos" value={formData.tipo_bultos} onChange={handleChange} disabled={isReadOnly}
                                        className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-60 disabled:bg-gray-100 outline-none focus:ring-2 focus:ring-red-800" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Peso (Kg)</label>
                                    <div className="relative">
                                        <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input type="number" step="0" name="kg" value={formData.kg} onChange={handleChange} disabled={isReadOnly}
                                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-60 disabled:bg-gray-100 outline-none focus:ring-2 focus:ring-red-800" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Volumen (m³)</label>
                                    <div className="relative">
                                        <Box className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input type="number" step="0.00" name="m3" value={formData.m3} onChange={handleChange} disabled={isReadOnly}
                                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-60 disabled:bg-gray-100 outline-none focus:ring-2 focus:ring-red-800" />
                                    </div>
                                </div>
                                <div className="sm:col-span-2 lg:col-span-4">
                                    <label className="block text-sm font-bold text-emerald-700 mb-1">
                                        Monto Total a Cotizar
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">$</span>
                                        <input
                                            type="number"
                                            name="monto"
                                            value={formData.monto}
                                            onChange={handleChange}
                                            disabled={isReadOnly}
                                            placeholder="Ej: 150000"
                                            className="w-full pl-8 pr-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-900 font-black rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">
                                        Este es el valor final que se le informará al {formData.cotiza_proveedor ? 'Proveedor' : 'Cliente'}.
                                    </p>
                                </div>

                                <div className="lg:col-span-4 mt-2">
                                    <label className={`flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg transition ${isReadOnly ? 'opacity-70' : 'cursor-pointer hover:bg-gray-50'}`}>
                                        <input type="checkbox" name="cotiza_proveedor" checked={formData.cotiza_proveedor} onChange={handleChange} disabled={isReadOnly}
                                            className="w-5 h-5 cursor-pointer accent-red-800 rounded border-gray-300 disabled:cursor-not-allowed" />
                                        <div>
                                            <span className="text-sm font-bold text-gray-900 flex items-center gap-1"><CheckSquare className="w-4 h-4 text-red-800" /> ¿El cobro lo paga el proveedor?</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* ACCIONES */}
                        <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
                            <Link to="/cotizaciones" className="px-6 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-100 transition">
                                {isReadOnly ? 'Volver' : 'Cancelar'}
                            </Link>
                            {!isReadOnly && (
                                <button type="submit" className="flex items-center gap-2 px-8 py-2.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-black focus:ring-4 focus:ring-slate-300 transition shadow-lg">
                                    <Save className="w-5 h-5" /> Guardar Cambios
                                </button>
                            )}
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}
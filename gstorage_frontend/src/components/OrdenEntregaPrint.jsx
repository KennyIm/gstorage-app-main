import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import logomedalla from '../assets/logomedalla.png';
import html2pdf from 'html2pdf.js';
import { Printer, ArrowLeft, Truck, CreditCard, Calendar, User, MapPin } from 'lucide-react';

export default function OrdenEntregaPlantilla() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    // <-- REFERENCIA PARA CAPTURAR EL PDF -->
    const componenteRef = useRef(); 

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [despacho, setDespacho] = useState(null);
    const [clientes, setClientes] = useState([]);
    const [cargasAgrupadas, setCargasAgrupadas] = useState({});

    const TASA_IVA = 0.19;

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                const [despachoRes, mercanciasRes, clientesRes] = await Promise.all([
                    apiClient.get(`/api/inventario/despachos/${id}/`),
                    apiClient.get('/api/inventario/mercancias/'),
                    apiClient.get('/api/inventario/clientes/')
                ]);

                setDespacho(despachoRes.data);
                setClientes(clientesRes.data);

                const mercanciasDelDespacho = mercanciasRes.data.filter(m => String(m.id_despacho) === String(id));

                const grupos = mercanciasDelDespacho.reduce((acumulador, item) => {
                    const nombreCliente = item.cliente_nombre || 'Cliente Desconocido';
                    if (!acumulador[nombreCliente]) {
                        acumulador[nombreCliente] = [];
                    }
                    acumulador[nombreCliente].push(item);
                    return acumulador;
                }, {});

                setCargasAgrupadas(grupos);
                setLoading(false);
            } catch (err) {
                setError("Hubo un error al cargar la información del despacho.");
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    // --- LA NUEVA FUNCIÓN QUE GENERA EL PDF ---
    const generarPDF = () => {
        const elemento = componenteRef.current;
        const opciones = {
            margin:       0, // Margen 0 para que ocupe toda la hoja, el padding lo damos en el HTML
            filename:     `Orden_Entrega_Ruta_${id}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 1.5, useCORS: true, letterRendering: true }, // Escala reducida para evitar desbordes y mejorar renderizado de texto
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
            // Evitamos pagebreaks automáticos de la librería si nosotros ya lo controlamos
            pagebreak:    { mode: 'avoid-all', before: '.saltar-pagina' }
        };

        html2pdf().set(opciones).from(elemento).save();
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-200 text-slate-600 font-medium">Preparando documento...</div>;
    if (error) return <div className="min-h-screen flex items-center justify-center bg-slate-200 text-red-600 p-8 text-center">{error}</div>;

    const numClientes = Object.keys(cargasAgrupadas).length;

    return (
        <div className="bg-slate-200 min-h-screen p-4 sm:p-8 text-slate-900 font-sans">
            
            {/* BARRA DE HERRAMIENTAS */}
            <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 font-medium transition">
                    <ArrowLeft className="w-5 h-5" /> Volver al Despacho
                </button>
                <button onClick={generarPDF} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl shadow-md hover:bg-slate-800 font-bold transition">
                    <Printer className="w-5 h-5" /> Descargar PDF
                </button>
            </div>

            {numClientes === 0 && (
                <div className="max-w-4xl mx-auto bg-white p-8 text-center rounded-2xl shadow text-slate-500 font-medium">
                    No hay mercancías asignadas a este despacho.
                </div>
            )}
            
            <div ref={componenteRef}>
                {/* --- PÁGINAS A4 --- */}
                {Object.keys(cargasAgrupadas).map((clienteNombre, index) => {
                    const cargas = cargasAgrupadas[clienteNombre];
                    const cargaBase = cargas[0];

                    const clienteObj = clientes.find(c => String(c.id_cliente) === String(cargaBase.id_cliente)) || {};

                    const totalNetoValue = cargas.reduce((sum, c) => sum + (parseFloat(c.precio_total) || 0), 0);
                    const ivaValue = totalNetoValue * TASA_IVA;
                    const totalBrutoValue = totalNetoValue + ivaValue;

                    const destino = cargaBase.destino_nombre || 'No especificado';

                    return (
                        <div
                            key={clienteNombre}
                            // 1. Ajuste clave: w-[210mm] h-[297mm] exactos.
                            // Añadimos 'saltar-pagina' a todos menos al primero si decides usar 'before' en pagebreak.
                            // Quitamos el shadow para evitar que la sombra "empuje" el contenido a otra página al renderizar.
                            className={`w-[210mm] h-[297mm] flex flex-col mx-auto bg-white p-10 mb-8 box-border overflow-hidden ${index > 0 ? 'saltar-pagina' : ''}`}
                            style={{ border: '1px solid #e2e8f0' }} // Un borde sutil para ver la hoja en pantalla, no afecta al PDF
                        >

                            {/* --- ENCABEZADO --- */}
                            <div className="flex justify-between items-start w-full border-b-2 border-slate-100 pb-8 mb-8">

                                {/* Damos un ancho fijo (ej: 65%) a la columna izquierda para asegurar espacio a la derecha */}
                                <div className="flex flex-col gap-6 w-[65%]">
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 h-24 flex items-center justify-center shrink-0">
                                            <img src={logomedalla} alt="Logo GStorage" className="max-h-full max-w-full object-contain" />
                                        </div>
                                        <div>
                                            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-tight">SERVICIO DE LOGISTICAS Y TRANSPORTES MEDALLA'S SPA</h2>
                                            <p className="mt-1 text-[9px] sm:text-[10px] text-slate-500 font-medium leading-tight m-0 p-0 text-left">
                                                RUT: 77.797.573-0 <br />
                                                VIA UNO KILOMETRO 8 MANZANA 2J BAJO MOLLE, IQUIQUE. FONO 5725233535 CEL 988086461<br />
                                                AGUAS CALIENTES 13572 / AV. H. DE LA CONCEPCION. CEL 944934271<br />
                                                AV. LO ESPEJO 01565 CALLE 10 BODEGA 1011-1013 MERSAN STGO. CEL 944934272-944934273
                                            </p>
                                        </div>
                                    </div>
                                    <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Orden de Entrega</h1>
                                </div>

                                {/* DETALLE LOGÍSTICO ACTUALIZADO */}
                                {/* 2. Damos el ancho restante (35%) para evitar recortes */}
                                <div className="flex flex-col items-end text-right w-[35%]">
                                    <div className="p-2 w-full">
                                        {/* Ruta Fija */}
                                        <div className="flex items-center justify-end gap-2 text-sm font-semibold text-slate-700 mb-1.5">
                                            <span className="text-slate-400 font-medium">Ruta N°</span>
                                            <span className="text-slate-900">{id}</span>
                                        </div>

                                        {/* N° Editable */}
                                        <div className="flex items-center justify-end gap-2 text-sm font-semibold text-slate-700 mb-1">
                                            <span className="text-slate-400 font-medium">N°</span>
                                            <input
                                                type="text"
                                                defaultValue=""
                                                placeholder="Ej: 1001"
                                                // Reducimos un poco el ancho del input si es necesario, o lo mantenemos en w-16
                                                className="w-20 bg-white border border-slate-300 rounded text-center focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>

                                        {/* Conductor Fijo */}
                                        <div className="flex items-center justify-end gap-2 text-sm font-semibold text-slate-900 pt-1 border-t border-slate-200 mt-2">
                                            <User className="w-4 h-4 text-slate-400 shrink-0" />
                                            {/* Aumentamos el max-w para que entre todo el nombre */}
                                            <span className="truncate max-w-[180px]" title="Conductor Asignado">
                                                {despacho?.nombre_conductor || 'No asignado'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* --- 2. TARJETA DEL CLIENTE ACTUALIZADA --- */}
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-10 flex justify-between items-start shrink-0">
                                <div className="w-2/3 pr-4">
                                    <h2 className="text-xl font-black text-slate-900 mb-2">{clienteNombre}</h2>
                                    <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-sm font-medium text-slate-600">
                                        <p className="flex items-start gap-1.5 col-span-2 mb-1">
                                            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                            <span className='text-slate-900 font-black'>
                                                {clienteObj.direccion ? `${clienteObj.direccion}, ` : ''}{destino}
                                            </span>
                                        </p>
                                        <p>RUT: <span className="text-slate-900">{clienteObj.rut_cliente || 'No registrado'}</span></p>
                                        <p>Tel: <span className="text-slate-900">{clienteObj.telefono_contacto || clienteObj.celular || 'No registrado'}</span></p>
                                        <p className="col-span-2">Dirección: <span className="text-slate-900">{clienteObj.direccion || 'No registrado'}</span></p>
                                    </div>
                                </div>
                                <div className="w-1/3 text-right">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fecha</p>
                                    <p className="text-lg font-bold text-slate-900 flex items-center justify-end gap-2">
                                        <Calendar className="w-5 h-5 text-indigo-500" />
                                        {despacho?.fecha_programada || '___/___/____'}
                                    </p>
                                </div>
                            </div>

                            {/* --- 3. TABLA DE MERCANCÍAS --- */}
                            <div className="flex-grow overflow-hidden">
                                <table className="w-full text-sm mb-4">
                                    <thead>
                                        <tr className="border-y-2 border-slate-300 bg-slate-50/50">
                                            <th className="py-2 px-2 text-left font-bold text-slate-700 uppercase tracking-wider text-[11px]">Código I</th>
                                            <th className="py-2 px-2 text-center font-bold text-slate-700 uppercase tracking-wider text-[11px]">Bultos</th>
                                            <th className="py-2 px-2 text-left font-bold text-slate-700 uppercase tracking-wider text-[11px]">Proveedor</th>
                                            <th className="py-2 px-2 text-center font-bold text-slate-700 uppercase tracking-wider text-[11px]">Medidas</th>
                                            <th className="py-2 px-2 text-center font-bold text-slate-700 uppercase tracking-wider text-[11px]">Factura</th>
                                            <th className="py-2 px-2 text-right font-bold text-slate-700 uppercase tracking-wider text-[11px]">Valor Neto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {cargas.map((carga) => (
                                            <tr key={carga.id_mercancia} className="align-top">
                                                <td className="py-3 px-2 text-left font-bold text-slate-900">#{carga.id_mercancia}</td>
                                                <td className="py-3 px-2 text-center font-semibold text-slate-800">{carga.cantidad_bultos}</td>
                                                <td className="py-3 px-2 text-left">
                                                    <p className="font-bold text-slate-900">{carga.proveedor_nombre || '-'}</p>
                                                    {carga.id_proveedor && <p className="text-xs font-medium text-slate-500 mt-0.5">RUT: {carga.id_proveedor}</p>}
                                                </td>
                                                <td className="py-3 px-2 text-center">
                                                    <p className="font-semibold text-slate-800">{parseFloat(carga.kg || 0).toFixed(2)} Kg</p>
                                                    <p className="text-xs font-medium text-slate-500 mt-0.5">{parseFloat(carga.m3 || 0).toFixed(2)} m³</p>
                                                </td>
                                                <td className="py-3 px-2 text-center font-medium text-slate-700">{carga.factura || '-'}</td>
                                                <td className="py-3 px-2 text-right font-bold text-slate-900">${parseFloat(carga.precio_total || 0).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* --- 4. TOTALES Y PAGOS --- */}
                            <div className="flex justify-end items-start mt-2 shrink-0">
                                <div className="w-72 p-2 ">
                                    <div className="flex justify-between items-center mb-1 text-sm font-semibold text-slate-600">
                                        <span>Subtotal Neto</span>
                                        <span className="text-slate-900">${totalNetoValue.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2 text-sm font-semibold text-slate-600">
                                        <span>IVA (19%)</span>
                                        <span className="text-slate-900">${ivaValue.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-1 border-t-2 border-slate-900 font-black text-xl text-slate-900">
                                        <span>TOTAL</span>
                                        <span>${totalBrutoValue.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* --- 5. FIRMAS AL FINAL DE LA HOJA --- */}
                            <div className="flex justify-between items-end mt-auto pt-10 pb-4 shrink-0">
                                <div className="text-center w-72">
                                    <div className="border-t-2 border-slate-400 pt-1">
                                        <p className="font-bold text-sm text-slate-900 uppercase tracking-tight">Recibe Conforme</p>
                                        <p className="text-xs font-medium text-slate-500 mt-1">Nombre, RUT y Firma</p>
                                    </div>
                                </div>

                                <div className="text-center w-48">
                                    <div className="border-t-2 border-slate-400 pt-1 flex flex-col items-center">
                                        <p className="font-bold text-sm text-slate-900 uppercase tracking-tight mb-5">Fecha de Recepción</p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    );
                })}
            </div>
        </div>
    );
}
import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import * as XLSX from 'xlsx-js-style';
import { GripVertical, FileSpreadsheet, User, Package, Building2, UserStar, Hexagon } from 'lucide-react';
import apiClient from '../services/api';
import Select from 'react-select';

export default function PlanificadorRutas() {
  document.title = "Planificador de Rutas";
  const [despachos, setDespachos] = useState([]);
  const [todasMercancias, setTodasMercancias] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [destinos, setDestinos] = useState([]);
  const [ramplas, setRamplas] = useState([]);
  const [camiones, setCamiones] = useState([]);
  const [rutas, setRutas] = useState([]);
  const [despachoSeleccionado, setDespachoSeleccionado] = useState('');
  const [listaRuta, setListaRuta] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          despachosRes,
          mercanciasRes,
          clientesRes,
          proveedoresRes,
          destinosRes,
          ramplasRes,
          camionesRes,
          rutasRes
        ] = await Promise.all([
          apiClient.get('/api/inventario/despachos/'),
          apiClient.get('/api/inventario/mercancias/'),
          apiClient.get('/api/inventario/clientes/'),
          apiClient.get('/api/inventario/proveedores/'),
          apiClient.get('/api/inventario/destinos/'),
          apiClient.get('/api/inventario/ramplas/'),
          apiClient.get('/api/inventario/camiones/'),
          apiClient.get('/api/inventario/rutas/')
        ]);

        setDespachos(despachosRes.data);
        setTodasMercancias(mercanciasRes.data);
        setClientes(clientesRes.data);
        setProveedores(proveedoresRes.data);
        setDestinos(destinosRes.data);
        setRamplas(ramplasRes.data);
        setCamiones(camionesRes.data);
        setRutas(rutasRes.data);
        setLoading(false);
      } catch (error) {
        console.error("Error cargando la base de datos:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getNombreCliente = (id) => {
    const cliente = clientes.find(c => String(c.id_cliente) === String(id));
    return cliente ? cliente.nombre_cliente : 'Cliente Desconocido';
  };

  const getNombreProveedor = (id) => {
    const proveedor = proveedores.find(p => String(p.rut) === String(id));
    return proveedor ? proveedor.nombre_proveedor : 'N/R';
  };


  const getNombreDestino = (id) => {
    const destino = destinos.find(d => String(d.id_destino) === String(id));
    return destino ? destino.nombre_ciudad : 'No especificado';
  };

  const getPatenteRampla = (id) => {
    const rampla = ramplas.find(r => String(r.id_rampla) === String(id));
    return rampla ? rampla.patente : 'S/R';
  };

  const getPatenteCamion = (id_camion) => {
    if (!id_camion) return 'Sin Camión';
    const camionEncontrado = camiones.find(c => String(c.id_camion) === String(id_camion));
    return camionEncontrado ? camionEncontrado.patente : 'Camión Desconocido';
  };

  const getCodigoRuta = (rutaId) => {
    if (!rutaId) return 'Sin Ruta asignada';
    const rutaEncontrada = rutas.find(r => String(r.id) === String(rutaId) || String(r.id_ruta) === String(rutaId));

    if (rutaEncontrada) {
      return rutaEncontrada.codigo_ruta || rutaEncontrada.codigo || `Encontrada (Sin código)`;
    }

    return `Ruta N° ${rutaId}`;
  };
  const manejarSeleccionDespacho = (e) => {
    const id = (e && e.target) ? e.target.value : e;

    setDespachoSeleccionado(id);

    if (!id) {
      setListaRuta([]);
      return;
    }
    const mercanciasDelCamion = todasMercancias.filter(
      m => String(m.id_despacho) === String(id)
    );
    setListaRuta(mercanciasDelCamion);
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(listaRuta);
    const [itemReordenado] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, itemReordenado);
    setListaRuta(items);
  };
  const exportarAExcel = () => {
    if (listaRuta.length === 0) return;

    const despacho = despachos.find(d => String(d.id_despacho) === String(despachoSeleccionado));

    const totalKilos = listaRuta.reduce((acc, item) => acc + (Number(item.kg) || 0), 0);
    const totalBultos = listaRuta.reduce((acc, item) => acc + (Number(item.cantidad_bultos) || 0), 0);

    const datosExcel = [
      [
        "",
        `${despacho?.nombre_conductor || 'N/A'}`,
        `${getCodigoRuta(despacho?.id_ruta).split('-')[0].trim()}`,
        `${(despacho?.id_camion).replace(/Camión/ig, '').split('(')[0].trim()}`,
        `${getPatenteRampla(despacho?.id_rampla)}`,
        `${despacho?.fecha_salida_real ? new Date(despacho.fecha_salida_real).toLocaleDateString() : 'N/A'}`,
        "", ""
      ],
      ["N°", "Cliente", "Proveedor", "Kilos", "Destino", "Factura", "Bultos", "Cód. Interno"]
    ];

    listaRuta.forEach((item, index) => {
      datosExcel.push([
        index + 1,
        getNombreCliente(item.id_cliente),
        getNombreProveedor(item.id_proveedor),
        Number(item.kg) || 0,
        getNombreDestino(item.id_destino),
        item.factura || "S/F",
        item.cantidad_bultos + " " + item.tipo || 0,
        item.codigo_interno || "N/A"
      ]);
    });

    datosExcel.push([
      "", "", "TOTAL KILOS", totalKilos,
    ]);

    const hoja = XLSX.utils.aoa_to_sheet(datosExcel);
    const formatoKilos = '#,##0';
    for (let i = 2; i < datosExcel.length; i++) {
      const referenciaCelda = XLSX.utils.encode_cell({ r: i, c: 3 });
      if (hoja[referenciaCelda]) {
        hoja[referenciaCelda].z = formatoKilos;
      }
    }
    hoja['!merges'] = [
      { s: { r: 0, c: 5 }, e: { r: 0, c: 7 } }
    ];

    hoja['!cols'] = [
      { wch: 6 }, { wch: 35 }, { wch: 25 }, { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 15 }
    ];

    hoja['!pageSetup'] = {
      scale: 70,
      orientation: 'landscape',
      paperSize: 9
    };

    hoja['!margins'] = {
      left: 0.13,
      right: 0.13,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3
    };

    //COLORES SE PUEDEN AGREGAR
    const coloresDestino = {
      "ANTOFAGASTA": "FF0000",
      "IQUIQUE": "000000",
      "CALAMA": "0000FF",
      "SANTIAGO": "008000",
      "TOCOPILLA": "0120FF"
    };
    Object.keys(hoja).forEach(referenciaCelda => {
      if (referenciaCelda.startsWith('!')) return;
      if (!hoja[referenciaCelda].s) hoja[referenciaCelda].s = {};

      const numeroFila = parseInt(referenciaCelda.replace(/\D/g, ''));
      const letraColumna = referenciaCelda.replace(/\d/g, '');

      hoja[referenciaCelda].s.alignment = { horizontal: "center", vertical: "center", wrapText: true };
      hoja[referenciaCelda].s.font = { sz: 10, name: "Calibri" };
      hoja[referenciaCelda].s.border = {
        top: { style: "thin" }, bottom: { style: "thin" },
        left: { style: "thin" }, right: { style: "thin" }
      };
      if (numeroFila >= 3) {
        const refDestino = `E${numeroFila}`;
        const nombreDestino = hoja[refDestino]?.v ? String(hoja[refDestino].v).toUpperCase() : "";

        if (coloresDestino[nombreDestino]) {
          hoja[referenciaCelda].s.font.color = { rgb: coloresDestino[nombreDestino] };
        }
      }

      if (numeroFila === 2) {
        hoja[referenciaCelda].s.font.bold = true;
        hoja[referenciaCelda].s.fill = { fgColor: { rgb: "F2F2F2" } };
      }
    });

    const libro = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(libro, hoja, "Ruta");
    XLSX.writeFile(libro, `Ruta_Despacho_${getCodigoRuta(despachoSeleccionado)}.xlsx`);
  };

  if (loading) return <div className="p-10 text-center">Cargando catálogos del sistema...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Planificador de Rutas</h1>
        </div>
        <div className="min-w-[300px]">
          <Select
            inputId="id_despacho"
            placeholder="Seleccionar Despacho..."
            noOptionsMessage={() => "No se encontró el despacho"}
            isClearable
            options={despachos.map(d => ({
              value: d.id_despacho,
              label: `Despacho N° ${d.id_despacho} | Ruta N° ${getCodigoRuta(d.id_despacho)}`
            }))}
            value={despachoSeleccionado ? {
              value: despachoSeleccionado,
              label: `Despacho N° ${despachoSeleccionado} | Ruta N° ${getCodigoRuta(despachoSeleccionado)}`
            } : null}
            onChange={(opcion) => manejarSeleccionDespacho(opcion ? opcion.value : "")}
            classNamePrefix="react-select"
          />
        </div>
      </div>

      {listaRuta.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
            <div className="col-span-1 text-center">Mover</div>
            <div className="col-span-1">N°</div>
            <div className="col-span-4">Cliente / Proveedor</div>
            <div className="col-span-6">Código Ruta / Carga</div>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="lista-rutas">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="min-h-[200px]">
                  {listaRuta.map((item, index) => (
                    <Draggable key={String(item.id_mercancia || index)} draggableId={String(item.id_mercancia || index)} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`grid grid-cols-12 gap-4 p-4 items-center border-b border-slate-100 bg-white transition-all ${snapshot.isDragging ? 'shadow-xl scale-[1.02] ring-2 ring-indigo-500 z-50 rounded-lg' : 'hover:bg-slate-50'
                            }`}
                        >
                          <div className="col-span-1 flex justify-center text-slate-400 cursor-grab" {...provided.dragHandleProps}>
                            <GripVertical size={20} />
                          </div>

                          <div className="col-span-1 font-black text-slate-400">{index + 1}</div>

                          <div className="col-span-4 flex flex-col gap-1">
                            <span className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
                              <UserStar size={14} className="text-indigo-500" />
                              {getNombreCliente(item.id_cliente)}
                            </span>
                            <span className="text-xs text-slate-500 flex items-center gap-2">
                              <User size={12} className="text-red-400" />
                              {getNombreProveedor(item.id_proveedor)}
                            </span>
                          </div>
                          <div className="col-span-6 text-sm text-slate-600 flex flex-col justify-center">
                            <span className="flex items-center gap-2 font-medium">
                              <Hexagon size={14} className="text-red-500" />
                              <span className="text-slate-900">{item.codigo_interno}</span>
                            </span>
                            <span className="flex items-center gap-2 font-medium">
                              <Package size={14} className="text-amber-500" />
                              {item.cantidad_bultos} Bultos ({item.kg} kg)
                            </span>
                            <span className="text-xs text-slate-400 ml-5">{item.descripcion_carga}</span>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button
              onClick={exportarAExcel}
              className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-emerald-700 flex items-center gap-2 transition"
            >
              <FileSpreadsheet size={18} /> Exportar Excel
            </button>
          </div>
        </div>
      ) : (
        despachoSeleccionado && (
          <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
            No hay mercancías asignadas a este despacho.
          </div>
        )
      )}
    </div>
  );
}
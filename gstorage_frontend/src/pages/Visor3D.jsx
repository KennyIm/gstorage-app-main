import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, TransformControls } from '@react-three/drei';
import apiClient from '../services/api';
import EstanteriaModelo3D from '../components/EstanteriaModelo3D';
import ZonaSueloModelo3D from '../components/ZonaSueloModelo3D';
import AreaRestringida3D from '../components/AreaRestringida3D';
import AlmacenEstructura3D from '../components/AlmacenEstructura3D';
import QuickCreateModal from '../components/QuickCreateModal';
import MercanciaDock from '../components/MercanciaDock'; // Si lo usas
import { 
  Box, Package, XCircle, CheckCircle, PlusSquare, Layers, Ban, Trash2, 
  MousePointer2, RotateCw, Move, Save, Settings, AlertTriangle, Calendar, Weight,
  Truck 
} from 'lucide-react';

export default function Visor3D() {
  const [almacenData, setAlmacenData] = useState({ 
    dimensiones: { ancho: 20, largo: 20, alto: 10 },
    estanterias: [], zonas_suelo: [], areas_restringidas: [] 
  });
  const [loading, setLoading] = useState(true);
  
  // Estados de Interacción
  const [selected, setSelected] = useState(null);
  const [assignMode, setAssignMode] = useState(false);
  const [unassignedMerch, setUnassignedMerch] = useState([]);
  const [transformMode, setTransformMode] = useState('translate'); 
  
  // Estados del Editor
  const [editMode, setEditMode] = useState(false);
  const [tool, setTool] = useState(null);
  const [previewPos, setPreviewPos] = useState(null); 
  const [isDragging, setIsDragging] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  
  // Estados para Pick & Place (Dock)
  const [dockItems, setDockItems] = useState([]);
  const [holdingItem, setHoldingItem] = useState(null);

  const [showDispatchAssign, setShowDispatchAssign] = useState(false);
  const [activeDespachos, setActiveDespachos] = useState([]);

  const selectedObjectRef = useRef(); 

  const loadData = () => {
    apiClient.get('/api/visualizacion/almacen-data/')
      .then(res => { setAlmacenData(res.data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (showDispatchAssign) {
      apiClient.get('/api/inventario/despachos/')
        .then(res => {
          // Filtramos solo los que están activos para recibir carga
          const activos = res.data.filter(d => 
            d.estado_despacho === 'Programado' || d.estado_despacho === 'En Carga'
          );
          setActiveDespachos(activos);
        })
        .catch(console.error);
    }
  }, [showDispatchAssign]);

  // Cargar mercancía para Dock y Asignación
  useEffect(() => {
    const loadMerchandise = async () => {
        try {
            const res = await apiClient.get('/api/inventario/mercancias/?estado_in=En Bodega,Asignado');
            const pendientes = res.data.filter(m => !m.id_ubicacion_actual);
            
            // Actualizamos ambas listas (para el Dock y para el modo Asignar antiguo)
            setUnassignedMerch(pendientes);
            setDockItems(pendientes);
        } catch (err) { console.error(err); }
    };
    
    if (assignMode || (editMode === false)) { // Cargar si estamos asignando o simplemente viendo
        loadMerchandise();
    }
  }, [assignMode, editMode, almacenData]); // Recargar si cambian datos del almacén

  // --- VALIDACIONES ---
  const validatePlacement = (x, z, width, depth, ignoreId = null) => {
      const dims = almacenData.dimensiones;

      // 1. VALIDAR LÍMITES DEL ALMACÉN "Muro Invisible"
      if (x < 0 || z < 0) return "Fuera del límite (Inicio)";
      if (x + width > dims.ancho) return "Se sale del ancho del almacén";
      if (z + depth > dims.largo) return "Se sale del largo del almacén";

      // 2. VALIDAR COLISIÓN CON ÁREAS RESTRINGIDAS (Oficinas/Baños)
      for (const area of almacenData.areas_restringidas) {
          if (area.id === ignoreId) continue; 
          const areaMinX = area.x;
          const areaMaxX = area.x + area.width;
          const areaMinZ = area.z;
          const areaMaxZ = area.z + area.depth;

          const newMaxX = x + width;
          const newMaxZ = z + depth;

          const chocaEnX = x < areaMaxX && newMaxX > areaMinX;
          const chocaEnZ = z < areaMaxZ && newMaxZ > areaMinZ;

          if (chocaEnX && chocaEnZ) {
              return `Colisión con área restringida: ${area.nombre}`;
          }
      }
      return null;
  };

  const handleAssignDespacho = async (despachoId) => {
      if (!selected?.mercancia) return;
      
      try {
          await apiClient.patch(`/api/inventario/mercancias/${selected.mercancia.id}/`, {
              id_despacho: despachoId,
              estado: 'Asignado' // Cambiamos estado automáticamente
          });
          
          alert("Despacho asignado correctamente.");
          setShowDispatchAssign(false);
          setSelected(null);
          loadData(); // Recargar visualización (cambiará de color a amarillo)
      } catch (err) {
          alert("Error al asignar despacho.");
      }
  };

  // --- MANEJO DE MOVIMIENTO (Lógica Centro <-> Esquina) ---
  const handleTransformEnd = async () => {
    if (!selected || !selectedObjectRef.current) return;
    
    const object = selectedObjectRef.current;
    
    // 1. Posición del CENTRO visual (donde está el gizmo)
    const centerNewX = object.position.x;
    const centerNewZ = object.position.z;
    const newRotRad = object.rotation.y;
    const newRotDeg = newRotRad * (180 / Math.PI);

    // 2. Calcular dimensiones para obtener la ESQUINA
    let width = 0;
    let depth = 0;

    if (selected.tipo === 'AREA') {
        width = selected.width;
        depth = selected.depth;
    } else if (selected.tipo === 'RACK') {
        const anchoHueco = selected.ancho_hueco || 1;
        const profHueco = selected.profundo_hueco || 1;
        width = (selected.num_modulos_ancho || 1) * anchoHueco;
        depth = (selected.num_profundidad || 1) * profHueco;
    } else if (selected.tipo === 'ZONE') {
        width = selected.width || 2;
        depth = selected.depth || 2;
    }

    // 3. Calcular Esquina (Django guarda esto)
    const cornerX = centerNewX - (width / 2);
    const cornerZ = centerNewZ - (depth / 2);
    
    const error = validatePlacement(cornerX, cornerZ, width, depth, selected.tipo === 'AREA' ? selected.id : null);
    if (error) {
        alert(`⛔ Movimiento inválido: ${error}`);
        loadData(); 
        setIsDragging(false);
        return; 
    }
    // 4. Actualización Optimista (Actualizamos el estado local con la ESQUINA nueva)
    setAlmacenData(prevData => {
        const newData = { ...prevData };
        if (selected.tipo === 'RACK') {
            newData.estanterias = prevData.estanterias.map(item => item.id === selected.id ? { ...item, x: cornerX, z: cornerZ, rotacion: newRotDeg } : item);
        } else if (selected.tipo === 'ZONE') {
            newData.zonas_suelo = prevData.zonas_suelo.map(item => item.id === selected.id ? { ...item, x: cornerX, z: cornerZ, rotacion: newRotDeg } : item);
        } else if (selected.tipo === 'AREA') {
            newData.areas_restringidas = prevData.areas_restringidas.map(item => item.id === selected.id ? { ...item, x: cornerX, z: cornerZ, rotacion: newRotDeg } : item);
        }
        return newData;
    });

    setTimeout(() => setIsDragging(false), 100);

    // 5. Guardar en Backend
    try {
      let endpoint = '';
      const payload = { rotacion: newRotDeg };
      
      if (selected.tipo === 'RACK') {
          endpoint = `/api/inventario/estanterias/${selected.id}/`;
          payload.pos_x = cornerX; payload.pos_z = cornerZ;
      } else if (selected.tipo === 'ZONE') {
          endpoint = `/api/inventario/ubicaciones/${selected.id}/`;
          payload.pos_x_rel = Math.round(cornerX); 
          payload.pos_z_rel = Math.round(cornerZ);
      } else if (selected.tipo === 'AREA') {
          endpoint = `/api/inventario/areas-restringidas/${selected.id}/`;
          payload.pos_x = cornerX; payload.pos_z = cornerZ;
      }

      await apiClient.patch(endpoint, payload);
      console.log("Movimiento guardado");
    } catch (err) {
      console.error("Error guardando", err);
      loadData(); // Revertir si falla
    }
  };

  // --- MANEJO DE CLICS ---
  const handleObjectClick = async (type, data, e) => {
      e.stopPropagation(); 

      // A. LÓGICA DE "PUT" (SOLTAR MERCANCÍA)
      if (holdingItem && (type === 'UBICACION' || type === 'ZONE')) {
          if (data.ocupado) {
              alert("Esta ubicación ya está ocupada.");
              return;
          }
          try {
              await apiClient.patch(`/api/inventario/mercancias/${holdingItem.id_mercancia}/`, {
                  id_ubicacion_actual: data.id,
                  estado: 'En Bodega'
              });
              setHoldingItem(null); // Soltar
              loadData(); // Recargar para ver la caja
          } catch (err) {
              alert("Error al asignar: " + JSON.stringify(err.response?.data));
          }
          return;
      }

      // B. MODO BORRAR
      if (editMode && tool === 'DELETE') {
          if (window.confirm(`¿Eliminar ${type}?`)) {
              try {
                  let endpoint = '';
                  if (type === 'RACK') endpoint = `/api/inventario/estanterias/${data.id}/`;
                  if (type === 'ZONE') endpoint = `/api/inventario/ubicaciones/${data.id}/`;
                  if (type === 'AREA') endpoint = `/api/inventario/areas-restringidas/${data.id}/`;
                  
                  await apiClient.delete(endpoint);
                  loadData();
                  setSelected(null);
              } catch(err) { alert("Error al eliminar."); }
          }
          return; 
      }

      // C. SELECCIÓN
      if (!tool || (!editMode && (type === 'UBICACION' || type === 'ZONE'))) {
          setSelected({ ...data, tipo: type });
          setAssignMode(false);
      }
  };

  const selectTool = (newTool) => {
    setTool(newTool);
    setSelected(null); 
    setAssignMode(false);
  };

  // --- CREACIÓN ---
  const handleFloorMove = (e) => { 
      if (editMode && tool && tool !== 'DELETE') { 
          const x = Math.round(e.point.x); 
          const z = Math.round(e.point.z); 
          setPreviewPos([x, 0, z]); 
      } 
  };
  
  const handleFloorClick = async (e) => { 
      if (!editMode || !tool || !previewPos) return; 
      e.stopPropagation(); 
      const [x, y, z] = previewPos; 
      let width = 0;
      let depth = 0;

      if (tool === 'RACK') {
          width = 2 * 1.5; 
          depth = 1 * 1.0; 
      } else if (tool === 'ZONE') {
          width = 2; 
          depth = 2;
      } else if (tool === 'AREA') {
          width = 4; 
          depth = 4;
      }

      const error = validatePlacement(x, z, width, depth);
      if (error) {
          alert(`⛔ Acción bloqueada: ${error}`);
          return;
      }

      try { 
          if (tool === 'RACK') { 
              const codigo = prompt("Código Estantería:"); if (!codigo) return; 
              await apiClient.post('/api/inventario/estanterias/', { 
                  codigo_estanteria: codigo, pos_x: x, pos_y: 0, pos_z: z, 
                  num_modulos_ancho: 2, num_niveles_alto: 3, num_profundidad: 1, 
                  ancho_hueco_m: 1.5, alto_hueco_m: 1.5, profundo_hueco_m: 1.0 
              }); 
          } else if (tool === 'ZONE') { 
              const codigo = prompt("Código Zona:"); if (!codigo) return; 
              await apiClient.post('/api/inventario/ubicaciones/', { 
                  codigo_ubicacion: codigo, es_zona_suelo: true, 
                  pos_x_rel: x, pos_z_rel: z, pos_y_rel: 0, capacidad_maxima_kg: 1000 
              }); 
          } else if (tool === 'AREA') { 
              const nombre = prompt("Nombre Área:"); if (!nombre) return; 
              await apiClient.post('/api/inventario/areas-restringidas/', { 
                  nombre: nombre, pos_x: x, pos_z: z, 
                  ancho: 4, largo: 4, alto: 3, color: '#ef4444' 
              }); 
          } 
          loadData(); 
      } catch (err) { alert("Error al crear."); } 
  };

  // --- OTROS ---
  const updateLocalDims = (field, value) => {
    const val = parseFloat(value);
    if (isNaN(val)) return;
    setAlmacenData(prev => ({ ...prev, dimensiones: { ...prev.dimensiones, [field]: val } }));
  };
  const handleUpdateDims = async () => {
      try {
          const dims = almacenData.dimensiones;
          await apiClient.patch('/api/usuarios/empresa/config/', { almacen_ancho: dims.ancho, almacen_largo: dims.largo, almacen_alto: dims.alto });
          alert("Dimensiones guardadas."); setShowConfig(false);
      } catch(err) { alert("Error al guardar dimensiones."); }
  };
  const handlePropertyUpdate = async (field, value) => {
      if (!selected) return;
      try { await apiClient.patch(`/api/inventario/estanterias/${selected.id}/`, { [field]: value }); loadData(); } 
      catch (err) { alert("Error: " + JSON.stringify(err.response?.data)); }
  };
  const handleAssign = async (mercanciaId) => { if (!selected) return; try { await apiClient.patch(`/api/inventario/mercancias/${mercanciaId}/`, { id_ubicacion_actual: selected.id, estado: 'En Bodega' }); setAssignMode(false); setSelected(null); loadData(); } catch (err) { alert("Error al asignar."); } };
  const handleLiberate = async () => { if (!selected || !selected.mercancia) return; if(!window.confirm("¿Quitar mercancía?")) return; try { await apiClient.patch(`/api/inventario/mercancias/${selected.mercancia.id}/`, { id_ubicacion_actual: null }); setSelected(null); loadData(); } catch(err) { alert("Error al liberar"); } };
  const handleSelectUbicacion = (ubicacionData) => { if (!editMode) setSelected(ubicacionData); };
  const handlePickUp = (mercancia) => {
      if (holdingItem?.id_mercancia === mercancia.id_mercancia) setHoldingItem(null);
      else { setHoldingItem(mercancia); if (editMode) setEditMode(false); }
  };


  if (loading) return <div className="p-5 text-center">Cargando...</div>;
  const dims = almacenData.dimensiones;

  return (
    <div style={{ height: '85vh', position: 'relative' }}>
      
      {/* BARRA SUPERIOR */}
      <div className="position-absolute top-0 start-0 p-3 m-3 z-10 bg-white rounded shadow-sm d-flex gap-2 align-items-center">
         <div className="form-check form-switch pt-1 me-2">
            <input className="form-check-input" type="checkbox" checked={editMode} onChange={e => { setEditMode(e.target.checked); selectTool(null); setSelected(null); }} />
            <label className="form-check-label fw-bold">{editMode ? "🛠️ Editor" : "👁️ Visor"}</label>
         </div>
         {editMode && (
             <button className="btn btn-outline-dark btn-sm" onClick={()=>setShowConfig(!showConfig)}><Settings size={18} /></button>
         )}
         {editMode && selected && !tool && (
             <>
                <div className="vr mx-2"></div>
                <button className={`btn btn-sm ${transformMode==='translate'?'btn-primary':'btn-outline-secondary'}`} onClick={()=>setTransformMode('translate')}><Move size={16}/></button>
                <button className={`btn btn-sm ${transformMode==='rotate'?'btn-primary':'btn-outline-secondary'}`} onClick={()=>setTransformMode('rotate')}><RotateCw size={16}/></button>
             </>
         )}
      </div>

      {/* CONFIGURACIÓN DIMENSIONES */}
      {showConfig && (
          <div className="card position-absolute top-5 start-0 m-3 mt-5 shadow" style={{width: '220px', zIndex: 15}}>
              <div className="card-header bg-light py-2 px-3"><strong className="small">Dimensiones Bodega</strong><button type="button" className="btn-close float-end small" onClick={()=>setShowConfig(false)}></button></div>
              <div className="card-body p-3">
                  <div className="mb-2"><label className="small text-muted">Ancho (X)</label><input type="number" className="form-control form-control-sm" defaultValue={dims.ancho} onBlur={(e)=> updateLocalDims('ancho', e.target.value)} /></div>
                  <div className="mb-2"><label className="small text-muted">Largo (Z)</label><input type="number" className="form-control form-control-sm" defaultValue={dims.largo} onBlur={(e)=> updateLocalDims('largo', e.target.value)} /></div>
                  <div className="mb-2"><label className="small text-muted">Alto (Y)</label><input type="number" className="form-control form-control-sm" defaultValue={dims.alto} onBlur={(e)=> updateLocalDims('alto', e.target.value)} /></div>
                  <button className="btn btn-primary btn-sm w-100 mt-2" onClick={handleUpdateDims}><Save size={14} className="me-1"/> Guardar</button>
              </div>
          </div>
      )}

      {/* HERRAMIENTAS */}
      {editMode && !selected && (
          <div className="position-absolute top-5 start-0 p-3 m-3 z-10 mt-5 bg-white rounded shadow-sm d-flex flex-column gap-2">
            <button className={`btn btn-sm ${!tool ? 'btn-dark' : 'btn-outline-secondary'} d-flex align-items-center`} onClick={() => selectTool(null)}><MousePointer2 size={16} className="me-2"/> Seleccionar</button>
            <hr className="my-1"/>
            <button className={`btn btn-sm ${tool === 'RACK' ? 'btn-primary' : 'btn-outline-secondary'} d-flex align-items-center`} onClick={() => selectTool('RACK')}><PlusSquare size={16} className="me-2"/> Estantería</button>
            <button className={`btn btn-sm ${tool === 'ZONE' ? 'btn-success' : 'btn-outline-secondary'} d-flex align-items-center`} onClick={() => selectTool('ZONE')}><Layers size={16} className="me-2"/> Zona Suelo</button>
            <button className={`btn btn-sm ${tool === 'AREA' ? 'btn-warning' : 'btn-outline-secondary'} d-flex align-items-center`} onClick={() => selectTool('AREA')}><Ban size={16} className="me-2"/> Área Restr.</button>
            <hr className="my-1"/>
            <button className={`btn btn-sm ${tool === 'DELETE' ? 'btn-danger' : 'btn-outline-danger'} d-flex align-items-center`} onClick={() => selectTool('DELETE')}><Trash2 size={16} className="me-2"/> Borrar Item</button>
          </div>
      )}

      {/* PROPIEDADES RACK */}
      {editMode && selected && selected.tipo === 'RACK' && !tool && (
          <div className="card position-absolute top-0 end-0 m-3 shadow p-3" style={{ width: '250px', zIndex: 10 }}>
              <h6>Propiedades: {selected.codigo}</h6>
              <hr className="my-2"/>
              <div className="mb-2"><label className="form-label small">Módulos Ancho</label><input type="number" className="form-control form-control-sm" defaultValue={selected.num_modulos_ancho} onBlur={(e)=>handlePropertyUpdate('num_modulos_ancho', e.target.value)} key={`w-${selected.id}`} /></div>
              <div className="mb-2"><label className="form-label small">Niveles Alto</label><input type="number" className="form-control form-control-sm" defaultValue={selected.num_niveles_alto} onBlur={(e)=>handlePropertyUpdate('num_niveles_alto', e.target.value)} key={`h-${selected.id}`} /></div>
              <div className="d-grid mt-3"><button className="btn btn-outline-primary btn-sm" onClick={()=>setSelected(null)}>Cerrar</button></div>
          </div>
      )}

      {/* AVISO PICK & PLACE */}
      {holdingItem && (
        <div className="position-absolute top-0 start-50 translate-middle-x mt-3 z-20 animate-in slide-in-from-top">
          <div className="bg-indigo-600 text-white px-4 py-2 rounded-pill shadow-lg d-flex align-items-center gap-2">
            <Package size={18} />
            <span>Colocando: <strong>{holdingItem.cliente_nombre}</strong></span>
            <button className="btn-close btn-close-white ms-2" onClick={() => setHoldingItem(null)}></button>
          </div>
        </div>
      )}

      {/* PANEL DETALLES */}
      {!editMode && selected && (
        <div className="card position-absolute top-0 end-0 m-3 shadow" style={{ width: '320px', zIndex: 20 }}>
           <div className="card-header d-flex justify-content-between align-items-center bg-white border-bottom-0 pt-3 px-3 pb-0">
            <h5 className="mb-0 fw-bold text-dark">{selected.codigo}</h5>
            <button type="button" className="btn-close" onClick={() => { setSelected(null); setAssignMode(false); setShowDispatchAssign(false); }}></button>
            </div>
           <div className="card-body px-3 pb-3 pt-2">
            
            {/* Estado de la Ubicación */}
            <div className="mb-3">
               <span className={`badge ${selected.ocupado ? "bg-warning text-dark" : "bg-success"} me-2`}>
                  {selected.ocupado ? 'Ocupado' : 'Disponible'}
               </span>
               {!selected.ocupado && (
                   <small className="text-muted">Cap: {selected.cap_kg || '∞'}kg</small>
               )}
            </div>

            {/* --- DETALLES DE LA MERCANCÍA --- */}
            {selected.ocupado && selected.mercancia ? (
              <>
                 {!showDispatchAssign ? (
                    // VISTA NORMAL DE DATOS
                    <div className="bg-gray-50 p-3 rounded border border-gray-100">
                        {/* Cliente y Descripción */}
                        <h6 className="text-primary fw-bold mb-1">{selected.mercancia.cliente}</h6>
                        <p className="small text-muted mb-2 lh-sm">{selected.mercancia.descripcion}</p>
                        
                        {/* Grid de Datos (Fecha, Peso, Bultos) */}
                        <div className="row g-2 mb-3">
                            <div className="col-6">
                                <div className="d-flex align-items-center gap-2 text-secondary small bg-white p-2 rounded border">
                                    <Calendar size={14} className="text-info"/> 
                                    <span>{selected.mercancia.fecha_ingreso}</span>
                                </div>
                            </div>
                            <div className="col-6">
                                <div className="d-flex align-items-center gap-2 text-secondary small bg-white p-2 rounded border">
                                    <Package size={14} className="text-warning"/> 
                                    <span>{selected.mercancia.bultos} Bultos</span>
                                </div>
                            </div>
                            <div className="col-12">
                                <div className="d-flex align-items-center gap-2 text-secondary small bg-white p-2 rounded border">
                                    <Weight size={14} className="text-danger"/> 
                                    <span>{selected.mercancia.kg} kg Total</span>
                                </div>
                            </div>
                        </div>

                        {/* Información de Despacho Actual */}
                        {selected.mercancia.despacho_id ? (
                            <div className="alert alert-warning py-2 px-2 d-flex align-items-center gap-2 small mb-2">
                                <Truck size={16}/> 
                                <span>Asignado a <strong>Despacho #{selected.mercancia.despacho_id}</strong></span>
                            </div>
                        ) : (
                            <div className="alert alert-success py-2 px-2 small mb-2 text-center">
                                Disponible para despacho
                            </div>
                        )}

                        {/* Botones de Acción */}
                        <div className="d-flex gap-2">
                            <button 
                                onClick={() => setShowDispatchAssign(true)} 
                                className="btn btn-primary btn-sm flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                            >
                                <Truck size={14} /> {selected.mercancia.despacho_id ? 'Cambiar Despacho' : 'Asignar Despacho'}
                            </button>
                            <button onClick={handleLiberate} className="btn btn-outline-danger btn-sm" title="Sacar del rack">
                                <XCircle size={14} />
                            </button>
                        </div>
                    </div>
                 ) : (
                    // VISTA DE SELECCIÓN DE DESPACHO
                    <div className="bg-gray-50 p-3 rounded border border-gray-100 animate-in fade-in">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <strong className="small text-muted">Seleccionar Despacho:</strong>
                            <button onClick={() => setShowDispatchAssign(false)} className="btn btn-link btn-sm p-0 text-decoration-none">Volver</button>
                        </div>
                        
                        <div className="list-group" style={{maxHeight: '200px', overflowY: 'auto'}}>
                            {activeDespachos.length === 0 && <p className="small text-center text-muted my-3">No hay despachos activos.</p>}
                            
                            {activeDespachos.map(d => (
                                <button 
                                    key={d.id_despacho}
                                    className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center small ${selected.mercancia.despacho_id === d.id_despacho ? 'active' : ''}`}
                                    onClick={() => handleAssignDespacho(d.id_despacho)}
                                >
                                    <div>
                                        <strong>#{d.id_despacho}</strong> {d.id_ruta}
                                        <div className="text-xs opacity-75">{d.fecha_programada}</div>
                                    </div>
                                    {selected.mercancia.despacho_id === d.id_despacho && <CheckCircle size={14}/>}
                                </button>
                            ))}
                        </div>
                    </div>
                 )}
              </>
            ) : (
                   <div className="d-flex flex-column gap-2">
                  <button onClick={() => setShowQuickCreate(true)} className="btn btn-success btn-sm w-100 d-flex align-items-center justify-content-center gap-2"><PlusSquare size={16} /> Crear Mercancía Aquí</button>
                  <div className="text-center text-muted" style={{fontSize: '0.7rem'}}>- O -</div>
                  {!assignMode ? (
                      <button onClick={()=>setAssignMode(true)} className="btn btn-outline-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-2"><Box size={14} /> Asignar desde Bodega</button>
                  ) : (
                      /* ... tu lista de unassignedMerch ... */
                      <div className="list-group mt-2" style={{maxHeight:'150px', overflowY:'auto'}}>
                         {unassignedMerch.map(m=>(
                             <button key={m.id_mercancia} className="list-group-item list-group-item-action p-1 small" onClick={()=>handleAssign(m.id_mercancia)}>#{m.id_mercancia} {m.cliente_nombre}</button>
                         ))}
                         <button onClick={()=>setAssignMode(false)} className="btn btn-link btn-sm text-center">Cancelar</button>
                      </div>
                  )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALES */}
      {showQuickCreate && selected && (
        <QuickCreateModal ubicacion={selected} onClose={() => setShowQuickCreate(false)} onSuccess={() => { loadData(); setSelected(null); }} />
      )}

      {/* ESCENA 3D */}
      <Canvas camera={{ position: [dims.ancho, dims.alto * 1.5, dims.largo], fov: 50 }}>
        <ambientLight intensity={0.8} />
        <pointLight position={[dims.ancho/2, 10, dims.largo/2]} intensity={1} />
        <color attach="background" args={['#e2e8f0']} />
        
        <OrbitControls makeDefault enabled={!isDragging} /> 

        <AlmacenEstructura3D dimensiones={dims} />
        
        <Grid position={[dims.ancho/2, 0.02, dims.largo/2]} args={[dims.ancho, dims.largo]} sectionSize={1} cellThickness={0.5} sectionThickness={1} fadeDistance={50} infiniteGrid={false} />

        {/* PLANO INTERACCIÓN */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[dims.ancho / 2, 0.01, dims.largo / 2]} visible={false} onPointerMove={handleFloorMove} onClick={handleFloorClick}>
            <planeGeometry args={[dims.ancho, dims.largo]} />
            <meshBasicMaterial transparent opacity={0} />
        </mesh>

        {/* PREVIEWS */}
        {editMode && previewPos && (
            <>
                {tool === 'RACK' && <mesh position={previewPos}><boxGeometry args={[2, 3, 1]} /><meshStandardMaterial color="blue" opacity={0.5} transparent /></mesh>}
                {tool === 'ZONE' && <mesh position={previewPos}><boxGeometry args={[2, 0.1, 2]} /><meshStandardMaterial color="green" opacity={0.5} transparent /></mesh>}
                {tool === 'AREA' && <mesh position={previewPos}><boxGeometry args={[4, 3, 4]} /><meshStandardMaterial color="red" opacity={0.5} transparent /></mesh>}
            </>
        )}

        {/* --- OBJETOS REALES CON LÓGICA CENTRO */}
        
        {/* ÁREAS RESTRINGIDAS */}
        {almacenData.areas_restringidas?.map(area => {
            const centerX = area.x + (area.width / 2);
            const centerZ = area.z + (area.depth / 2);
            return (
            <React.Fragment key={area.id}>
                {editMode && selected?.id === area.id && selected?.tipo === 'AREA' && !tool ? (
                    <TransformControls mode={transformMode} onMouseUp={handleTransformEnd} onMouseDown={() => setIsDragging(true)} object={selectedObjectRef} translationSnap={0.5} rotationSnap={Math.PI / 8}>
                        <group ref={selectedObjectRef} position={[centerX, 0, centerZ]} rotation={[0, area.rotacion * (Math.PI/180) || 0, 0]}>
                             <AreaRestringida3D area={area} /> 
                        </group>
                    </TransformControls>
                ) : (
                    <group position={[centerX, 0, centerZ]} rotation={[0, area.rotacion * (Math.PI/180) || 0, 0]} onClick={(e) => handleObjectClick('AREA', area, e)}>
                        <AreaRestringida3D area={area} />
                    </group>
                )}
            </React.Fragment>
            );
        })}

        {/* ESTANTERÍAS */}
        {almacenData.estanterias.map(est => {
            const ancho = est.ancho_hueco_m || 1;
            const profundo = est.profundo_hueco_m || 1;
            const totalWidth = (est.num_modulos_ancho || 1) * ancho;
            const totalDepth = (est.num_profundidad || 1) * profundo;
            
            const centerX = est.x + (totalWidth / 2);
            const centerZ = est.z + (totalDepth / 2);

            return (
            <React.Fragment key={est.id}>
                {editMode && selected?.id === est.id && selected?.tipo === 'RACK' && !tool ? (
                    <TransformControls mode={transformMode} onMouseUp={handleTransformEnd} onMouseDown={() => setIsDragging(true)} object={selectedObjectRef} translationSnap={0.5} rotationSnap={Math.PI / 8}>
                        <group ref={selectedObjectRef} position={[centerX, est.y, centerZ]} rotation={[0, est.rotacion * (Math.PI/180) || 0, 0]}>
                             <EstanteriaModelo3D estanteria={{...est, x:0, y:0, z:0}} onSelect={() => {}} holdingItem={holdingItem} />
                        </group>
                    </TransformControls>
                ) : (
                    <group position={[centerX, est.y, centerZ]} rotation={[0, est.rotacion * (Math.PI/180) || 0, 0]} onClick={(e) => handleObjectClick('RACK', est, e)}>
                        <EstanteriaModelo3D estanteria={{...est, x:0, y:0, z:0}} onSelect={(u) => handleObjectClick('UBICACION', u, { stopPropagation: ()=>{} })} holdingItem={holdingItem} />
                    </group>
                )}
            </React.Fragment>
            );
        })}

        {/* ZONAS SUELO */}
        {almacenData.zonas_suelo.map(zona => {
            const w = zona.width || 2;
            const d = zona.depth || 2;
            const centerX = zona.x + (w / 2);
            const centerZ = zona.z + (d / 2);

            return (
             <React.Fragment key={zona.id}>
                {editMode && selected?.id === zona.id && selected?.tipo === 'ZONE' && !tool ? (
                     <TransformControls mode={transformMode} onMouseUp={handleTransformEnd} onMouseDown={() => setIsDragging(true)} object={selectedObjectRef} translationSnap={0.5} rotationSnap={Math.PI / 8}>
                        <group ref={selectedObjectRef} position={[centerX, 0, centerZ]} rotation={[0, zona.rotacion * (Math.PI/180) || 0, 0]}>
                           <ZonaSueloModelo3D ubicacion={{...zona, x:0, z:0}} onSelect={()=>{}} holdingItem={holdingItem} />
                        </group>
                     </TransformControls>
                ) : (
                   <group position={[centerX, 0, centerZ]} rotation={[0, zona.rotacion * (Math.PI/180) || 0, 0]} onClick={(e) => handleObjectClick('ZONE', zona, e)}>
                      <ZonaSueloModelo3D ubicacion={{...zona, x:0, z:0}} onSelect={(u) => handleObjectClick('ZONE', u, { stopPropagation: ()=>{} })} holdingItem={holdingItem} />
                   </group>
                )}
             </React.Fragment>
            );
        })}

      </Canvas>
      
      {dockItems.length > 0 && !holdingItem && (
        <MercanciaDock mercancias={dockItems} onPickUp={handlePickUp} selectedItem={holdingItem} />
      )}
    </div>
  );
}
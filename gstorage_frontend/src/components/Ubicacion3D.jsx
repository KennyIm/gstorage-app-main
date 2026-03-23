import React, { useRef, useState } from 'react';
import { useSpring, a } from '@react-spring/three';
import { Box, Html } from '@react-three/drei';
import { AlertTriangle, Calendar, Clock } from 'lucide-react';

export default function Ubicacion3D({ ubicacion, position, onSelect, holdingItem}) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  // Colores dinámicos
  const colorCarton = '#E6730C';     
  const colorLibre = '#00FF0D';   
  const colorHover = '#fbbf24';    
  const colorAsignado = '#F59E0B';
  const colorTarget = '#4ade80';
  const colorCintaNormal = '#09db09';
  const colorCintaAlerta = '#f2f757'; 

  const colorValido = '#4b2af5';
  const colorInvalido = '#f01628';

  let diasEnAlmacen = 0;
  let esCargaAntigua = false;

  if (ubicacion.mercancia?.fecha_ingreso_iso) {
    const fechaIngreso = new Date(ubicacion.mercancia.fecha_ingreso_iso);
    const fechaHoy = new Date();
    const diferenciaTiempo = Math.abs(fechaHoy - fechaIngreso);
    diasEnAlmacen = Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24)); 
    
    if (diasEnAlmacen >= 5) {
        esCargaAntigua = true;
    }
  }

  const checkCapacity = () => {
      if (!holdingItem) return true;
      
      const itemKg = parseFloat(holdingItem.kg) || 0;
      const itemM3 = parseFloat(holdingItem.m3) || 0;
      
      const locKg = parseFloat(ubicacion.cap_kg) || 0; 
      const locM3 = parseFloat(ubicacion.cap_m3) || 0;

      if (locKg > 0 && itemKg > locKg) return false; 
      if (locM3 > 0 && itemM3 > locM3) return false; 
      
      if (locKg === 0 && itemKg > 0) return false; 

      return true;
  };

  const fits = checkCapacity();
  let finalColor = colorLibre; 
  let opacity = 0.40; 
  const colorCintaActual = esCargaAntigua ? colorCintaAlerta : colorCintaNormal;

  if (ubicacion.ocupado) {
    if (ubicacion.mercancia?.estado === 'Asignado') {
        finalColor = colorAsignado;
        opacity = 0.8;
    } else {
        finalColor = colorCarton;
        opacity = 1; 
    }
  }
  
  if (hovered) {
      if (holdingItem) {
          if (ubicacion.ocupado) {
              finalColor = colorInvalido; 
          } else if (!fits) {
              finalColor = colorInvalido; 
          } else {
              finalColor = colorValido;   
          }
          opacity = 0.8;
      } else {
          finalColor = colorHover;
          opacity = 0.8;
      }
  }

  const w = ubicacion.width * 0.9;
  const h = ubicacion.height * 0.9;
  const d = ubicacion.depth * 0.9;

  const cintaAncho = w * 0.3; 
  const cintaAlto = 0.02;

  return (
    <group 
      position={position}
      onClick={(e) => { e.stopPropagation(); onSelect(ubicacion); }}
      onPointerOver={() => setHovered(true)} 
      onPointerOut={() => setHovered(false)}
    >
      {/* CAJA BASE */}
      <Box args={[w, h, d]}>
        <meshStandardMaterial color={finalColor} transparent opacity={opacity} roughness={0.8} />
      </Box>

      {/* CINTAS (Solo si ocupado y no asignado) */}
      {ubicacion.ocupado && ubicacion.mercancia?.estado !== 'Asignado' && (
        <group>
          <Box args={[w + 0.01, cintaAlto, cintaAncho]} position={[0, h/2 + 0.01, 0]}>
             <meshStandardMaterial color={colorCintaActual} />
          </Box>
          <Box args={[cintaAlto, h * 0.3, cintaAncho]} position={[w/2 + 0.01, h/2 - (h*0.3)/2, 0]}>
             <meshStandardMaterial color={colorCintaActual} />
          </Box>
           <Box args={[cintaAlto, h * 0.3, cintaAncho]} position={[-w/2 - 0.01, h/2 - (h*0.3)/2, 0]}>
             <meshStandardMaterial color={colorCintaActual} />
          </Box>
        </group>
      )}

      {/* --- ETIQUETA FLOTANTE (INFORMACIÓN AMPLIADA) --- */}
      {hovered && (
        <Html distanceFactor={15} position={[0, h/2 + 0.5, 0]} style={{ pointerEvents: 'none', width: '200px' }}>
          <div className="bg-gray-900 text-white text-xs p-2 rounded shadow-xl border border-gray-600">
            
            {/* Cabecera: Código */}
            <div className="font-bold text-amber-400 text-sm border-b border-gray-700 pb-1 mb-1">
                {ubicacion.codigo}
            </div>

            {ubicacion.mercancia ? (
              <div className="flex flex-col gap-1">
                  {/* Alerta de Antigüedad */}
                  {esCargaAntigua && (
                      <div className="flex items-center gap-1 text-red-400 font-bold bg-red-900/30 p-1 rounded">
                          <AlertTriangle size={12} />
                          <span>¡Carga Antigua! (+5 días)</span>
                      </div>
                  )}

                  <div><strong>Cliente:</strong> {ubicacion.mercancia.cliente}</div>
                  <div className="text-gray-400 truncate">{ubicacion.mercancia.descripcion}</div>
                  
                  {/* Fecha y Días */}
                  <div className="flex items-center gap-1 mt-1 text-gray-300">
                      <Calendar size={10} />
                      <span>{new Date(ubicacion.mercancia.fecha_ingreso_iso).toLocaleDateString()}</span>
                      <span className="text-gray-500">({diasEnAlmacen} días)</span>
                  </div>
              </div>
            ) : (
              <div className="text-gray-400">
                 <div className="mb-1">Capacidad:</div>
                 <div>⚖️ {ubicacion.cap_kg || '∞'} kg</div>
                 <div>📦 {ubicacion.cap_m3 || '∞'} m³</div>
                 {holdingItem && !fits && <div className="text-red-500 font-bold mt-1">⚠️ No cabe aquí</div>}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

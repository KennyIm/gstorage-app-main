import React from 'react';
import { Html } from '@react-three/drei';

export default function AreaRestringida3D({ area }) {
  // Dimensiones
  const width = area.width || 4;
  const depth = area.depth || 4;
  const height = area.height || 3;

  return (
    <mesh position={[width / 2, height / 2, depth / 2]}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={area.color} transparent opacity={0.3} />
      
      <Html center style={{ pointerEvents: 'none' }}>
        <div 
            className="text-white font-bold px-2 py-1 rounded text-xs whitespace-nowrap shadow-md"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', border: `2px solid ${area.color}` }}
        >
          ⛔ {area.nombre}
        </div>
      </Html>
    </mesh>
  );
}
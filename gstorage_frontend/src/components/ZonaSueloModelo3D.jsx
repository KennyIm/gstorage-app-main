import React from 'react';
import { Text } from '@react-three/drei';
import Ubicacion3D from './Ubicacion3D';

export default function ZonaSueloModelo3D({ ubicacion, onSelect,holdingItem }) {
  const width = ubicacion.width || 1.5;
  const depth = ubicacion.depth || 1.5;
  const height = 1.5; // Altura simulada de la carga

  const centerX = width / 2;
  const centerZ = depth / 2;

  return (
    <group>
      {/* Caja de Mercancía */}
      <Ubicacion3D
        ubicacion={{ ...ubicacion, width, height, depth }}
        position={[centerX, height / 2, centerZ]}
        onSelect={onSelect}
        holdingItem={holdingItem} 
      />

      <Text
        position={[centerX, 0.05, depth + 0.2]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.3}
        color="#333"
        anchorX="center"
        anchorY="middle"
      >
        {ubicacion.codigo}
      </Text>
      
      {/* Marco amarillo en el suelo */}
      <mesh position={[centerX, 0.01, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width + 0.2, depth + 0.2]} />
        <meshBasicMaterial color="yellow" wireframe />
      </mesh>
    </group>
  );
}
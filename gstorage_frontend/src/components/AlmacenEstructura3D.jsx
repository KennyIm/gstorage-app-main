import React from 'react';
import { DoubleSide } from 'three';

export default function AlmacenEstructura3D({ dimensiones }) {
  const { ancho, largo, alto } = dimensiones;
  const paredGrosor = 0.2;

  const colorSuelo = '#e5e7eb'; 
  const colorPared = '#94a3b8'; 
  const colorZocalo = '#f59e0b'; 

  return (
    <group>
      {/* 1. SUELO */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[ancho / 2, -0.01, largo / 2]} 
        receiveShadow
      >
        <planeGeometry args={[ancho, largo]} />
        <meshStandardMaterial color={colorSuelo} side={DoubleSide} />
      </mesh>

      {/* 2. PAREDES */}
      {/* Pared Fondo (Z = Largo) */}
      <mesh position={[ancho / 2, alto / 2, largo + paredGrosor/2]}>
        <boxGeometry args={[ancho + paredGrosor*2, alto, paredGrosor]} />
        <meshStandardMaterial color={colorPared} />
      </mesh>
      
      {/* Pared Izquierda (X = 0) */}
      <mesh position={[-paredGrosor/2, alto / 2, largo / 2]}>
        <boxGeometry args={[paredGrosor, alto, largo]} />
        <meshStandardMaterial color={colorPared} />
      </mesh>

      {/* Pared Derecha (X = Ancho) */}
      <mesh position={[ancho + paredGrosor/2, alto / 2, largo / 2]}>
        <boxGeometry args={[paredGrosor, alto, largo]} />
        <meshStandardMaterial color={colorPared} />
      </mesh>

      {/* 3. DETALLES VISUALES */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ancho / 2, 0.01, largo / 2]}>
         <planeGeometry args={[ancho * 0.98, largo * 0.98]} />
         <meshBasicMaterial color={colorZocalo} wireframe />
      </mesh>

    </group>
  );
}
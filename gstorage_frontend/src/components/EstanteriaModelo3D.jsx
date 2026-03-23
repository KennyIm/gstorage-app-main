import React, { useRef } from 'react';
import { Box } from '@react-three/drei';
import Ubicacion3D from './Ubicacion3D';

export default function EstanteriaModelo3D({ estanteria, onSelect, holdingItem }) {
  const meshRef = useRef();
  const {
    id,
    codigo,
    x = 0, 
    y = 0, 
    z = 0,
    ubicaciones = [] 
  } = estanteria;

  const num_modulos_ancho = estanteria.num_modulos_ancho || 1;
  const num_niveles_alto = estanteria.num_niveles_alto || 1;
  const num_profundidad = estanteria.num_profundidad || 1;


  const ancho_hueco = estanteria.ancho_hueco_m || estanteria.ancho_hueco || 1;
  const alto_hueco = estanteria.alto_hueco_m || estanteria.alto_hueco || 1;
  const profundo_hueco = estanteria.profundo_hueco_m || estanteria.profundo_hueco || 1;

  // 2. Cálculos de Dimensiones Totales
  const totalWidth = num_modulos_ancho * ancho_hueco;
  const totalHeight = (num_niveles_alto + 1) * alto_hueco; 
  const totalDepth = num_profundidad * profundo_hueco;

  // 3. Offset 
  // Three.js dibuja desde el centro. Si tus coordenadas x,y,z son la esquina,
  // necesitamos mover la estructura la mitad de su tamaño.
  const offsetX = totalWidth / 2;
  const offsetY = totalHeight / 2; 
  const offsetZ = totalDepth / 2;

  // --- Dimensiones Visuales de los elementos ---
  const pilarWidth = 0.1; // 10cm
  const vigaHeight = 0.05; // 5cm
  const plataformaThickness = 0.02; // 2cm

  const pilarColor = '#1e3a8a'; 
  const vigaColor = '#ea580c';  
  const plataformaColor = '#d1d5db'; 

  return (
    <group position={[x, y, z]} ref={meshRef}>
      
      {/* --- ESTRUCTURA METÁLICA --- */}
      
      {/* Pilares Verticales */}
      {[...Array(num_modulos_ancho + 1)].map((_, i) => (
        [...Array(num_profundidad + 1)].map((_, j) => (
           <Box 
            key={`pilar-${i}-${j}`}
            args={[pilarWidth, totalHeight, pilarWidth]} 
            position={[
              (i * ancho_hueco) + pilarWidth/2,     // X
              totalHeight / 2,                      // Y 
              (j * profundo_hueco) + pilarWidth/2   // Z
            ]}
          >
            <meshStandardMaterial color={pilarColor} />
          </Box>
        ))
      ))}

      {/* Vigas Horizontales y Plataformas */}
      {[...Array(num_niveles_alto + 1)].map((_, nivel) => { 
        const currentLevelY = nivel * alto_hueco; 
        
        return (
          <group key={`nivel-group-${nivel}`} position={[0, currentLevelY, 0]}>
            
             {[...Array(num_profundidad + 1)].map((_, profIdx) => (
                <Box
                  key={`viga-larga-${nivel}-${profIdx}`}
                  args={[totalWidth, vigaHeight, pilarWidth]}
                  position={[
                    totalWidth / 2,
                    0,              
                    (profIdx * profundo_hueco) + pilarWidth/2 
                  ]}
                >
                  <meshStandardMaterial color={vigaColor} />
                </Box>
             ))}
            {[...Array(num_modulos_ancho + 1)].map((_, modIdx) => (
               <Box
                  key={`viga-corta-${nivel}-${modIdx}`}
                  args={[pilarWidth, vigaHeight, totalDepth]}
                  position={[
                    (modIdx * ancho_hueco) + pilarWidth/2, 
                    0, 
                    totalDepth / 2 
                  ]}
                >
                  <meshStandardMaterial color={vigaColor} />
                </Box>
            ))}

            {/* Plataforma  */}
            {nivel > 0 && ( 
              <Box 
                args={[totalWidth, plataformaThickness, totalDepth]} 
                position={[totalWidth/2, plataformaThickness/2, totalDepth/2]} 
              >
                <meshStandardMaterial color={plataformaColor} />
              </Box>
            )}
          </group>
        );
      })}

      {/* --- UBICACIONES --- */}
      {ubicaciones.map(ubicacion => {
        const ubicacionX = (ubicacion.x_rel * ancho_hueco) + (ancho_hueco / 2); 
        const ubicacionY = (ubicacion.y_rel * alto_hueco) + (alto_hueco / 2); 
        const ubicacionZ = (ubicacion.z_rel * profundo_hueco) + (profundo_hueco / 2); 

        const posX = ubicacionX + (pilarWidth / 2);
        const posZ = ubicacionZ + (pilarWidth / 2);

        return (
          <Ubicacion3D
            key={ubicacion.id}
            ubicacion={{
              ...ubicacion,
              width: ancho_hueco - (pilarWidth * 2), 
              height: alto_hueco - vigaHeight,      
              depth: profundo_hueco - (pilarWidth * 2),
            }}
            position={[posX, ubicacionY, posZ]}
            onSelect={onSelect}
            holdingItem={holdingItem}
          />
        );
      })}
    </group>
  );
}
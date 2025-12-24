import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateSpiralData, lerp } from '../utils/math';

const InstancedMesh = 'instancedMesh' as any;
const SphereGeometry = 'sphereGeometry' as any;
const MeshBasicMaterial = 'meshBasicMaterial' as any;

const SpiralLights: React.FC<{ mixFactor: number }> = ({ mixFactor }) => {
  const count = 300;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const currentMixRef = useRef(1);
  const { target, chaos } = useMemo(() => generateSpiralData(count, 19, 7.5, 9), []);

  useLayoutEffect(() => {
     if (!meshRef.current) return;
     const color = new THREE.Color("#fffae0");
     for(let i=0; i<count; i++) {
         meshRef.current.setColorAt(i, color);
         dummy.position.set(target[i*3], target[i*3+1], target[i*3+2]);
         dummy.scale.setScalar(0.15);
         dummy.updateMatrix();
         meshRef.current.setMatrixAt(i, dummy.matrix);
     }
     meshRef.current.instanceMatrix.needsUpdate = true;
  }, [target]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    currentMixRef.current = lerp(currentMixRef.current, mixFactor, 2.0 * delta);
    const t = currentMixRef.current;
    const time = state.clock.elapsedTime;
    for(let i=0; i<count; i++) {
      dummy.position.set(lerp(chaos[i*3], target[i*3], t), lerp(chaos[i*3+1], target[i*3+1], t), lerp(chaos[i*3+2], target[i*3+2], t));
      dummy.scale.setScalar(Math.sin(time * 3 + i * 0.1) * 0.05 + 0.15);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <InstancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <SphereGeometry args={[1, 8, 8]} />
      <MeshBasicMaterial color="#fffae0" toneMapped={false} />
    </InstancedMesh>
  );
};

export default SpiralLights;

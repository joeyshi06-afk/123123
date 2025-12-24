import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { lerp } from '../utils/math';

const Group = 'group' as any;
const Mesh = 'mesh' as any;
const MeshStandardMaterial = 'meshStandardMaterial' as any;
const PointLight = 'pointLight' as any;

const TopStar: React.FC<{ mixFactor: number }> = ({ mixFactor }) => {
  const groupRef = useRef<THREE.Group>(null);
  const starMeshRef = useRef<THREE.Mesh>(null);
  const currentMixRef = useRef(1);
  
  const geometry = useMemo(() => {
      const shape = new THREE.Shape();
      const pts = 5, or = 1.2, ir = 0.6;
      shape.moveTo(0, or);
      for(let i=0; i<pts*2; i++) {
          const r = i % 2 === 0 ? or : ir;
          const a = i * (Math.PI * 2) / (pts * 2) + Math.PI / 2;
          shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      shape.closePath();
      const g = new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 4 });
      g.center();
      return g;
  }, []);

  useFrame((state, delta) => {
      if (!groupRef.current || !starMeshRef.current) return;
      currentMixRef.current = lerp(currentMixRef.current, mixFactor, 2.0 * delta);
      const t = currentMixRef.current;
      groupRef.current.position.set(0, lerp(13.0, 9.2, t), 0);
      starMeshRef.current.rotation.y += delta * 0.5;
      if (t < 0.9) {
          const tilt = (1 - t) * 0.5;
          groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime) * tilt;
          groupRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.8) * tilt;
      } else {
          groupRef.current.rotation.z = lerp(groupRef.current.rotation.z, 0, 2.0 * delta);
          groupRef.current.rotation.x = lerp(groupRef.current.rotation.x, 0, 2.0 * delta);
      }
  });

  return (
    <Group ref={groupRef}>
        <Mesh ref={starMeshRef} geometry={geometry}>
            <MeshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={2.0} roughness={0.1} metalness={0.9} toneMapped={false} />
        </Mesh>
        <PointLight color="#ffeebf" intensity={3.0} distance={15} decay={2} />
    </Group>
  );
};

export default TopStar;

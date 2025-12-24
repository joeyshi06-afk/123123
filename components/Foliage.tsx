import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateFoliageData, lerp } from '../utils/math';

// 解决 React 19 JSX 类型识别问题
const Points = 'points' as any;
const BufferGeometry = 'bufferGeometry' as any;
const BufferAttribute = 'bufferAttribute' as any;
const ShaderMaterial = 'shaderMaterial' as any;

const vertexShader = `
  precision highp float;
  uniform float uTime;
  uniform float uMix;
  uniform float uSize;
  
  attribute vec3 aTargetPos;
  attribute vec3 aChaosPos;
  attribute float aRandom;
  
  varying vec3 vPos;
  varying float vRandom;
  varying float vIsSnow;

  void main() {
    vRandom = aRandom;
    vIsSnow = step(0.85, aRandom); 

    vec3 pos = mix(aChaosPos, aTargetPos, uMix);
    
    float breath = sin(uTime + pos.y * 0.5) * 0.05 * uMix;
    pos.x += pos.x * breath;
    pos.z += pos.z * breath;

    vPos = pos;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    gl_PointSize = uSize * (20.0 / -mvPosition.z) * (0.6 + 0.8 * aRandom);
  }
`;

const fragmentShader = `
  precision highp float;
  uniform vec3 uColorBottom;
  uniform vec3 uColorTop;
  
  varying vec3 vPos;
  varying float vRandom;
  varying float vIsSnow;

  void main() {
    float h = clamp((vPos.y + 9.0) / 18.0, 0.0, 1.0);
    vec3 color = mix(uColorBottom, uColorTop, h);
    color *= 0.6 + 0.6 * vRandom;
    
    vec3 snowColor = vec3(0.95, 0.98, 1.0);
    color = mix(color, snowColor, vIsSnow * 0.9);

    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    
    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
    gl_FragColor = vec4(color, alpha);
  }
`;

const Foliage: React.FC<{ mixFactor: number; colors: { bottom: string; top: string } }> = ({ mixFactor, colors }) => {
  const count = 75000; 
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const currentMixRef = useRef(1);
  const { target, chaos, randoms } = useMemo(() => generateFoliageData(count, 18, 7.5), [count]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMix: { value: 1 },
    uSize: { value: 4.0 }, 
    uColorBottom: { value: new THREE.Color(colors.bottom) },
    uColorTop: { value: new THREE.Color(colors.top) }
  }), []);

  useFrame((state, delta) => {
    if (materialRef.current) {
      currentMixRef.current = lerp(currentMixRef.current, mixFactor, 2.0 * delta);
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uMix.value = currentMixRef.current;
      materialRef.current.uniforms.uColorBottom.value.set(colors.bottom);
      materialRef.current.uniforms.uColorTop.value.set(colors.top);
    }
  });

  return (
    <Points>
      <BufferGeometry>
        <BufferAttribute attach="attributes-position" count={count} array={target} itemSize={3} />
        <BufferAttribute attach="attributes-aTargetPos" count={count} array={target} itemSize={3} />
        <BufferAttribute attach="attributes-aChaosPos" count={count} array={chaos} itemSize={3} />
        <BufferAttribute attach="attributes-aRandom" count={count} array={randoms} itemSize={1} />
      </BufferGeometry>
      <ShaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </Points>
  );
};

export default Foliage;

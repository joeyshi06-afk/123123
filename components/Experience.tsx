import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import Foliage from './Foliage';
import Ornaments from './Ornaments';
import SpiralLights from './SpiralLights';
import Snow from './Snow';
import TopStar from './TopStar';
import { TreeColors } from '../types';

// 解决 React 19 JSX 类型识别问题
const AmbientLight = 'ambientLight' as any;
const SpotLight = 'spotLight' as any;
const PointLight = 'pointLight' as any;
const Group = 'group' as any;

const BALL_COLORS = ['#8B0000', '#D32F2F', '#1B5E20', '#D4AF37', '#C0C0C0', '#191970']; 
const BOX_COLORS = ['#800000', '#1B5E20', '#D4AF37', '#FFFFFF', '#4B0082', '#2F4F4F', '#008080', '#8B4513', '#DC143C'];

const SceneController: React.FC<{ inputRef: React.MutableRefObject<any>, groupRef: React.RefObject<THREE.Group> }> = ({ inputRef, groupRef }) => {
    const { camera, gl } = useThree();
    const vec = useMemo(() => new THREE.Vector3(), []);
    const zoomTarget = useRef(32); 
    const currentInput = useRef({ x: 0, y: 0 }); 

    useEffect(() => {
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            zoomTarget.current = THREE.MathUtils.clamp(zoomTarget.current + e.deltaY * 0.02, 12, 55);
        };
        gl.domElement.addEventListener('wheel', onWheel, { passive: false });
        return () => gl.domElement.removeEventListener('wheel', onWheel);
    }, [gl]);

    useFrame((state, delta) => {
        const sD = Math.min(delta, 0.1);
        currentInput.current.x = THREE.MathUtils.lerp(currentInput.current.x, inputRef.current.x, 4.0 * sD);
        currentInput.current.y = THREE.MathUtils.lerp(currentInput.current.y, inputRef.current.y, 4.0 * sD);
        camera.position.lerp(vec.set(currentInput.current.x * 4, currentInput.current.y * 2, zoomTarget.current + Math.abs(currentInput.current.x) * 2), 4.0 * sD);
        camera.lookAt(0, 0, 0);
        if (groupRef.current) {
            if (inputRef.current.isDetected) {
                const targetRot = currentInput.current.x * Math.PI * 1.2;
                groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRot, 6.0 * sD);
            } else {
                groupRef.current.rotation.y += 0.002;
            }
        }
    });
    return null;
};

const Experience: React.FC<any> = ({ mixFactor, colors, inputRef, userImages, signatureText }) => {
  const groupRef = useRef<THREE.Group>(null);
  return (
    <Canvas shadows camera={{ position: [0, 0, 32], fov: 45 }} gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping }}>
      <SceneController inputRef={inputRef} groupRef={groupRef} />
      <AmbientLight intensity={0.4} />
      <SpotLight position={[20, 20, 20]} angle={0.4} penumbra={1} intensity={2.0} color="#fff5d0" castShadow />
      <PointLight position={[-10, 5, -10]} intensity={1.2} color="#00ff00" />
      <PointLight position={[10, -5, 10]} intensity={1.2} color="#ff0000" />
      <Environment preset="night" />
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
      <Snow mixFactor={mixFactor} />
      <Group ref={groupRef}>
        <TopStar mixFactor={mixFactor} />
        <Foliage mixFactor={mixFactor} colors={colors} />
        <SpiralLights mixFactor={mixFactor} />
        <Ornaments mixFactor={mixFactor} type="BALL" count={60} scale={0.5} colors={BALL_COLORS} />
        <Ornaments mixFactor={mixFactor} type="BOX" count={30} scale={0.6} colors={BOX_COLORS} />
        <Ornaments mixFactor={mixFactor} type="STAR" count={25} scale={0.5} colors={['#FFD700']} />
        <Ornaments mixFactor={mixFactor} type="CRYSTAL" count={40} scale={0.4} colors={['#F0F8FF']} />
        <Ornaments mixFactor={mixFactor} type="PHOTO" count={userImages?.length || 10} userImages={userImages} signatureText={signatureText} />
      </Group>
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.9} mipmapBlur intensity={1.2} radius={0.6} />
        <Vignette offset={0.1} darkness={1.1} />
      </EffectComposer>
    </Canvas>
  );
};

export default Experience;

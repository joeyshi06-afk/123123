import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { lerp, randomVector3 } from '../utils/math';

// 解决 React 19 JSX 类型识别问题
const Group = 'group' as any;
const Mesh = 'mesh' as any;
const BoxGeometry = 'boxGeometry' as any;
const MeshStandardMaterial = 'meshStandardMaterial' as any;
const PlaneGeometry = 'planeGeometry' as any;
const MeshBasicMaterial = 'meshBasicMaterial' as any;
const TorusKnotGeometry = 'torusKnotGeometry' as any;
const InstancedMesh = 'instancedMesh' as any;

interface OrnamentData {
  chaosPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  rotation: THREE.Euler;
  color: THREE.Color;
  targetScale: THREE.Vector3;
  chaosScale: THREE.Vector3;
  chaosTilt: number;
}

// 优化的占位贴图：亮白色带边框
const generatePlaceholderTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        // 背景
        ctx.fillStyle = '#fdfdfd';
        ctx.fillRect(0, 0, 256, 320);
        // 内部灰色区域
        ctx.fillStyle = '#eeeeee';
        ctx.fillRect(20, 20, 216, 216);
        // 装饰线条
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, 236, 300);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
}

const generateSignatureTexture = (text: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!text) return new THREE.CanvasTexture(canvas);
    ctx.fillStyle = '#111111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = "bold 60px 'Monsieur La Doulaise', cursive";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
}

const PhotoFrameMesh: React.FC<{
    item: OrnamentData;
    mixFactor: number;
    texture: THREE.Texture;
    signatureTexture?: THREE.Texture | null;
}> = ({ item, mixFactor, texture, signatureTexture }) => {
    const groupRef = useRef<THREE.Group>(null);
    const innerRef = useRef<THREE.Group>(null); 
    const photoMatRef = useRef<THREE.MeshStandardMaterial>(null);
    const currentMixRef = useRef(1);
    const vecPos = useMemo(() => new THREE.Vector3(), []);
    const vecScale = useMemo(() => new THREE.Vector3(), []);

    const { frameArgs, photoArgs, photoPos, textPos, textArgs } = useMemo(() => {
        const aspect = (texture.image as any)?.width / (texture.image as any)?.height || 1;
        const maxSize = 0.85;
        let pw = maxSize, ph = maxSize;
        if (aspect >= 1) ph = maxSize / aspect; else pw = maxSize * aspect;

        const mSide = 0.08, mTop = 0.08, mBottom = 0.20;
        const fw = pw + mSide * 2, fh = ph + mTop + mBottom;
        return {
            frameArgs: [fw, fh, 0.05] as [number, number, number],
            photoArgs: [pw, ph] as [number, number],
            photoPos: [0, (fh / 2) - mTop - (ph / 2), 0.03] as [number, number, number],
            textPos: [0, -(fh / 2) + (mBottom / 2), 0.035] as [number, number, number],
            textArgs: [fw, mBottom] as [number, number]
        };
    }, [texture]);

    useFrame((state, delta) => {
        if (!groupRef.current || !innerRef.current) return;
        currentMixRef.current = lerp(currentMixRef.current, mixFactor, 2.0 * delta);
        const t = currentMixRef.current;
        
        vecPos.lerpVectors(item.chaosPos, item.targetPos, t);
        groupRef.current.position.copy(vecPos);
        
        const isSmall = state.viewport.width < 22;
        const responsiveScale = isSmall ? 0.6 : 1.0;
        const dist = groupRef.current.position.distanceTo(state.camera.position);
        const zoom = THREE.MathUtils.mapLinear(dist, 10, 60, isSmall ? 1.1 : 1.5, 0.6);
        
        vecScale.lerpVectors(item.chaosScale, item.targetScale, t).multiplyScalar(responsiveScale * lerp(1.0, zoom, 1.0 - t));
        groupRef.current.scale.copy(vecScale);

        if (photoMatRef.current) {
            photoMatRef.current.emissiveIntensity = lerp(0.5, 0.2, t);
        }

        if (t > 0.8) {
             groupRef.current.lookAt(0, groupRef.current.position.y, 0); 
             groupRef.current.rotateY(Math.PI); 
             innerRef.current.rotation.z = lerp(innerRef.current.rotation.z, 0, 2.0 * delta);
        } else {
             groupRef.current.lookAt(state.camera.position);
             innerRef.current.rotation.z = lerp(innerRef.current.rotation.z, item.chaosTilt, 2.0 * delta);
        }
    });

    return (
        <Group ref={groupRef}>
            <Group ref={innerRef}>
                <Mesh>
                    <BoxGeometry args={frameArgs} />
                    <MeshStandardMaterial color="#ffffff" roughness={1.0} metalness={0.0} emissive="#ffffff" emissiveIntensity={0.6} toneMapped={false} />
                </Mesh>
                <Mesh position={photoPos}>
                    <PlaneGeometry args={photoArgs} />
                    <MeshStandardMaterial 
                        ref={photoMatRef} 
                        map={texture} 
                        emissiveMap={texture} 
                        roughness={0.4} 
                        metalness={0.0} 
                        color="white" 
                        emissive="white" 
                        emissiveIntensity={0.25} 
                        toneMapped={false} 
                    />
                </Mesh>
                {signatureTexture && (
                    <Mesh position={textPos}>
                        <PlaneGeometry args={textArgs} />
                        <MeshBasicMaterial map={signatureTexture} transparent={true} opacity={0.85} depthWrite={false} />
                    </Mesh>
                )}
            </Group>
        </Group>
    );
};

const GiftBoxMesh: React.FC<{ item: OrnamentData; mixFactor: number; }> = ({ item, mixFactor }) => {
    const groupRef = useRef<THREE.Group>(null);
    const curMix = useRef(1);
    const vecP = useMemo(() => new THREE.Vector3(), []);
    const vecS = useMemo(() => new THREE.Vector3(), []);
    const ribbonMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#FFD700', roughness: 0.2, metalness: 0.8, emissive: '#FFD700', emissiveIntensity: 0.2 }), []);

    useFrame((state, delta) => {
        if (!groupRef.current) return;
        curMix.current = lerp(curMix.current, mixFactor, 2.0 * delta);
        const t = curMix.current;
        vecP.lerpVectors(item.chaosPos, item.targetPos, t);
        groupRef.current.position.copy(vecP);
        vecS.lerpVectors(item.chaosScale, item.targetScale, t);
        groupRef.current.scale.copy(vecS);
        groupRef.current.rotation.copy(item.rotation);
        if (t < 0.5) {
             groupRef.current.rotation.x += delta * 0.5;
             groupRef.current.rotation.y += delta * 0.5;
        }
    });

    return (
        <Group ref={groupRef}>
            <Mesh castShadow receiveShadow>
                <BoxGeometry args={[1, 1, 1]} />
                <MeshStandardMaterial color={item.color} roughness={0.4} metalness={0.1} />
            </Mesh>
            <Mesh scale={[0.2, 1.01, 1.01]} material={ribbonMat}><BoxGeometry args={[1, 1, 1]} /></Mesh>
            <Mesh scale={[1.01, 1.01, 0.2]} material={ribbonMat}><BoxGeometry args={[1, 1, 1]} /></Mesh>
            <Mesh position={[0, 0.5, 0]} material={ribbonMat} scale={[0.35, 0.35, 0.35]}><TorusKnotGeometry args={[0.6, 0.15, 64, 8, 2, 3]} /></Mesh>
        </Group>
    );
};

const UserPhotoOrnament: React.FC<{
    item: OrnamentData;
    mixFactor: number;
    url: string;
    signatureTexture?: THREE.Texture | null;
}> = ({ item, mixFactor, url, signatureTexture }) => {
    const texture = useLoader(THREE.TextureLoader, url);
    return <PhotoFrameMesh item={item} mixFactor={mixFactor} texture={texture} signatureTexture={signatureTexture} />;
};

const Ornaments: React.FC<{ mixFactor: number; type: string; count: number; colors?: string[]; scale?: number; userImages?: string[]; signatureText?: string; }> = ({ mixFactor, type, count, colors, scale = 1, userImages = [], signatureText }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const sigTex = useMemo(() => (type === 'PHOTO' && signatureText) ? generateSignatureTexture(signatureText) : null, [type, signatureText]);
  const placeholder = useMemo(() => generatePlaceholderTexture(), []);

  const data = useMemo(() => {
    const items: OrnamentData[] = [];
    const ga = Math.PI * (3 - Math.sqrt(5)), th = 18, rb = 7.5, ay = 9;
    const typeOff = ({ BALL: 0, BOX: 1, STAR: 2, CANDY: 3, CRYSTAL: 4, PHOTO: 5 }[type] || 0) * (Math.PI * 2 / 6);
    
    for (let i = 0; i < count; i++) {
      const prog = Math.sqrt((i + 1) / count) * 0.9;
      const r = prog * rb, y = ay - prog * th, a = i * ga + typeOff;
      const tPos = new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a)).multiplyScalar((type === 'STAR' || type === 'PHOTO') ? 1.15 : 1.08);
      const cPos = type === 'PHOTO' ? new THREE.Vector3(18 * Math.cos(i * ga), (i / count - 0.5) * 12, 18 * Math.sin(i * ga)) : randomVector3(25);
      const targetS = new THREE.Vector3(1, 1, 1).multiplyScalar(scale * (Math.random() * 0.4 + 0.8));
      const chaosS = type === 'PHOTO' ? targetS.clone().multiplyScalar(3.5 + Math.random() * 1.5) : targetS;
      items.push({ chaosPos: cPos, targetPos: tPos, rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0), color: new THREE.Color(colors ? colors[i % colors.length] : '#fff'), targetScale: targetS, chaosScale: chaosS, chaosTilt: ((i % 5) - 2) * 0.15 });
    }
    return items;
  }, [count, type, colors, scale]);

  useLayoutEffect(() => {
     if (!meshRef.current || type === 'PHOTO' || type === 'BOX') return;
     data.forEach((item, i) => {
         meshRef.current!.setColorAt(i, item.color);
         dummy.position.copy(item.targetPos); dummy.scale.copy(item.targetScale); dummy.rotation.copy(item.rotation); dummy.updateMatrix();
         meshRef.current!.setMatrixAt(i, dummy.matrix);
     });
     meshRef.current.instanceMatrix.needsUpdate = true;
  }, [data, type]);

  useFrame((state, delta) => {
    if (!meshRef.current || type === 'PHOTO' || type === 'BOX') return;
    data.forEach((item, i) => {
      dummy.position.lerpVectors(item.chaosPos, item.targetPos, mixFactor);
      dummy.scale.lerpVectors(item.chaosScale, item.targetScale, mixFactor);
      dummy.rotation.copy(item.rotation);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (type === 'PHOTO') {
      return (
          <Group>
              {data.map((item, i) => (
                  userImages[i] 
                  ? <React.Suspense key={i} fallback={<PhotoFrameMesh item={item} mixFactor={mixFactor} texture={placeholder} signatureTexture={sigTex} />}>
                        <UserPhotoOrnament item={item} mixFactor={mixFactor} url={userImages[i]} signatureTexture={sigTex} />
                    </React.Suspense>
                  : <PhotoFrameMesh key={i} item={item} mixFactor={mixFactor} texture={placeholder} signatureTexture={sigTex} />
              ))}
          </Group>
      )
  }

  if (type === 'BOX') return <Group>{data.map((item, i) => <GiftBoxMesh key={i} item={item} mixFactor={mixFactor} />)}</Group>;

  const geom = { BALL: new THREE.SphereGeometry(1, 16, 16), STAR: new THREE.OctahedronGeometry(1), CRYSTAL: new THREE.IcosahedronGeometry(1) }[type] || new THREE.BoxGeometry(1, 1, 1);
  return <InstancedMesh ref={meshRef} args={[geom, undefined, count]}><MeshStandardMaterial roughness={0.2} metalness={0.5} /></InstancedMesh>;
};

export default Ornaments;

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Stars/particles inside the brain
function CosmicParticles() {
  const particlesRef = useRef();

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < 2000; i++) {
      const x = (Math.random() - 0.5) * 4;
      const y = (Math.random() - 0.5) * 3;
      const z = (Math.random() - 0.5) * 3;
      temp.push(x, y, z);
    }
    return new Float32Array(temp);
  }, []);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.length / 3}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#ffffff"
        sizeAttenuation
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Nebula-like clouds inside brain
function NebulaClouds() {
  const cloudRef = useRef();

  useFrame((state) => {
    if (cloudRef.current) {
      cloudRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.2;
      cloudRef.current.rotation.y = state.clock.elapsedTime * 0.03;
    }
  });

  return (
    <mesh ref={cloudRef} scale={1.8}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial
        color="#8b5cf6"
        transparent
        opacity={0.15}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// Energy connections like neural pathways
function NeuralPathways() {
  const lines = useMemo(() => {
    const temp = [];
    for (let i = 0; i < 50; i++) {
      const start = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      );
      const end = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      );
      temp.push({ start, end });
    }
    return temp;
  }, []);

  return (
    <group>
      {lines.map((line, i) => (
        <Line key={i} start={line.start} end={line.end} />
      ))}
    </group>
  );
}

function Line({ start, end }) {
  const ref = useRef();

  useFrame((state) => {
    if (ref.current) {
      ref.current.material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 2 + start.x) * 0.2;
    }
  });

  const points = useMemo(() => [start, end], [start, end]);
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    return geom;
  }, [points]);

  return (
    <line ref={ref} geometry={geometry}>
      <lineBasicMaterial
        color="#60a5fa"
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
      />
    </line>
  );
}

// The brain structure itself
function Brain() {
  const brainRef = useRef();

  useFrame((state) => {
    if (brainRef.current) {
      brainRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <mesh ref={brainRef}>
      <sphereGeometry args={[2, 64, 64]} />
      <MeshDistortMaterial
        color="#1e1b4b"
        transparent
        opacity={0.3}
        distort={0.4}
        speed={2}
        roughness={0.4}
        metalness={0.8}
        envMapIntensity={1}
      />
    </mesh>
  );
}

// Galaxy spirals
function GalaxySpiral() {
  const galaxyRef = useRef();

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < 1000; i++) {
      const angle = (i / 1000) * Math.PI * 4;
      const radius = (i / 1000) * 2;
      const x = Math.cos(angle) * radius;
      const y = (Math.random() - 0.5) * 0.3;
      const z = Math.sin(angle) * radius;
      temp.push(x, y, z);
    }
    return new Float32Array(temp);
  }, []);

  useFrame((state) => {
    if (galaxyRef.current) {
      galaxyRef.current.rotation.y = state.clock.elapsedTime * 0.08;
    }
  });

  return (
    <points ref={galaxyRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.length / 3}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#ec4899"
        sizeAttenuation
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Main scene
function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#60a5fa" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ec4899" />

      <Brain />
      <CosmicParticles />
      <NebulaClouds />
      <NeuralPathways />
      <GalaxySpiral />

      <OrbitControls
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        autoRotate={false}
        minDistance={3}
        maxDistance={15}
      />
    </>
  );
}

// Main component
export default function UniverseBrain() {
  return (
    <div style={{ width: '100%', height: '100vh', background: '#000000' }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 75 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}

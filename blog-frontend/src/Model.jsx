import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshTransmissionMaterial, Float } from "@react-three/drei";

export default function Model(props) {
  const group = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (!group.current) return;
    group.current.rotation.z = Math.sin(t * 0.3) * 0.15;
    group.current.position.y = Math.sin(t * 0.5) * 0.08;
  });

  return (
    <group ref={group} {...props}>
      <Float speed={1.2} rotationIntensity={0.8} floatIntensity={1.5}>
        <mesh>
          <torusKnotGeometry args={[1.1, 0.38, 200, 32]} />
          <MeshTransmissionMaterial
            thickness={2}
            roughness={0.05}
            transmission={1}
            ior={1.5}
            chromaticAberration={0.12}
            backside
            backsideThickness={1}
            color="#a080ff"
            attenuationColor="#7850ff"
            attenuationDistance={0.5}
            envMapIntensity={2}
          />
        </mesh>
      </Float>
    </group>
  );
}

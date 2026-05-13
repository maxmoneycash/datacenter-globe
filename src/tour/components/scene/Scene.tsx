"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Environment, ContactShadows } from "@react-three/drei";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { DataCenter } from "./DataCenter";
import { CameraRig } from "./CameraRig";
import { Hotspots } from "./Hotspots";

export function Scene() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{
        antialias: true,
        toneMapping: ACESFilmicToneMapping,
        outputColorSpace: SRGBColorSpace,
        logarithmicDepthBuffer: true,
      }}
      camera={{ position: [55, 38, 70], fov: 38, near: 0.3, far: 500 }}
      className="!absolute inset-0"
    >
      <color attach="background" args={["#07090d"]} />
      <fog attach="fog" args={["#07090d", 80, 220]} />

      <ambientLight intensity={0.52} />
      <hemisphereLight intensity={0.38} args={["#bcd0ff", "#0a0d12", 0.6]} />
      <directionalLight
        position={[40, 60, 30]}
        intensity={1.4}
        color="#fff7ea"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={200}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />

      <Suspense fallback={null}>
        <Environment preset="night" environmentIntensity={0.25} />

        <DataCenter />
        <Hotspots />

        <ContactShadows
          position={[0, 0.01, 0]}
          opacity={0.55}
          scale={120}
          blur={2.4}
          far={20}
        />
      </Suspense>

      <CameraRig />

      <EffectComposer multisampling={0}>
        <Bloom
          intensity={0.42}
          luminanceThreshold={0.88}
          luminanceSmoothing={0.22}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.18} darkness={0.72} />
      </EffectComposer>
    </Canvas>
  );
}

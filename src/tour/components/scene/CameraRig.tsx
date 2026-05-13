"use client";
/* eslint-disable react-hooks/immutability */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Vector3, type PerspectiveCamera } from "three";
import { useAppStore } from "@tour/lib/store";
import { TOUR_STOPS } from "@tour/lib/tour";
import { easeInOutCubic, lerp } from "@tour/lib/camera";
import { MODULES_BY_ID } from "@tour/lib/modules";
import type { FlowAnimId } from "@tour/lib/types";

const tmpFrom = new Vector3();
const tmpTo = new Vector3();

const FREE_TARGETS: Record<string, { position: [number, number, number]; target: [number, number, number]; fov: number }> = {
  site: { position: [55, 38, 70], target: [0, 4, 0], fov: 38 },
  power: { position: [-30, 14, 38], target: [-22, 4, 8], fov: 36 },
  cooling: { position: [34, 16, 36], target: [22, 4, 6], fov: 36 },
  hall: { position: [0, 22, 22], target: [0, 3, -2], fov: 38 },
  rack: { position: [-3.5, 4.2, 5.5], target: [0, 1.8, -2], fov: 32 },
  /** Tray + NVLink: pulled back ~2× vs old shot so the tray reads in rack context */
  node: {
    position: [6.2, 5.4, 5.2],
    target: [0, 3.08, -1.65],
    fov: 36,
  },
  network: { position: [0, 16, 18], target: [0, 6, -10], fov: 38 },
  storage: { position: [22, 8, 18], target: [16, 3, -8], fov: 36 },
};

export function CameraRig() {
  const { camera } = useThree();
  const persp = camera as PerspectiveCamera;

  const orbitRef = useRef<OrbitControlsImpl>(null);

  const tween = useRef({
    fromPos: new Vector3(55, 38, 70),
    toPos: new Vector3(55, 38, 70),
    fromTarget: new Vector3(0, 4, 0),
    toTarget: new Vector3(0, 4, 0),
    fromFov: 38,
    toFov: 38,
    t: 1,
    duration: 1,
    activeStopId: "site" as string,
  });

  const triggeredRef = useRef<Set<number>>(new Set());

  const dwellTimerRef = useRef(0);

  const stops = useMemo(() => TOUR_STOPS, []);

  const beginTransition = (
    toPos: [number, number, number],
    toTarget: [number, number, number],
    toFov: number,
    durationMs: number,
    stopId: string,
  ) => {
    tween.current.fromPos.copy(persp.position);
    tween.current.toPos.set(...toPos);
    if (orbitRef.current) {
      tween.current.fromTarget.copy(orbitRef.current.target);
    } else {
      tween.current.fromTarget.copy(tween.current.toTarget);
    }
    tween.current.toTarget.set(...toTarget);
    tween.current.fromFov = persp.fov;
    tween.current.toFov = toFov;
    tween.current.t = 0;
    tween.current.duration = Math.max(0.001, durationMs / 1000);
    tween.current.activeStopId = stopId;
    triggeredRef.current.clear();
  };

  const lastTourStepRef = useRef<number>(-1);
  const lastModeRef = useRef<"tour" | "free">("tour");
  const lastFocusedRef = useRef<string | null>(null);
  /** Free-orbit snapshot before flying to a module shot — reapplied when detail closes while staying in Explore. */
  const restoreOrbitRef = useRef<{
    position: Vector3;
    target: Vector3;
    fov: number;
  } | null>(null);

  useEffect(() => {
    const unsub = useAppStore.subscribe((s) => {
      const prevFocus = lastFocusedRef.current;

      if (
        s.mode === "tour" &&
        (s.tourStep !== lastTourStepRef.current ||
          lastModeRef.current !== "tour")
      ) {
        const stop = stops[s.tourStep];
        if (stop) {
          beginTransition(
            stop.position,
            stop.target,
            stop.fov,
            stop.transitionMs,
            stop.id,
          );
          dwellTimerRef.current = 0;
        }
        lastTourStepRef.current = s.tourStep;
      }

      if (s.mode !== "free") {
        restoreOrbitRef.current = null;
      } else if (orbitRef.current) {
        if (
          s.focusedModuleId &&
          s.focusedModuleId !== prevFocus &&
          FREE_TARGETS[s.focusedModuleId]
        ) {
          if (prevFocus === null) {
            restoreOrbitRef.current = {
              position: persp.position.clone(),
              target: orbitRef.current.target.clone(),
              fov: persp.fov,
            };
          }
          const t = FREE_TARGETS[s.focusedModuleId];
          beginTransition(t.position, t.target, t.fov, 1200, s.focusedModuleId);
        }
        if (
          !s.focusedModuleId &&
          prevFocus !== null &&
          !s.detailOpen &&
          restoreOrbitRef.current
        ) {
          const r = restoreOrbitRef.current;
          beginTransition(
            [r.position.x, r.position.y, r.position.z],
            [r.target.x, r.target.y, r.target.z],
            r.fov,
            1200,
            "orbit-restore",
          );
          restoreOrbitRef.current = null;
        }
      }

      if (s.mode === "free" && lastModeRef.current !== "free") {
        if (orbitRef.current) {
          orbitRef.current.target.copy(tween.current.toTarget);
          orbitRef.current.update();
        }
      }

      lastModeRef.current = s.mode;
      lastFocusedRef.current = s.focusedModuleId;
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persp, stops]);

  useEffect(() => {
    const initial = stops[0];
    persp.position.set(...initial.position);
    persp.fov = initial.fov;
    persp.updateProjectionMatrix();
    tween.current.fromPos.copy(persp.position);
    tween.current.toPos.copy(persp.position);
    tween.current.fromTarget.set(...initial.target);
    tween.current.toTarget.set(...initial.target);
    tween.current.fromFov = persp.fov;
    tween.current.toFov = persp.fov;
    tween.current.t = 1;
    tween.current.activeStopId = initial.id;
    if (orbitRef.current) {
      orbitRef.current.target.set(...initial.target);
      orbitRef.current.update();
    }
  }, [persp, stops]);

  useFrame((_, dt) => {
    const s = useAppStore.getState();
    if (s.mode === "tour" && orbitRef.current) {
      orbitRef.current.enabled = false;
    }
    if (s.mode === "free" && orbitRef.current) {
      orbitRef.current.enabled = true;
    }

    if (tween.current.t < 1) {
      tween.current.t = Math.min(
        1,
        tween.current.t + dt / tween.current.duration,
      );
      const u = easeInOutCubic(tween.current.t);
      tmpFrom.copy(tween.current.fromPos).lerp(tween.current.toPos, u);
      persp.position.copy(tmpFrom);
      tmpTo.copy(tween.current.fromTarget).lerp(tween.current.toTarget, u);
      persp.lookAt(tmpTo);
      persp.fov = lerp(tween.current.fromFov, tween.current.toFov, u);
      persp.updateProjectionMatrix();
      if (orbitRef.current) {
        orbitRef.current.target.copy(tmpTo);
      }
      if (s.mode === "tour" && tween.current.t >= 1) {
        if (s.tourPhase !== "paused") {
          s.setTourPhase("dwell");
        }
        dwellTimerRef.current = 0;
        const stop = stops[s.tourStep];
        if (stop?.triggerAnims) {
          s.triggerAnims(stop.triggerAnims);
        }
        if (stop?.kind === "module") {
          const moduleMeta = MODULES_BY_ID[stop.id as keyof typeof MODULES_BY_ID];
          const moduleAnim = moduleMeta?.anim as FlowAnimId | undefined;
          if (moduleAnim && !stop.triggerAnims?.includes(moduleAnim)) {
            s.triggerAnim(moduleAnim);
          }
        }
      }
    } else if (s.mode === "tour" && s.isPlaying) {
      dwellTimerRef.current += dt * 1000;
      const stop = stops[s.tourStep];
      if (stop && dwellTimerRef.current >= stop.dwellMs) {
        if (s.tourStep < stops.length - 1) {
          s.nextStop();
        } else {
          s.togglePlay();
        }
      }
    }

    if (s.mode === "free" && tween.current.t >= 1 && orbitRef.current) {
      // OrbitControls handles position; nothing to do
    }
  });

  return (
    <OrbitControls
      ref={orbitRef}
      makeDefault
      enabled={false}
      enableDamping
      dampingFactor={0.08}
      enablePan
      minDistance={2}
      maxDistance={150}
      maxPolarAngle={Math.PI / 2 - 0.05}
      minPolarAngle={0.05}
    />
  );
}

"use client";

import { Html } from "@react-three/drei";
import { motion } from "framer-motion";
import { useAppStore } from "@tour/lib/store";
import type { Object3D } from "three";
import type { Camera } from "three";
import type { ComponentProps } from "react";

const DOCK_X = 16;
const DOCK_TOP = 76;

export type LayerHtmlProps = ComponentProps<typeof Html> & {
  /** Extra downward offset when multiple HUDs are stacked in one layer (px). */
  dockStackOffset?: number;
  /** Enable drag when docked (default true). Set false for tiny badges. */
  draggableWhenDocked?: boolean;
};

/**
 * Wraps drei's `Html` for telemetry HUDs. When the guided tour has the
 * verification side panel open, floating 3D billboards would otherwise map to
 * the same screen region as that panel — so we pin HUDs to the left edge with
 * an explicit `calculatePosition`, and optionally make them draggable.
 */
export function LayerHtml({
  dockStackOffset = 0,
  draggableWhenDocked = true,
  style,
  children,
  ...rest
}: LayerHtmlProps) {
  const dockHud = useAppStore(
    (s) => s.mode === "tour" && s.layerPanelOpen,
  );

  const calculatePosition = (
    _el: Object3D,
    _camera: Camera,
    _size: { width: number; height: number },
  ): [number, number] => {
    void _el;
    void _camera;
    void _size;
    return [DOCK_X, DOCK_TOP + dockStackOffset];
  };

  const baseStyle: React.CSSProperties = {
    ...style,
    ...(dockHud
      ? {
          pointerEvents: draggableWhenDocked ? "auto" : "none",
          transform: "none",
        }
      : { pointerEvents: "none" }),
  };

  const wrapped =
    dockHud && draggableWhenDocked ? (
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.12}
        dragConstraints={{ left: -300, right: 380, top: -72, bottom: 260 }}
        whileDrag={{ cursor: "grabbing" }}
        style={{ cursor: "grab", touchAction: "none" }}
      >
        {children}
      </motion.div>
    ) : (
      children
    );

  return (
    <Html
      {...rest}
      {...(dockHud ? { calculatePosition } : {})}
      style={baseStyle}
    >
      {wrapped}
    </Html>
  );
}

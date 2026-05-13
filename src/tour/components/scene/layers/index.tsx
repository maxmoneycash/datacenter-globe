"use client";

// Slice 0 (the three vertical-slice layers we built first)
import { GPUUtilLayer } from "./GPUUtilLayer";
import { CoolingTelemetryLayer } from "./CoolingTelemetryLayer";
import { SatelliteLayer } from "./SatelliteLayer";

// Batch A — Control plane
import { HardwareInventoryLayer } from "./HardwareInventoryLayer";
import { SchedulerLayer } from "./SchedulerLayer";
import { CloudBillingLayer } from "./CloudBillingLayer";

// Batch B — Hardware telemetry
import { GPUProfileLayer } from "./GPUProfileLayer";
import { NVLinkCountersLayer } from "./NVLinkCountersLayer";
import { FabricCountersLayer } from "./FabricCountersLayer";

// Batch C — Facility
import { RackPowerLayer } from "./RackPowerLayer";

// Batch D — Software
import { HostProcessLayer } from "./HostProcessLayer";
import { ObjectAccessLayer } from "./ObjectAccessLayer";
import { MLTrainingLayer } from "./MLTrainingLayer";

// Batch E — Verify (cryptographic + active probe)
import { AttestationLayer } from "./AttestationLayer";
import { ChallengeProbeLayer } from "./ChallengeProbeLayer";

/**
 * Mounts every implemented telemetry/verification layer. Each layer
 * internally checks `useActiveLayerId()` and renders nothing when its layer
 * is not the active tour stop, so this list is cheap to keep in the scene.
 */
export function LayerOverlays() {
  return (
    <>
      {/* Control plane */}
      <HardwareInventoryLayer />
      <SchedulerLayer />
      <CloudBillingLayer />

      {/* Hardware telemetry */}
      <GPUUtilLayer />
      <GPUProfileLayer />
      <NVLinkCountersLayer />
      <FabricCountersLayer />

      {/* Facility */}
      <RackPowerLayer />
      <CoolingTelemetryLayer />

      {/* Software & data */}
      <HostProcessLayer />
      <ObjectAccessLayer />
      <MLTrainingLayer />

      {/* Verify */}
      <AttestationLayer />
      <ChallengeProbeLayer />

      {/* External */}
      <SatelliteLayer />
    </>
  );
}

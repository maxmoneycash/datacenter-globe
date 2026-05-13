import type { CameraStop } from "./types";

/**
 * The first 8 stops are the physical-tour modules ("Chapter 1: The Building").
 * Stops 9–23 are the 15 telemetry / verification layers
 * ("Chapter 2: The Verifiable Stack"), played back as continuations of the
 * same camera-driven tour.
 */
export const TOUR_STOPS: CameraStop[] = [
  // ── Chapter 1: The Building ─────────────────────────────────────────────
  {
    kind: "module",
    id: "site",
    position: [55, 38, 70],
    target: [0, 4, 0],
    fov: 38,
    dwellMs: 6500,
    transitionMs: 2500,
    caption:
      "Welcome. This is a modern AI data center — a building that turns electricity into intelligence.",
  },
  {
    kind: "module",
    id: "power",
    position: [-30, 14, 38],
    target: [-22, 4, 8],
    fov: 36,
    dwellMs: 6500,
    transitionMs: 2400,
    caption:
      "Utility power arrives here, gets stepped down, and is battery-buffered before it reaches a single GPU.",
    triggerAnims: ["powerPulse"],
  },
  {
    kind: "module",
    id: "cooling",
    position: [34, 16, 36],
    target: [22, 4, 6],
    fov: 36,
    dwellMs: 6500,
    transitionMs: 2400,
    caption:
      "Outside the building, cooling towers reject the heat that the GPUs are about to make.",
    triggerAnims: ["coolantFlow"],
  },
  {
    kind: "module",
    id: "hall",
    position: [0, 22, 22],
    target: [0, 3, -2],
    fov: 38,
    dwellMs: 6500,
    transitionMs: 2400,
    caption:
      "Inside, the compute hall: hundreds of identical racks arranged in cold and hot aisles.",
  },
  {
    kind: "module",
    id: "rack",
    position: [-3.5, 4.2, 5.5],
    target: [0, 1.8, -2],
    fov: 32,
    dwellMs: 7000,
    transitionMs: 2400,
    caption:
      "One rack — NVIDIA GB200 NVL72 — packs 72 Blackwell GPUs into a single liquid-cooled cabinet.",
    explode: 0.7,
  },
  {
    kind: "module",
    id: "node",
    position: [6.2, 5.4, 5.2],
    target: [0.0, 3.08, -1.65],
    fov: 36,
    dwellMs: 7000,
    transitionMs: 2400,
    caption:
      "Inside a tray: 4 GPUs and 2 CPUs, wired together by NVLink at 1.8 TB/s per GPU.",
    triggerAnims: ["nvlinkPackets"],
    explode: 0.45,
  },
  {
    kind: "module",
    id: "network",
    position: [0, 16, 18],
    target: [0, 6, -10],
    fov: 38,
    dwellMs: 6500,
    transitionMs: 2400,
    caption:
      "Beyond a single rack, a spine-leaf network ties thousands of GPUs into one coherent training cluster.",
    triggerAnims: ["fabricPackets"],
  },
  {
    kind: "module",
    id: "storage",
    position: [22, 8, 18],
    target: [16, 3, -8],
    fov: 36,
    dwellMs: 6500,
    transitionMs: 2400,
    caption:
      "And finally, storage — petabytes of flash feeding the data the GPUs are hungry for.",
  },

  // ── Chapter 2: The Verifiable Stack ─────────────────────────────────────
  {
    kind: "layer",
    id: "hw-inventory",
    position: [4, 14, 14],
    target: [0, 2, -2],
    fov: 36,
    dwellMs: 6500,
    transitionMs: 2400,
    caption:
      "Every chip and switch in here has a serial number — and a row in an asset database.",
  },
  {
    kind: "layer",
    id: "scheduler",
    position: [4.5, 13, 12],
    target: [0, 3.2, -2],
    fov: 36,
    dwellMs: 6500,
    transitionMs: 2400,
    caption:
      "The scheduler is the air-traffic logbook: who got which GPUs, when, for how long.",
  },
  {
    kind: "layer",
    id: "cloud-billing",
    position: [-12, 10, 22],
    target: [-10, 2, 0],
    fov: 38,
    dwellMs: 6500,
    transitionMs: 2400,
    caption:
      "Cloud API and billing logs — the one signal an operator is structurally motivated to keep accurate.",
  },
  {
    kind: "layer",
    id: "gpu-util",
    position: [3.6, 3.9, 2.6],
    target: [-0.1, 3.4, -1.6],
    fov: 32,
    dwellMs: 7000,
    transitionMs: 2400,
    caption:
      "Per-GPU live signals: utilization, power, memory, temperature — a kilowatt-scale dashboard for every chip.",
  },
  {
    kind: "layer",
    id: "gpu-profile",
    position: [3.6, 4.0, 2.4],
    target: [-0.2, 3.2, -1.5],
    fov: 32,
    dwellMs: 6500,
    transitionMs: 2400,
    caption:
      "Hardware performance counters fingerprint the workload — matmul vs memcpy, training vs inference.",
  },
  {
    kind: "layer",
    id: "nvlink-counters",
    position: [-2.35, 3.05, 0.85],
    target: [0, 3.05, -2],
    fov: 30,
    dwellMs: 6500,
    transitionMs: 2400,
    caption:
      "Inside the rack, NVSwitch ASICs count every byte that moves between GPUs — terabytes per second during all-reduce.",
    triggerAnims: ["nvlinkPackets"],
  },
  {
    kind: "layer",
    id: "fabric-counters",
    position: [0, 16, 14],
    target: [0, 6, -10],
    fov: 38,
    dwellMs: 6500,
    transitionMs: 2400,
    caption:
      "Across racks, leaf and spine switch counters watch the East-West storm of training traffic.",
    triggerAnims: ["fabricPackets"],
  },
  {
    kind: "layer",
    id: "rack-power",
    position: [-3.2, 5.5, 6.5],
    target: [0, 3, -2],
    fov: 34,
    dwellMs: 6500,
    transitionMs: 2400,
    caption:
      "Smart PDUs read every rack in real time — and the utility's revenue meter reads the whole campus.",
    triggerAnims: ["powerPulse"],
  },
  {
    kind: "layer",
    id: "cooling-telemetry",
    position: [26.5, 11.5, 22],
    target: [20.5, 2.85, 5.75],
    fov: 36,
    dwellMs: 6500,
    transitionMs: 2400,
    caption:
      "Coolant flow and ΔT must match electrical input — heat that goes in has to come out.",
    triggerAnims: ["coolantFlow"],
  },
  {
    kind: "layer",
    id: "host-process",
    position: [3, 4, 4],
    target: [0, 2.95, -2],
    fov: 31,
    dwellMs: 6500,
    transitionMs: 2400,
    caption:
      "Below the GPU sits a host: kernel, containers, processes — anchored only as deeply as the boot chain is.",
  },
  {
    kind: "layer",
    id: "object-access",
    position: [20.5, 7, 10],
    target: [16, 4, -7],
    fov: 37,
    dwellMs: 6500,
    transitionMs: 2400,
    caption:
      "Every read against the dataset bucket leaves a line — petabytes of training data, all logged.",
  },
  {
    kind: "layer",
    id: "ml-training",
    position: [4.75, 5.75, 7.85],
    target: [0, 3.15, -2],
    fov: 34,
    dwellMs: 6500,
    transitionMs: 2400,
    caption:
      "The job itself talks back — loss curves, eval scores, checkpoint hashes that a third party can replay.",
  },
  {
    kind: "layer",
    id: "attestation",
    position: [2.95, 3.95, 2.95],
    target: [0, 3.05, -2],
    fov: 31,
    dwellMs: 6500,
    transitionMs: 2400,
    caption:
      "Hardware signs a statement about what code is running — the only signal in here that does not require trusting the operator.",
  },
  {
    kind: "layer",
    id: "challenge-probe",
    position: [12, 8, 18],
    target: [0, 2, -2],
    fov: 38,
    dwellMs: 7000,
    transitionMs: 2400,
    caption:
      "An external auditor sends a fresh nonce. Live, signed, hardware-rooted answer comes back.",
  },
  {
    kind: "layer",
    id: "satellite",
    position: [60, 90, 80],
    target: [0, 4, 0],
    fov: 30,
    dwellMs: 7500,
    transitionMs: 3000,
    caption:
      "From orbit you cannot hide a 100 MW substation, a thermal plume, or a customs ledger — public signals anchor everything else.",
  },
];

export const TOTAL_TOUR_MS = TOUR_STOPS.reduce(
  (sum, s) => sum + s.transitionMs + s.dwellMs,
  0,
);

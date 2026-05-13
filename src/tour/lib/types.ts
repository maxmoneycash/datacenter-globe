export type ModuleId =
  | "site"
  | "power"
  | "cooling"
  | "hall"
  | "rack"
  | "node"
  | "network"
  | "storage";

export type LayerId =
  | "hw-inventory"
  | "scheduler"
  | "cloud-billing"
  | "gpu-util"
  | "gpu-profile"
  | "nvlink-counters"
  | "fabric-counters"
  | "rack-power"
  | "cooling-telemetry"
  | "host-process"
  | "object-access"
  | "ml-training"
  | "attestation"
  | "challenge-probe"
  | "satellite";

export type StopId = ModuleId | LayerId;

export type LayerCategory =
  | "control" // operator's planning systems
  | "hardware" // signals from chips and switches
  | "facility" // building-level signals
  | "software" // host & application logs
  | "verify" // crypto + external trust signals
  | "external"; // signals from outside the operator entirely

export type FlowAnimId =
  | "coolantFlow"
  | "nvlinkPackets"
  | "fabricPackets"
  | "powerPulse";

export type StopKind = "module" | "layer";

export type CameraStop = {
  id: StopId;
  kind: StopKind;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  dwellMs: number;
  transitionMs: number;
  caption: string;
  triggerAnims?: FlowAnimId[];
  explode?: number;
};

export type DetailFact = {
  label: string;
  value: string;
};

export type DetailSection = {
  heading?: string;
  body: string;
};

export type ColorKey =
  | "compute"
  | "cooling"
  | "power"
  | "nvlink"
  | "fabric"
  | "storage"
  | "shell"
  | "verify";

type CommonStopMeta = {
  label: string;
  shortDesc: string;
  metaphor: string;
  facts: DetailFact[];
  comparison: string;
  sections: DetailSection[];
  glossary?: { term: string; def: string }[];
  colorKey: ColorKey;
};

export type ModuleMeta = CommonStopMeta & {
  kind: "module";
  id: ModuleId;
  index: number;
  anim?: FlowAnimId;
};

/**
 * A telemetry / verification "layer". Each layer is a distinct stream of data
 * that observers might use to figure out what is happening inside the building.
 * The verification triple (whoCanSee / howToFake / howToVerify) is the heart
 * of the educational story.
 */
export type LayerMeta = CommonStopMeta & {
  kind: "layer";
  id: LayerId;
  index: number;
  category: LayerCategory;
  /** Who (operator / cloud customer / external auditor / public) can see this signal at all. */
  whoCanSee: string;
  /** How an operator could in principle fabricate or shape this signal. */
  howToFake: string;
  /** What it takes to verify the signal independently. */
  howToVerify: string;
  /** True if the signal can be cryptographically or physically attested to an outside party. */
  attestable: boolean;
};

export type StopMeta = ModuleMeta | LayerMeta;

export type AppMode = "tour" | "free";
export type TourPhase = "transition" | "dwell" | "paused";

import type { LayerCategory, LayerMeta } from "./types";

/**
 * The 15 telemetry / verification layers, in roughly the order signals are
 * generated as a job runs through the data center: control-plane decisions
 * first, then hardware/software runtime telemetry, then the cryptographic
 * and external signals an outside auditor can use to cross-check everything.
 *
 * Index in this list = its position in the extended tour, after the 8
 * physical modules. Existing modules occupy indices 0..7 in the tour;
 * these layers occupy 8..22.
 */
export const LAYERS: LayerMeta[] = [
  {
    kind: "layer",
    id: "hw-inventory",
    index: 0,
    category: "control",
    label: "Hardware Inventory",
    colorKey: "compute",
    attestable: false,
    shortDesc:
      "Every chip, switch, and PSU has a serial number tracked in an asset database.",
    metaphor:
      "Like a hotel knowing which rooms have which beds — except the beds cost $40,000 each and need to be liquid-cooled.",
    facts: [
      { label: "Items per site", value: "~10⁵ – 10⁶ rows" },
      { label: "Update freq.", value: "On install / RMA / sweep" },
      { label: "Source of truth", value: "DCIM + cloud control plane" },
    ],
    comparison:
      "If a single GPU goes missing, this is the database that can tell you exactly which rack and tray it lived in.",
    sections: [
      {
        heading: "What the operator sees",
        body: "A relational database of every component: GPU model, serial, MAC, NVLink fabric ID, host UUID, rack and slot, install date, firmware builds. Most operators reconcile this against a physical asset scan and the cloud control plane.",
      },
      {
        heading: "Why it matters for verification",
        body: "Inventory is the spine that all other signals get joined against. If an external auditor does not believe the inventory, no amount of GPU-level telemetry will convince them either.",
      },
    ],
    whoCanSee: "The operator. Sometimes regulators under contract. Not customers.",
    howToFake:
      "Trivial — it is just rows in a database. The signature of a real inventory is its consistency with everything else (firmware logs, serial-number probes, customs records).",
    howToVerify:
      "Cross-check serials against on-chip TPM/PUF responses, against vendor sales records, and against import/customs filings. A spot physical audit reconciles the database against the racks.",
  },
  {
    kind: "layer",
    id: "scheduler",
    index: 1,
    category: "control",
    label: "Scheduler / Job Allocation",
    colorKey: "compute",
    attestable: false,
    shortDesc:
      "Slurm/Kubernetes/Kueue records of which job ran on which GPUs, when, and for how long.",
    metaphor:
      "Like an air-traffic controller's logbook — every takeoff and landing of every job, on every runway.",
    facts: [
      { label: "Granularity", value: "Per-GPU, per-second" },
      { label: "Common stacks", value: "Slurm, Kueue, Run:ai, k8s" },
      { label: "Retention", value: "Months to years" },
    ],
    comparison:
      "A single large training run is one row in the scheduler — but its GPU-second cost is bigger than most companies' entire AWS bill.",
    sections: [
      {
        heading: "What is logged",
        body: "Job ID, submitter, requested GPU count, allocated nodes/GPUs, start/end timestamps, exit code, queue priority, container image hash. Most schedulers also export Prometheus metrics for queue depth and utilization.",
      },
      {
        heading: "What it does not say",
        body: "The scheduler tells you how much compute time was reserved — not what the GPUs actually computed. A job can sit in a tight loop or run a real model and the scheduler cannot tell the difference.",
      },
    ],
    whoCanSee:
      "Operator and (in cloud) the customer who owns the job. External auditors only with cooperation.",
    howToFake:
      "Easy — log lines are just text. Operators can rewrite or omit jobs after the fact unless logs are append-only and signed.",
    howToVerify:
      "Use append-only signed logs (transparency-log style); cross-correlate with billing records, GPU utilization curves, and network volume. A faked job leaves no power-curve fingerprint.",
  },
  {
    kind: "layer",
    id: "cloud-billing",
    index: 2,
    category: "control",
    label: "Cloud API & Billing Logs",
    colorKey: "power",
    attestable: false,
    shortDesc:
      "Every API call against the cloud control plane and every meter that ends up on an invoice.",
    metaphor:
      "The cloud's electricity meter and credit-card receipt rolled into one — which customer rented which capacity, when, and for how long.",
    facts: [
      { label: "Coverage", value: "Auth, provisioning, scaling, IO" },
      { label: "Common standard", value: "FOCUS billing schema" },
      { label: "Retention", value: "Years (compliance)" },
    ],
    comparison:
      "A single AI training run can cost $10–100M; the billing records are usually the most complete trace of who did what at the macro level.",
    sections: [
      {
        heading: "What it captures",
        body: "Every signed API request (CreateInstance, AssignGPU, ReadObject, …), the principal making it, the resource it touched, and the metered quantity (GPU-hours, GiB egress, request count) that ends up on an invoice.",
      },
      {
        heading: "Why it is uniquely strong evidence",
        body: "Billing is the one signal an operator is structurally motivated to keep accurate — under-billing loses revenue, over-billing loses customers. So even when other logs are sloppy, the billing ledger usually is not.",
      },
    ],
    whoCanSee: "Operator and the billed customer. Tax/regulatory bodies on request.",
    howToFake:
      "Hard within the operator's own books (would mean lying to themselves and to tax authorities), trivial if the goal is to fool an outside party who only sees a PDF invoice.",
    howToVerify:
      "Cross-check invoices against the customer's own logs and bank statements; compare aggregate GPU-hours against power draw; subpoena tax filings.",
  },
  {
    kind: "layer",
    id: "gpu-util",
    index: 3,
    category: "hardware",
    label: "GPU Utilization / Power / Memory",
    colorKey: "compute",
    attestable: true,
    shortDesc:
      "Per-GPU live signals: SM activity, board power, memory used, temperature.",
    metaphor:
      "Like a car's dashboard — RPM, fuel use, oil temperature — except every GPU is a 1 kW engine and there are 100,000 of them.",
    facts: [
      { label: "Sample rate", value: "1 – 100 Hz typical" },
      { label: "Source", value: "DCGM / NVML / nvidia-smi" },
      { label: "Per-GPU power", value: "300 – 1200 W on B200" },
    ],
    comparison:
      "Idle vs. fully training a Blackwell GPU differs by ~800 W — a power signature visible all the way out at the substation.",
    sections: [
      {
        heading: "What the signals look like",
        body: "DCGM exports gpu_utilization, sm_active, fb_used (HBM memory), power_usage_watts, gpu_temperature, and many more. Most operators scrape it into Prometheus and graph it in Grafana.",
      },
      {
        heading: "From this you can infer",
        body: "Whether a GPU is computing at all, what fraction of its SMs are busy, whether it is bandwidth-bound vs. compute-bound, and roughly what kind of workload it is running (training has a very different signature from inference).",
      },
    ],
    whoCanSee:
      "The host with root, the operator's monitoring stack, and (with care) the workload's owner. External auditors only via attestation.",
    howToFake:
      "Software metrics can be replaced wholesale by anyone with root on the host. Real-world fakes get caught because they fail to track other physically tied signals (rack power, cooling load).",
    howToVerify:
      "Run DCGM inside a confidential VM with attested boot; correlate aggregated GPU power against rack-PDU and facility power; spot-check with active challenge probes.",
  },
  {
    kind: "layer",
    id: "gpu-profile",
    index: 4,
    category: "hardware",
    label: "GPU Profiling Counters",
    colorKey: "compute",
    attestable: true,
    shortDesc:
      "Hardware performance counters: tensor-core ops, HBM bytes moved, NVLink utilization, kernel timings.",
    metaphor:
      "X-ray of what the GPU is actually doing inside — not 'is it busy?' but 'is it doing matmul or wasting cycles on memcpy?'",
    facts: [
      { label: "Source", value: "CUPTI / Nsight / perfworks" },
      { label: "Granularity", value: "Per-kernel, per-SM" },
      { label: "Volume", value: "MB/s per GPU when on" },
    ],
    comparison:
      "Profiling counters are how you can tell a real LLM training job from a synthetic that just spins the chip — the FLOP/byte ratios are very different.",
    sections: [
      {
        heading: "What you get",
        body: "Tensor-core utilization, FP8/FP16 op counts, HBM read/write bytes, NVLink TX/RX, L2 cache hits, warp stall reasons. Tools like Nsight Compute show this per-kernel.",
      },
      {
        heading: "Why it is fingerprint-grade",
        body: "Each model architecture has a characteristic profile: transformer training has a known ratio of tensor-core ops to NVLink traffic; an attacker faking this signature would essentially have to actually run the model.",
      },
    ],
    whoCanSee: "Host owner with root or with kernel-mode driver access. Rare in production at scale.",
    howToFake:
      "Counters are GPU-internal hardware registers, but the values reported to userland are read by the driver — a malicious driver can in principle lie.",
    howToVerify:
      "Use signed driver and attested kernel; sample randomly via active challenge probes; compare implied power use against rack PDU.",
  },
  {
    kind: "layer",
    id: "nvlink-counters",
    index: 5,
    category: "hardware",
    label: "NVLink / NVSwitch Counters",
    colorKey: "nvlink",
    attestable: true,
    shortDesc:
      "Bytes per second moving between GPUs inside a rack, measured at the switch fabric.",
    metaphor:
      "Like the toll-booth log on a private highway between GPUs — every car (packet) leaves a record.",
    facts: [
      { label: "Per-link speed", value: "1.8 TB/s on Blackwell" },
      { label: "Topology", value: "All-to-all via NVSwitch" },
      { label: "Source", value: "NVSwitch SDK / NVML" },
    ],
    comparison:
      "An all-reduce step in large-model training pushes terabytes per second across NVLink — the signature is unmistakable.",
    sections: [
      {
        heading: "What is measured",
        body: "Per-port TX/RX counters on every NVSwitch ASIC: packets, bytes, error counts. NVIDIA exposes them via the NVSwitch SDK and aggregates per-rack via Mission Control.",
      },
      {
        heading: "Why it is hard to hide",
        body: "The counters live inside the switch ASIC. Faking them requires compromising the switch firmware, not just the host. And they are tightly correlated with power: NVLink is a non-trivial fraction of rack draw.",
      },
    ],
    whoCanSee: "Operator with switch admin access. Hard for external parties without cooperation.",
    howToFake:
      "Possible only by replacing switch firmware; counters do not match host-reported NVLink traffic if you do.",
    howToVerify:
      "Compare against per-host NVLink driver counters; sign the switch firmware and verify its hash; cross-check against rack power.",
  },
  {
    kind: "layer",
    id: "fabric-counters",
    index: 6,
    category: "hardware",
    label: "Scale-out Fabric Counters",
    colorKey: "fabric",
    attestable: true,
    shortDesc:
      "InfiniBand / RoCE switch counters tracking traffic between racks across the cluster.",
    metaphor:
      "If NVLink is the freeway inside a city, this is the air-traffic radar that watches the whole region.",
    facts: [
      { label: "Per-link speed", value: "400 – 800 Gb/s" },
      { label: "Common tooling", value: "UFM (IB), sFlow (Eth)" },
      { label: "Sample rate", value: "Sub-second" },
    ],
    comparison:
      "A 100,000-GPU training job moves more East-West traffic in an hour than a small ISP carries in a day.",
    sections: [
      {
        heading: "What is captured",
        body: "Per-port byte and packet counters on every leaf and spine switch, congestion notifications, link-up/down events, error counters. NVIDIA UFM aggregates the InfiniBand side; sFlow and gNMI are common for Ethernet fabrics.",
      },
      {
        heading: "Why it matters",
        body: "Different training workloads have very different collective patterns. Inference clusters look like fan-out trees; training clusters look like all-reduce rings. Both are visible from the fabric counters even with payloads encrypted.",
      },
    ],
    whoCanSee: "Operator network ops team. Customers normally see only their own VPC view.",
    howToFake:
      "Requires firmware-level tampering on every switch in the path; difficult and detectable when correlated with end-host counters.",
    howToVerify:
      "Cross-correlate switch counters with host NIC counters; sign switch firmware; sample with synthetic traffic of known volume.",
  },
  {
    kind: "layer",
    id: "rack-power",
    index: 7,
    category: "facility",
    label: "Rack & Facility Power",
    colorKey: "power",
    attestable: true,
    shortDesc:
      "Branch-circuit and PDU readings — kW per rack, plus the campus's substation totals.",
    metaphor:
      "If GPU telemetry can lie, the wall plug usually cannot — power is conservation of energy.",
    facts: [
      { label: "Per-rack draw", value: "60 – 130 kW" },
      { label: "Source", value: "Smart PDUs, UPS, BMS" },
      { label: "Sample rate", value: "1 s typical" },
    ],
    comparison:
      "Operating a 100k-GPU campus uses ~100 MW continuously — visible on the regional grid operator's books, not just the data center's.",
    sections: [
      {
        heading: "What the signals look like",
        body: "PDUs report per-outlet and per-phase current and voltage. UPS/STS report load and battery state. Building management systems aggregate to feeders and substations. Grid operators see the building as a single load.",
      },
      {
        heading: "Why it is the strongest physical signal",
        body: "Power follows physics. If your software claims a job is running but the corresponding rack is drawing 5 kW (idle), the claim is false. If software says a rack is idle but it is pulling 120 kW, something else is happening.",
      },
    ],
    whoCanSee:
      "Facility team, operator, electrical utility (aggregate). Public regulators sometimes (siting filings).",
    howToFake:
      "Rewriting the BMS log is easy. Lying to the utility about MWh consumed is not — they have their own meter and bill from it.",
    howToVerify:
      "Independent revenue meter readings from the utility; revenue-grade meters at PDUs sealed by an auditor; thermal imaging from outside.",
  },
  {
    kind: "layer",
    id: "cooling-telemetry",
    index: 8,
    category: "facility",
    label: "Cooling Telemetry",
    colorKey: "cooling",
    attestable: true,
    shortDesc:
      "Coolant flow, supply/return temperature, and pressure across the loop — heat must go somewhere.",
    metaphor:
      "A 1 kW GPU does not just glow — it has to dump 1 kW of heat into water and out a tower. The plumbing tells the story.",
    facts: [
      { label: "Per-rack flow", value: "100 – 300 L/min" },
      { label: "ΔT (in/out)", value: "~10 °C across the cold plate" },
      { label: "Source", value: "CDU / BMS" },
    ],
    comparison:
      "A fully loaded NVL72 rack rejects ~120 kW into the loop — about as much heat as 80 home space heaters running at once.",
    sections: [
      {
        heading: "What is measured",
        body: "CDUs and rack manifolds report flow rate (L/min), supply temperature, return temperature, and pressure. BMS aggregates to facility-loop totals and tower outlet temperatures.",
      },
      {
        heading: "Conservation of energy is the cross-check",
        body: "Heat rejected ≈ flow × density × specific heat × ΔT. That number must match electrical input within a few percent. If GPU power is claimed but heat output does not show up, something is wrong.",
      },
    ],
    whoCanSee:
      "Facility team, operator. Limited external visibility unless via thermal imaging or environmental permits.",
    howToFake:
      "BMS logs can be edited, but the cooling tower water temperature is observable from outside the fence.",
    howToVerify:
      "Energy balance: Q_rejected ≈ P_electrical. Independent thermal imaging of cooling towers. Sealed flow and temperature meters audited by a third party.",
  },
  {
    kind: "layer",
    id: "host-process",
    index: 9,
    category: "software",
    label: "Host / Process / Container Metadata",
    colorKey: "compute",
    attestable: true,
    shortDesc:
      "What OS, what kernel, what containers, what processes — the substrate jobs run on.",
    metaphor:
      "Like the manifest of a ship — what crew, what cargo, what software they're using to navigate.",
    facts: [
      { label: "Coverage", value: "Per host, per container" },
      { label: "Sources", value: "systemd, k8s, eBPF, audit" },
      { label: "Volume", value: "GBs/day per cluster" },
    ],
    comparison:
      "A cluster running training looks completely different from one running inference, even before you look at GPU telemetry — different binaries, different libs, different syscall mixes.",
    sections: [
      {
        heading: "What is captured",
        body: "Kernel build, OS image hash, running processes, cgroup memberships, container image digests, mounted volumes, network namespaces. eBPF and the Linux audit subsystem can export this in real time.",
      },
      {
        heading: "Why it matters for verification",
        body: "If the running OS image is attested at boot (TPM measured boot or TDX/SEV), then process metadata is anchored to a known-good substrate. Without that anchor, anything any tool reports may be shaped by a malicious kernel.",
      },
    ],
    whoCanSee: "Operator and (in cloud) the customer for their own VMs. Not external by default.",
    howToFake: "Trivial with root; the protection is to root signatures in attested boot.",
    howToVerify:
      "Measured boot via TPM or TDX/SEV; attest the kernel and OS image; ship logs to an append-only signed store.",
  },
  {
    kind: "layer",
    id: "object-access",
    index: 10,
    category: "software",
    label: "Storage / Object Access Logs",
    colorKey: "storage",
    attestable: false,
    shortDesc:
      "Every read and write against the object store the GPUs are pulling training data from.",
    metaphor:
      "Like a library checkout log — but the books are 100 TB of training data being read 50 times each.",
    facts: [
      { label: "Common standard", value: "S3 access logs / OTel" },
      { label: "Per-job volume", value: "TBs to PBs read" },
      { label: "Retention", value: "Months to years" },
    ],
    comparison:
      "A frontier-scale training run can read its dataset 10–50 times — petabytes of object reads, all logged.",
    sections: [
      {
        heading: "What is logged",
        body: "Per-request: timestamp, principal, bucket, object key (or hash), size, response code. Most operators ship the logs to a SIEM and retain for compliance.",
      },
      {
        heading: "What it can prove",
        body: "Whether a specific dataset (by key or hash) was actually read at training time, and from where. Useful for data-provenance arguments and copyright-style disputes.",
      },
    ],
    whoCanSee: "Operator and (in cloud) the bucket owner.",
    howToFake: "Edit the log. The protection is again append-only signed storage and a transparency log.",
    howToVerify:
      "Cross-check egress byte totals against fabric counters; sign the log; have the customer also keep their own request log and reconcile.",
  },
  {
    kind: "layer",
    id: "ml-training",
    index: 11,
    category: "software",
    label: "ML Training Logs",
    colorKey: "compute",
    attestable: true,
    shortDesc:
      "Loss curves, gradient norms, eval scores, checkpoints — what the model itself reports.",
    metaphor:
      "If GPU telemetry is the engine RPM, ML training logs are the speedometer — they tell you whether the trip is actually happening.",
    facts: [
      { label: "Tools", value: "W&B, MLflow, TensorBoard" },
      { label: "Granularity", value: "Per-step, per-eval" },
      { label: "Retention", value: "Per-run, archived" },
    ],
    comparison:
      "A loss curve has a recognizable shape per architecture — it is a strong fingerprint of what was actually trained.",
    sections: [
      {
        heading: "What is captured",
        body: "Per-step training loss, learning rate, gradient norms, throughput (tokens/s, samples/s), per-eval scores against benchmarks, checkpoint hashes, and run configuration.",
      },
      {
        heading: "Why it is verification-relevant",
        body: "Combined with code commit hashes and dataset hashes, training logs let an outside party reproduce a small slice of the run on their own hardware and check that loss values match — a 'spot-check the work' style audit.",
      },
    ],
    whoCanSee: "The job owner and (often) their team. External by publication only.",
    howToFake: "Generate plausible curves with simulation, but matching every cross-signal is hard.",
    howToVerify:
      "Reproduce a small subset of training steps on independent hardware from the same code+data hashes; checksum-verify checkpoints; cross-check against power and fabric volume.",
  },
  {
    kind: "layer",
    id: "attestation",
    index: 12,
    category: "verify",
    label: "Attestation Artifacts",
    colorKey: "verify",
    attestable: true,
    shortDesc:
      "Cryptographic claims, signed by hardware, about what code is actually running.",
    metaphor:
      "Like a notarized seal: not a photo of the document, but a stamp from a trusted party that says 'I saw this exact thing'.",
    facts: [
      { label: "Hardware", value: "TPM 2.0, Intel TDX, AMD SEV, NVIDIA CC" },
      { label: "Standard", value: "RA-TLS, IETF RATS, DICE" },
      { label: "Output", value: "Signed quote / report" },
    ],
    comparison:
      "Attestation is the only signal in the entire stack that does not require trusting the operator at all — only the silicon vendor.",
    sections: [
      {
        heading: "What it provides",
        body: "A signed statement, anchored in a hardware root of trust, about which firmware/OS/runtime image is running on a specific machine. Usually accompanied by per-VM measurement reports (TDX, SEV-SNP) or per-GPU reports (NVIDIA Confidential Computing).",
      },
      {
        heading: "Why it is the keystone",
        body: "All software-level signals — process logs, scheduler logs, training logs — are only as trustworthy as the OS reporting them. Attestation is what lets you anchor those reports to a known-good binary that an outsider can verify.",
      },
    ],
    whoCanSee: "Anyone, by design — quotes are meant to be presentable to a relying party.",
    howToFake:
      "Requires breaking the silicon vendor's signing key or finding a confidentiality bug in the TEE. Both are rare and well-publicized.",
    howToVerify:
      "Verify the signed quote against the vendor's root key; check measurements against an independently maintained reference value; combine with a fresh nonce.",
  },
  {
    kind: "layer",
    id: "challenge-probe",
    index: 13,
    category: "verify",
    label: "Active Challenge Probes",
    colorKey: "verify",
    attestable: true,
    shortDesc:
      "External party sends a probe → expects a hardware-signed answer that proves what is running.",
    metaphor:
      "Like calling a phone line and asking 'what's the weather there?' — the answer arrives, signed by the phone, with a fresh timestamp.",
    facts: [
      { label: "Round-trip", value: "ms to seconds" },
      { label: "Frequency", value: "Random; rate-limited" },
      { label: "Combines with", value: "Attestation + GPU profile" },
    ],
    comparison:
      "A challenge probe is the difference between 'trust me, the GPU was running this code' and 'here is a signed proof, generated 200 ms ago, that the GPU is running this code'.",
    sections: [
      {
        heading: "How it works",
        body: "An auditor sends a fresh nonce. The target executes a small attested workload (a benchmark, a known kernel) inside a TEE/Confidential GPU, then returns a signed report containing the nonce, the result, and the measurements of the running stack.",
      },
      {
        heading: "Why it raises the bar",
        body: "Static logs can be backfilled. A live challenge cannot — the auditor controls the timing and the nonce. Combined with attestation, you get evidence that is both fresh and bound to specific silicon.",
      },
    ],
    whoCanSee: "Whoever the operator agrees to expose probes to — usually a regulator or independent auditor.",
    howToFake:
      "You would need to predict the nonce or relay to a different attested machine — both detectable.",
    howToVerify:
      "Verify the signed quote inside the response; check the nonce was the one sent; check timing fits the announced location and hardware.",
  },
  {
    kind: "layer",
    id: "satellite",
    index: 14,
    category: "external",
    label: "External Satellite & Permit Data",
    colorKey: "verify",
    attestable: false,
    shortDesc:
      "Public signals from outside the operator: satellite thermal, utility filings, building permits, customs.",
    metaphor:
      "A data center cannot hide its waste heat from a satellite, or its power draw from the grid operator, or a 50 MW substation upgrade from local zoning records.",
    facts: [
      { label: "Sources", value: "Sentinel/Landsat thermal, FERC, EIA, customs" },
      { label: "Update freq.", value: "Days to weeks" },
      { label: "Cost", value: "Mostly public / cheap" },
    ],
    comparison:
      "A 100 MW facility sticks out as a hot spot in 90 m thermal pixels — visible from orbit by any third party with a free Sentinel account.",
    sections: [
      {
        heading: "What is observable from outside",
        body: "Roof thermal signature, plume of hot exhaust over cooling towers, substation construction in commercial satellite imagery, permit filings naming the operator and load, utility interconnect filings, customs records of GPU shipments.",
      },
      {
        heading: "Why it anchors everything else",
        body: "These signals do not require any cooperation from the operator at all. They form a coarse but independent baseline that the operator's much richer internal telemetry has to be consistent with.",
      },
    ],
    whoCanSee: "Anyone. Most signals are public, some require subscription or FOIA.",
    howToFake:
      "Hard to fake from the outside — would require collusion with utility, regulator, customs, and ESA/USGS satellite operators simultaneously.",
    howToVerify:
      "Pull the data yourself. Cross-check the operator's reported GPU population against customs imports and the campus's reported MW against utility filings.",
  },
];

export const LAYERS_BY_ID = Object.fromEntries(
  LAYERS.map((l) => [l.id, l]),
) as Record<LayerMeta["id"], LayerMeta>;

export const LAYER_CATEGORY_LABELS: Record<LayerCategory, string> = {
  control: "Control plane",
  hardware: "Hardware telemetry",
  facility: "Facility",
  software: "Software & data",
  verify: "Cryptographic verification",
  external: "External signals",
};

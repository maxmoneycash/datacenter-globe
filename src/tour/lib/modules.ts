import type { ModuleMeta } from "./types";

export const MODULES: ModuleMeta[] = [
  {
    kind: "module",
    id: "site",
    index: 0,
    label: "Site Overview",
    colorKey: "shell",
    shortDesc:
      "A modern AI data center is essentially a power plant that happens to do math.",
    metaphor:
      "Think of it less like an office building and more like an industrial factory: utility power in, hot air and water out, intelligence in between.",
    facts: [
      { label: "Total power", value: "50 – 250 MW (a small town)" },
      { label: "Footprint", value: "10,000 – 50,000 m²" },
      { label: "Build time", value: "12 – 24 months" },
    ],
    comparison:
      "One large AI campus can draw as much electricity as ~50,000 homes, almost all of it turning into compute and heat.",
    sections: [
      {
        heading: "What is a data center?",
        body: "A purpose-built facility that hosts thousands of servers under tightly controlled power, cooling, and network conditions. Modern AI data centers are designed around extreme power density — every square meter of floor space draws orders of magnitude more electricity than a traditional cloud data center.",
      },
      {
        heading: "What you see outside",
        body: "Substations, backup generators, fuel tanks, and cooling towers ring the building. Inside is one or several large halls of identical-looking racks plus support rooms for power, cooling, and network distribution.",
      },
    ],
    glossary: [
      {
        term: "Hyperscale",
        def: "A class of data center operating at very large power and rack scale (typically >40 MW).",
      },
    ],
  },
  {
    kind: "module",
    id: "power",
    index: 1,
    label: "Power Chain",
    colorKey: "power",
    shortDesc:
      "Utility power is stepped down, cleaned up, and battery-buffered before it reaches a single GPU.",
    metaphor:
      "The power chain is like the plumbing for electricity — every box you see is shaping the current so the GPU never even hiccups.",
    facts: [
      { label: "Utility input", value: "115 – 345 kV" },
      { label: "Per-rack draw", value: "60 – 130 kW (an AI rack)" },
      { label: "UPS hold-up", value: "30 s – 15 min, then generators take over" },
    ],
    comparison:
      "An AI rack pulls roughly 100× more power than a typical cloud rack from 5 years ago.",
    sections: [
      {
        heading: "From the grid to the chip",
        body: "Utility lines arrive at the substation, where transformers step the voltage down. From there it flows through switchgear and an Uninterruptible Power Supply (UPS) — large arrays of batteries that bridge the gap during a grid blip until diesel generators spin up. Power Distribution Units (PDUs) on the floor split that current to every rack.",
      },
      {
        heading: "Why so much hardware?",
        body: "AI training runs cost millions of dollars per outage. Every layer of redundancy — N+1 transformers, 2N UPS, multiple generator strings — is there to make sure the GPUs never lose power mid-job.",
      },
    ],
    glossary: [
      {
        term: "UPS",
        def: "Uninterruptible Power Supply: batteries that hold the load while diesel generators start.",
      },
      {
        term: "PDU",
        def: "Power Distribution Unit: the on-floor 'fuse box' that feeds individual racks.",
      },
    ],
    anim: "powerPulse",
  },
  {
    kind: "module",
    id: "cooling",
    index: 2,
    label: "Liquid Cooling Loop",
    colorKey: "cooling",
    shortDesc:
      "Modern AI chips are too hot for air alone. Water now runs millimeters above each GPU.",
    metaphor:
      "Imagine a radiator strapped directly to every GPU, with cold water in and hot water out — that's direct-to-chip liquid cooling.",
    facts: [
      { label: "Chip TDP", value: "1000 – 1200 W per Blackwell GPU" },
      { label: "Coolant ΔT", value: "~10 °C across the cold plate" },
      { label: "PUE target", value: "1.10 – 1.20 (lower is better)" },
    ],
    comparison:
      "A liquid loop can move ~3000× more heat per liter than air at the same flow — which is why it now wraps every flagship GPU.",
    sections: [
      {
        heading: "Why liquid?",
        body: "A Blackwell GPU dissipates over 1 kW. You cannot blow enough air across that without deafening fans, so AI racks now use direct-to-chip cooling: a metal cold plate sits on the GPU and cool water runs through tiny channels inside it.",
      },
      {
        heading: "The full loop",
        body: "Outside, cooling towers or chillers reject heat to the atmosphere. Inside, a Coolant Distribution Unit (CDU) acts like a heat exchanger between the outdoor loop and the indoor 'tech water' loop. The tech water is delivered up to manifolds on each rack, then split into every server tray and onto every chip.",
      },
    ],
    glossary: [
      {
        term: "CDU",
        def: "Coolant Distribution Unit — the heat exchanger that isolates the dirty outdoor loop from the clean rack loop.",
      },
      {
        term: "PUE",
        def: "Power Usage Effectiveness — total facility power divided by IT power. 1.0 is the unattainable ideal.",
      },
    ],
    anim: "coolantFlow",
  },
  {
    kind: "module",
    id: "hall",
    index: 3,
    label: "Compute Hall",
    colorKey: "compute",
    shortDesc:
      "The 'white space' — long aisles of identical racks arranged for airflow and cabling.",
    metaphor:
      "Like the engine room of a ship: everything is laid out as repeating cells, and the magic happens in the cold/hot aisle pattern.",
    facts: [
      { label: "Hall size", value: "1,000 – 5,000 m² typical" },
      { label: "Rack count", value: "100 – 500 racks per hall" },
      { label: "Aisle pattern", value: "Hot aisle / cold aisle" },
    ],
    comparison:
      "From above the hall looks boring; what makes it AI is that every rack might cost 3–5 million dollars.",
    sections: [
      {
        heading: "Why aisles?",
        body: "Racks are arranged front-to-front and back-to-back. Cool intake air comes from the cold aisle, exhaust goes into the hot aisle. With liquid cooling the air no longer carries most of the heat, but the layout persists for service access and residual airflow.",
      },
      {
        heading: "What's overhead",
        body: "Above the racks runs a forest of cable trays — power whips below, fiber and copper above — plus the orange/blue piping of the liquid loop and bus bars or busways for power.",
      },
    ],
  },
  {
    kind: "module",
    id: "rack",
    index: 4,
    label: "GB200 NVL72 Rack",
    colorKey: "compute",
    shortDesc:
      "72 GPUs in one cabinet, wired together so software sees them as a single giant accelerator.",
    metaphor:
      "An NVL72 rack is a single computer the size of a refrigerator — not a row of independent servers.",
    facts: [
      { label: "GPUs", value: "72 Blackwell B200" },
      { label: "Per-rack power", value: "~120 kW liquid-cooled" },
      { label: "Aggregate HBM", value: "~13.5 TB GPU memory" },
    ],
    comparison:
      "One NVL72 rack roughly equals the AI throughput of an entire room of pre-2020 GPU servers.",
    sections: [
      {
        heading: "What's inside",
        body: "Eighteen 'compute trays' (each with two Grace CPUs and four Blackwell GPUs) are stacked with nine 'NVSwitch trays' between them. A copper backplane on the rear ties everything together with NVLink so all 72 GPUs talk as one.",
      },
      {
        heading: "Why pack so tight",
        body: "Bandwidth between two chips drops the further apart they are. By cramming 72 GPUs into a single rack and bolting them together with copper NVLink, training scales as if it were one huge GPU rather than a network of small ones.",
      },
    ],
    glossary: [
      {
        term: "NVL72",
        def: "NVIDIA's reference rack design: 72 Blackwell GPUs unified by NVLink into one logical accelerator.",
      },
    ],
  },
  {
    kind: "module",
    id: "node",
    index: 5,
    label: "Compute Tray + NVLink",
    colorKey: "nvlink",
    shortDesc:
      "Inside each tray: 4 Blackwell GPUs and 2 Grace CPUs, fully meshed by NVLink at TB/s.",
    metaphor:
      "NVLink is the freeway between GPUs — way wider and faster than the regular network road.",
    facts: [
      { label: "GPUs per tray", value: "4 Blackwell B200" },
      { label: "NVLink bandwidth", value: "1.8 TB/s per GPU" },
      { label: "Topology", value: "Full all-to-all via NVSwitch" },
    ],
    comparison:
      "NVLink moves data between GPUs ~10× faster than InfiniBand — fast enough that 72 chips behave like one.",
    sections: [
      {
        heading: "Inside a tray",
        body: "Each tray hosts 2 Grace CPUs and 4 Blackwell GPUs. The CPUs feed the GPUs and share memory with them coherently. The cold plates on top of every chip are part of the liquid loop you saw earlier.",
      },
      {
        heading: "What is NVLink for",
        body: "When training a model with hundreds of billions of parameters, GPUs constantly exchange weights and activations. NVLink is a dedicated, ultra-wide bus between chips so this exchange does not become the bottleneck.",
      },
    ],
    glossary: [
      {
        term: "NVLink",
        def: "NVIDIA's high-bandwidth chip-to-chip interconnect — the 'scale-up' fabric inside a rack.",
      },
      {
        term: "NVSwitch",
        def: "A switch chip that lets all GPUs talk to all other GPUs at NVLink speed.",
      },
    ],
    anim: "nvlinkPackets",
  },
  {
    kind: "module",
    id: "network",
    index: 6,
    label: "Scale-out Fabric",
    colorKey: "fabric",
    shortDesc:
      "Outside the rack, racks connect to each other through a spine-leaf InfiniBand or Ethernet network.",
    metaphor:
      "If NVLink is the freeway inside a city, the scale-out fabric is the highway between cities of GPUs.",
    facts: [
      { label: "Link speed", value: "400 – 800 Gb/s per port" },
      { label: "Topology", value: "Non-blocking spine-leaf" },
      { label: "Fabric type", value: "InfiniBand NDR/XDR or 800GbE" },
    ],
    comparison:
      "One AI cluster can have more total fiber than a small city's internet backbone.",
    sections: [
      {
        heading: "Spine and leaf",
        body: "Each rack has a 'leaf' switch on top. Leaf switches connect upward to a row of 'spine' switches. Any rack can reach any other rack in two hops, with predictable latency — critical when thousands of GPUs need to synchronize gradients in lockstep.",
      },
      {
        heading: "Why a separate network",
        body: "AI training generates collective traffic patterns (all-reduce, all-gather) very different from regular cloud traffic. A dedicated lossless fabric — InfiniBand or RoCE Ethernet — keeps tail latencies low so a single slow link cannot stall the whole job.",
      },
    ],
    glossary: [
      {
        term: "InfiniBand",
        def: "A low-latency, lossless networking standard popular for HPC and AI clusters.",
      },
      {
        term: "All-reduce",
        def: "A collective operation where every GPU sums a value and ends up with the same total.",
      },
    ],
    anim: "fabricPackets",
  },
  {
    kind: "module",
    id: "storage",
    index: 7,
    label: "Storage Tier",
    colorKey: "storage",
    shortDesc:
      "An all-flash storage cluster feeds petabytes of training data to the GPUs without stalling them.",
    metaphor:
      "If GPUs are the chefs, storage is the pantry — and training jobs eat through the pantry at terabytes per second.",
    facts: [
      { label: "Capacity", value: "PB to tens of PB per cluster" },
      { label: "Read throughput", value: "~1 – 10 TB/s aggregate" },
      { label: "Media", value: "All-flash NVMe / QLC" },
    ],
    comparison:
      "Feeding a single large training job is like streaming the entire English Wikipedia, in full, every few seconds.",
    sections: [
      {
        heading: "Why all-flash",
        body: "A modern training run reads the dataset many times over. Spinning disks cannot keep up; the cluster has to deliver many terabytes per second of read throughput with low tail latency. That demands flash, parallel filesystems, and the same fabric the GPUs use.",
      },
      {
        heading: "Tiers",
        body: "A small high-performance flash tier sits closest to the GPUs. A larger, cheaper capacity tier (still flash, sometimes object storage) holds checkpoints and cold datasets. Slower archival tiers live in another building or another region entirely.",
      },
    ],
    glossary: [
      {
        term: "Checkpoint",
        def: "A snapshot of a training run's state, written to storage so the job can resume after a failure.",
      },
    ],
  },
];

export const MODULES_BY_ID = Object.fromEntries(
  MODULES.map((m) => [m.id, m]),
) as Record<ModuleMeta["id"], ModuleMeta>;

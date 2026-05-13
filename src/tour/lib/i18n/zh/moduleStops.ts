import type { ModuleMeta } from "@tour/lib/types";
import { MODULES_BY_ID } from "@tour/lib/modules";

/** Chinese copy for Chapter 1 module detail panels. */
export const MODULES_ZH: Record<ModuleMeta["id"], ModuleMeta> = {
  site: {
    ...MODULES_BY_ID.site,
    label: "场地总览",
    shortDesc: "一座现代 AI 数据中心，本质上就是一座会算数学的发电厂。",
    metaphor:
      "少把它想成写字楼，多把它想成工厂：市电进来，热水热空气出去，中间是算力。",
    facts: [
      { label: "总电力", value: "50 – 250 MW（一座小镇规模）" },
      { label: "占地", value: "10,000 – 50,000 m²" },
      { label: "建设周期", value: "12 – 24 个月" },
    ],
    comparison:
      "一座大型 AI 园区用电量可抵约 5 万户家庭，其中绝大部分变为算力与热量。",
    sections: [
      {
        heading: "数据中心是什么？",
        body: "为成千上万台服务器而建的专用设施，在严格控制的供电、散热与网络条件下运行。现代 AI 机房围绕极端功率密度设计——每平方米地板面积的用电可比传统云机房高出一个数量级。",
      },
      {
        heading: "建筑外你会看到什么？",
        body: "变电站、备用发电机、油罐和冷却塔环绕主体。室内是一个或多个巨大的机柜大厅，以及配电、制冷与网络分配的配套房间。",
      },
    ],
    glossary: [
      {
        term: "超大规模（Hyperscale）",
        def: "功率与机柜规模都极大的数据中心形态（通常 >40 MW）。",
      },
    ],
  },
  power: {
    ...MODULES_BY_ID.power,
    label: "电力链路",
    shortDesc: "市电先降压、净化，并在到达任意 GPU 之前经电池托住。",
    metaphor:
      "电力链路就像电流的“水管”——你看到的每个箱子都在整形电流，让 GPU 连抖都不会抖。",
    facts: [
      { label: "市电进线", value: "115 – 345 kV" },
      { label: "单机柜功率", value: "60 – 130 kW（AI 机柜）" },
      { label: "UPS 维持", value: "30 秒 – 15 分钟，之后由柴油接管" },
    ],
    comparison: "一台 AI 机柜的功耗大约是一台前些年典型云机柜的 100 倍。",
    sections: [
      {
        heading: "从电网到芯片",
        body: "高压线进入变电站降压后，再经开关柜与不间断电源（UPS）——大组电池在电网眨眼时顶住负载，直到柴油机并网。配电单元（PDU）把电流分到每一排机柜。",
      },
      {
        heading: "为什么堆这么多设备？",
        body: "一次 AI 训练停机可能损失数百万美元。N+1 变压器、2N UPS、多路柴发——都是为了任务中途不断电。",
      },
    ],
    glossary: [
      {
        term: "UPS",
        def: "不间断电源：电池托住负载，直到柴发起机并网。",
      },
      {
        term: "PDU",
        def: "配电单元：机房的“保险丝盘”，向单柜供电。",
      },
    ],
    anim: "powerPulse",
  },
  cooling: {
    ...MODULES_BY_ID.cooling,
    label: "液冷回路",
    shortDesc: "现代 AI 芯片单靠风冷不够，水现在贴着每颗 GPU 几毫米流过。",
    metaphor:
      "想象每个 GPU 上都粘了一块散热器：冷水进，热水出——这就是直贴芯片液冷。",
    facts: [
      { label: "芯片 TDP", value: "每颗 Blackwell GPU 约 1000 – 1200 W" },
      { label: "冷板温升", value: "约 10 °C" },
      { label: "PUE 目标", value: "1.10 – 1.20（越低越好）" },
    ],
    comparison:
      "同体积流量下，液体带走的热量可比空气高约 3000 倍——因此旗舰 GPU 被液冷包裹。",
    sections: [
      {
        heading: "为什么用水？",
        body: "一颗 Blackwell GPU 耗散热超过 1 kW，想单靠吹风冷却要么不够要么噪到无法接受，于是采用直贴冷板，冷水在板内微通道流过。",
      },
      {
        heading: "完整回路",
        body: "室外冷却塔或冷水机组把热排到大气；室内 CDU 像换热器，隔开室外脏回路和机房的“技术水”。技术水送到每列机柜的歧管，再分到每台托盘、每颗芯片。",
      },
    ],
    glossary: [
      {
        term: "CDU",
        def: "冷液分配单元：隔离室外大回路和机房内干净回路的热交换器。",
      },
      {
        term: "PUE",
        def: "电能利用效率 = 园区总用电 ÷ IT 用电，1.0 是理想极限。",
      },
    ],
    anim: "coolantFlow",
  },
  hall: {
    ...MODULES_BY_ID.hall,
    label: "计算机房",
    shortDesc: "一条条“白地板”通道：成排机柜为气流与走线而布置。",
    metaphor:
      "像机舱：一切按重复单元铺开，门道在于冷热通道。",
    facts: [
      { label: "大厅面积", value: "典型 1,000 – 5,000 m²" },
      { label: "机柜数", value: "单厅 100 – 500 台" },
      { label: "通道形式", value: "冷 / 热通道" },
    ],
    comparison:
      "俯瞰像停满卡车的车库，但每台机柜造价可能 300–500 万美元。",
    sections: [
      {
        heading: "为什么分冷热通道？",
        body: "机柜前对前、后对后排列。冷风从冷通道吸入，热风进热通道。液冷后空气不再承担主要散热，但动线仍利于运维与残余对流。",
      },
      {
        heading: "头顶有什么？",
        body: "电缆托盘森林里，下层常常是电源线，上层是光纤与铜缆；还有液冷橙蓝管路和母线槽。",
      },
    ],
  },
  rack: {
    ...MODULES_BY_ID.rack,
    label: "GB200 NVL72 机柜",
    shortDesc: "72 颗 GPU 进一只柜子，用线连到软件眼里像一颗大加速器。",
    metaphor:
      "NVL72 像一台冰箱大小的单台计算机——不是一排彼此无关的服务器。",
    facts: [
      { label: "GPU 数", value: "72 颗 Blackwell B200" },
      { label: "机柜功率", value: "约 120 kW（液冷）" },
      { label: "合计 HBM", value: "约 13.5 TB 显存" },
    ],
    comparison:
      "一台 NVL72 的 AI 吞吐，大致等于满屋 2020 年前的 GPU 服务器。",
    sections: [
      {
        heading: "里面有什么",
        body: "十八块“计算托盘”（各 2 颗 Grace + 4 颗 Blackwell）与九块 NVSwitch 托盘交错叠放，背面铜背板用 NVLink 把 72 颗 GPU 织成一张网。",
      },
      {
        heading: "为什么塞这么紧",
        body: "两颗芯片越远带宽掉得越狠。把 72 颗塞进一柜并用铜 NVLink 绑在一起，训练扩展时更像一颗巨 GPU，而不是一盘散沙。",
      },
    ],
    glossary: [
      {
        term: "NVL72",
        def: "NVIDIA 参考机柜：72 颗 Blackwell 经 NVLink 合成逻辑上一颗加速器。",
      },
    ],
  },
  node: {
    ...MODULES_BY_ID.node,
    label: "计算托盘与 NVLink",
    shortDesc: "每块托盘：4 颗 B200 与 2 颗 Grace，经 NVLink 全互联到 TB/s。",
    metaphor:
      "NVLink 是 GPU 之间的高速公路——比普通网络“路面”宽得多。",
    facts: [
      { label: "每托盘 GPU", value: "4× Blackwell B200" },
      { label: "NVLink 带宽", value: "每 GPU 1.8 TB/s" },
      { label: "拓扑", value: "经 NVSwitch 全对全" },
    ],
    comparison:
      "NVLink 机内搬数据比 InfiniBand 快约一个数量级——72 颗芯片才能像一个整体。",
    sections: [
      {
        heading: "托盘内部",
        body: "每托盘 2 颗 Grace 与 4 颗 Blackwell，CPU 喂数据并与 GPU 相干共享内存。每颗芯片上的冷板属于前面看到的液冷回路。",
      },
      {
        heading: "NVLink 干什么用",
        body: "训练千亿参数模型时 GPU 不停交换权重与激活；NVLink 就是专给片间的高速总线，避免成为瓶颈。",
      },
    ],
    glossary: [
      {
        term: "NVLink",
        def: "英伟达片间超高带宽互联——机内的“纵向扩展”织物。",
      },
      {
        term: "NVSwitch",
        def: "交换芯片，让所有 GPU 以 NVLink 速度互访。",
      },
    ],
    anim: "nvlinkPackets",
  },
  network: {
    ...MODULES_BY_ID.network,
    label: "横向扩展网络",
    shortDesc: "出柜之后，机柜之间经脊叶 IB 或以太网互联。",
    metaphor:
      "NVLink 是城内高速，横向网是城际高速。",
    facts: [
      { label: "单口速率", value: "400 – 800 Gb/s" },
      { label: "拓扑", value: "无阻塞脊叶" },
      { label: "Fabric 类型", value: "InfiniBand NDR/XDR 或 800GbE" },
    ],
    comparison:
      "一座 AI 集群的总光纤，可比一座小城的互联网骨干还多。",
    sections: [
      {
        heading: "脊与叶",
        body: "每柜顶有叶交换，向上汇聚到脊。任意两柜两跳可达、时延可预期——大规模梯度同步时至关重要。",
      },
      {
        heading: "为何要单独一张网",
        body: "训练产生的集合通信与云上通用流量形态完全不同；专用无损 fabric 压低尾延迟。",
      },
    ],
    glossary: [
      {
        term: "InfiniBand",
        def: "低延迟、无损的高性能网络标准，常见于 HPC 与 AI。",
      },
      {
        term: "All-reduce",
        def: "集合通信：每张 GPU 贡献一部分并都得到相同汇总结果。",
      },
    ],
    anim: "fabricPackets",
  },
  storage: {
    ...MODULES_BY_ID.storage,
    label: "存储层",
    shortDesc: "全闪阵列以 PB 级吞吐把训练数据喂给 GPU 而不拖后腿。",
    metaphor:
      "GPU 是大厨，存储是 pantry（储藏室）——训练作业以 TB/s 清空货架。",
    facts: [
      { label: "容量", value: "单集群 PB 到数十 PB" },
      { label: "读吞吐", value: "合计约 1 – 10 TB/s" },
      { label: "介质", value: "全闪 NVMe / QLC" },
    ],
    comparison:
      "喂饱一次大型训练，就像每隔几秒把整本英文维基全读一遍。",
    sections: [
      {
        heading: "为什么全闪",
        body: "现代训练多轮扫数据集，需要数十 TB/s 级读取与极低尾延迟，机械盘不可能跟上。",
      },
      {
        heading: "分层",
        body: "紧挨 GPU 的是高性能闪存层；更大更便宜的容量层（仍为闪存或对象）放检查点与冷数据。更慢归档在另一栋楼或另一区域。",
      },
    ],
    glossary: [
      {
        term: "Checkpoint",
        def: "训练状态的快照，写入存储以便故障后恢复。",
      },
    ],
  },
};

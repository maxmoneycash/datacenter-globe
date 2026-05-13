import type { LayerMeta } from "@tour/lib/types";
import { LAYERS_BY_ID } from "@tour/lib/layers";

/** Chinese copy for Chapter 2 layer detail panels. */
export const LAYERS_ZH: Record<LayerMeta["id"], LayerMeta> = {
  "hw-inventory": {
    ...LAYERS_BY_ID["hw-inventory"],
    label: "硬件资产台账",
    shortDesc: "每颗芯片、交换机、电源都有序列号，记在资产库里。",
    metaphor: "像酒店房间配了什么床——只是床要四万美元还得液冷。",
    facts: [
      { label: "单站点行数", value: "约 10⁵ – 10⁶" },
      { label: "更新频率", value: "上线 / RMA / 盘点时" },
      { label: "权威来源", value: "DCIM + 云控制面" },
    ],
    comparison: "少了一块 GPU，这本账能告诉你它在哪柜哪托。",
    sections: [
      {
        heading: "运营看见什么",
        body: "每张 GPU 型号、序列、MAC、NVLink ID、主机 UUID、机柜槽位、上架时间、固件 build；多与资产扫描及控制面对账。",
      },
      {
        heading: "对可验证的意义",
        body: "台账是其它信号做 join 的脊柱。外部若不信资产，任何 GPU 遥测也难取信。",
      },
    ],
    whoCanSee: "运营方；有时按合同的监管方。终端客户通常看不到。",
    howToFake: "容易——只是数据库行。真实性的签名在于与其它证据（固件日志、序列探针、海关）一致。",
    howToVerify:
      "用 TPM/PUF 读序列对账厂商出货与报关；现场抽盘对照机柜实物。",
  },
  scheduler: {
    ...LAYERS_BY_ID.scheduler,
    label: "调度与作业分配",
    shortDesc: "Slurm / K8s / Kueue：哪项作业用了哪张 GPU、何时、多久。",
    metaphor: "像空管日志——每条跑道上的每一次起降。",
    facts: [
      { label: "粒度", value: "按 GPU、按秒" },
      { label: "常见栈", value: "Slurm、Kueue、Run:ai、k8s" },
      { label: "保留期", value: "数月到数年" },
    ],
    comparison: "一次大训练是一行调度记录——但其 GPU·秒账单可比多数公司的整张云账单。",
    sections: [
      {
        heading: "记什么",
        body: "作业 ID、提交者、申请卡数、分配节点/GPU、起止时间、退出码、队列优先级、镜像哈希；多数调度器还导出 Prometheus 队列深度等。",
      },
      {
        heading: "它不说明什么",
        body: "调度只告诉你预留了多少算力——不知道 GPU 到底算了什么。忙等循环与真实模型训练对调度看起来一样。",
      },
    ],
    whoCanSee: "运营方与（云上）作业所有者；外部审计通常需配合。",
    howToFake: "容易——日志只是文本。若非追加且签名，事后可改写。",
    howToVerify:
      "追加且签名的日志；与计费、电耗曲线、网络流量交叉核对。",
  },
  "cloud-billing": {
    ...LAYERS_BY_ID["cloud-billing"],
    label: "云 API 与计费日志",
    shortDesc: "每一次调用控制面的 API，以及最终出现在发票上的计量。",
    metaphor: "云的电表 + 信用卡小票：谁租了哪段容量、何时、多久。",
    facts: [
      { label: "覆盖", value: "鉴权、开通、扩缩、IO 等" },
      { label: "常见标准", value: "FOCUS 计费模型" },
      { label: "保留", value: "合规要求下多年" },
    ],
    comparison: "一次大训练可耗资千万美元起；计费行往往是你能拿到的最完整宏观轨迹。",
    sections: [
      {
        heading: "记录内容",
        body: "每次签名的 API（创建实例、分配 GPU、读对象…）、主体、资源与计量（GPU·时、出站 GiB…）并最终入账。",
      },
      {
        heading: "为何证据强",
        body: "计费少收亏钱、多收伤客——因此其它日志可能潦草，账往往最整齐。",
      },
    ],
    whoCanSee: "运营方与被计费客户；税务机关按请求。",
    howToFake: "内部账本难长期造假；若只给 PDF 发票，外人仍可被骗。",
    howToVerify: "与客户自有日志、银行流水对账；总 GPU·时与园区电耗比较；税表。",
  },
  "gpu-util": {
    ...LAYERS_BY_ID["gpu-util"],
    label: "GPU 利用率 / 功耗 / 显存",
    shortDesc: "每卡实时：SM、板级功率、显存占用与温度。",
    metaphor: "像汽车仪表盘——只是每辆车 1 kW，而这样的车有十万辆。",
    facts: [
      { label: "采样率", value: "通常 1 – 100 Hz" },
      { label: "来源", value: "DCGM / NVML / nvidia-smi" },
      { label: "单卡功率", value: "B200 约 300 – 1200 W" },
    ],
    comparison: "空闲与满载可差约 800 W——在变电站表计上都能看出签名。",
    sections: [
      {
        heading: "信号长什么样",
        body: "DCGM 输出利用率、SM 活跃、fb_used、功耗、温度等，多数进 Prometheus + Grafana。",
      },
      {
        heading: "能推断什么",
        body: "是否在算、算多满、偏算力还是带宽瓶颈，以及粗粒度工作负载轮廓。",
      },
    ],
    whoCanSee: "有 root 的主机、监控栈；经证明也可给负载所有者。外部审计多靠证明链。",
    howToFake: "有 root 可整体替换软件指标——但与机柜供电、冷负荷对账会露馅。",
    howToVerify:
      "在机密 VM 内跑 DCGM；与 PDU、园区电耗关联；主动探针抽检。",
  },
  "gpu-profile": {
    ...LAYERS_BY_ID["gpu-profile"],
    label: "GPU 性能计数器",
    shortDesc: "张量核吞吐、HBM 字节、NVLink 占用、核时序。",
    metaphor: "GPU 的 X 光——不止忙不忙，还在做 matmul 还是 memcpy。",
    facts: [
      { label: "工具", value: "CUPTI / Nsight / perfworks" },
      { label: "粒度", value: "按核、按 SM" },
      { label: "数据量", value: "打开时每 GPU MB/s 级" },
    ],
    comparison: "性能计数能区分真伪训练负载——算力/字节比与真实任务一致。",
    sections: [
      {
        heading: "得到什么",
        body: "张量核利用、FP8/FP16 操作数、HBM 读写、NVLink TX/RX、Cache 命中、warp stall 等。",
      },
      {
        heading: "为何像指纹",
        body: "每种模型架构有特征谱线；想伪造签名几乎等于真跑模型。",
      },
    ],
    whoCanSee: "有 root 或内核驱动权限者；生产大规模外包难。",
    howToFake: "用户态读的寄存器可被恶意驱动撒谎。",
    howToVerify: "签名驱动与证明内核；随机探针；与 PDU 功耗对照。",
  },
  "nvlink-counters": {
    ...LAYERS_BY_ID["nvlink-counters"],
    label: "NVLink / NVSwitch 计数",
    shortDesc: "机柜内 GPU 间每秒字节数，在交换侧计量。",
    metaphor: "专用高速公路上的收费站日志。",
    facts: [
      { label: "链路速率", value: "Blackwell 单链 1.8 TB/s" },
      { label: "拓扑", value: "经 NVSwitch 全对全" },
      { label: "来源", value: "NVSwitch SDK / NVML" },
    ],
    comparison: "大模型训练 all-reduce 可在 NVLink 上跑 TB/s——特征极难掩盖。",
    sections: [
      {
        heading: "量什么",
        body: "每片 NVSwitch 端口的 TX/RX 包与字节、错误计数；机柜级汇总。",
      },
      {
        heading: "为何难藏",
        body: "计数在交换 ASIC 内；要伪造需攻固件，且与功耗强相关。",
      },
    ],
    whoCanSee: "有交换管理权限的运营；外人无配合难直接看。",
    howToFake: "需替换交换固件；若与主机 NVLink 驱动不一致会穿帮。",
    howToVerify: "与主机驱动计数交叉；签名固件；对照机柜电耗。",
  },
  "fabric-counters": {
    ...LAYERS_BY_ID["fabric-counters"],
    label: "横向网络计数",
    shortDesc: "IB / RoCE 叶脊计数，看跨柜风暴。",
    metaphor: "城内高速之外，这是区域空管雷达。",
    facts: [
      { label: "链路速率", value: "400 – 800 Gb/s" },
      { label: "工具", value: "UFM(IB)、sFlow(Eth)" },
      { label: "采样", value: "亚秒级" },
    ],
    comparison: "十万卡训练一小时的东向流量，可比小 ISP 一天的承载。",
    sections: [
      {
        heading: "捕获什么",
        body: "每端口字节/包、拥塞通知、链路启停、错误计数；UFM 聚 IB，sFlow/gNMI 常见于以太网。",
      },
      {
        heading: "重要性",
        body: "不同负载的集合通信形态不同；即便载荷加密，计数仍能看出训练 vs 推理轮廓。",
      },
    ],
    whoCanSee: "网络运维；客户多只能看自己 VPC 视图。",
    howToFake: "需改多跳交换固件，难；与主机网卡计数对账可发现。",
    howToVerify: "交换与主机口计数交叉；签名固件；用已知体积合成流抽检。",
  },
  "rack-power": {
    ...LAYERS_BY_ID["rack-power"],
    label: "机柜与园区电力",
    shortDesc: "分支回路与 PDU 读数——每柜 kW 与园区变电站合计。",
    metaphor: "GPU 遥测可以说谎，墙插往往不会——能量守恒。",
    facts: [
      { label: "单柜", value: "60 – 130 kW" },
      { label: "来源", value: "智能 PDU、UPS、BMS" },
      { label: "采样", value: "典型 1 s" },
    ],
    comparison: "十万卡园区可常载约 100 MW——区域电网台账上也能看见。",
    sections: [
      {
        heading: "信号形态",
        body: "PDU 报每插座/相位电流电压；UPS/STS 报负载与电池；BMS 聚到馈线与变电站；电网侧看你是一个负荷点。",
      },
      {
        heading: "为何物理上硬",
        body: "电遵守物理。软件说在跑，对应机柜却只有 5 kW 空闲签，则假。",
      },
    ],
    whoCanSee: "设施团队、运营、电网（汇总）；规管有时见申报。",
    howToFake: "改 BMS 日志容易；少报 MWh 很难骗过电网自己的表。",
    howToVerify: "电网独立计费表；PDU 封印计量；外部热像。",
  },
  "cooling-telemetry": {
    ...LAYERS_BY_ID["cooling-telemetry"],
    label: "冷却遥测",
    shortDesc: "冷媒流量、供回水温度与压差——热总要排走。",
    metaphor: "1 kW GPU 不会凭空消失，它进循环水再进冷却塔。",
    facts: [
      { label: "单柜流量", value: "100 – 300 L/min" },
      { label: "冷板温升", value: "约 10 °C" },
      { label: "来源", value: "CDU / BMS" },
    ],
    comparison: "满载 NVL72 约向回路排 120 kW 热——像八十台家用取暖器。",
    sections: [
      {
        heading: "量什么",
        body: "CDU 与歧管报流量、供回温与压力；BMS 聚到塔与环路。",
      },
      {
        heading: "能量守恒交叉核",
        body: "排热 ≈ 流量×比热×ΔT，应与电输入百分之几内一致。",
      },
    ],
    whoCanSee: "设施与运营；外人除非热像或许可档案。",
    howToFake: "日志可改，塔顶水温在围栏外也能瞄。",
    howToVerify: "热平衡：排热 ≈ 电功率；独立热像；第三方封印流量计。",
  },
  "host-process": {
    ...LAYERS_BY_ID["host-process"],
    label: "主机 / 进程 / 容器元数据",
    shortDesc: "什么内核、什么镜像、跑的什么进程——作业底座。",
    metaphor: "船舶配员单：船员、货、导航软件。",
    facts: [
      { label: "覆盖", value: "按主机、按容器" },
      { label: "来源", value: "systemd、k8s、eBPF、audit" },
      { label: "体量", value: "每集群每日 GB 级日志" },
    ],
    comparison: "训练集群与推理集群在未看 GPU 前就已不同——二进制与 syscall 组合不同。",
    sections: [
      {
        heading: "捕获什么",
        body: "内核 build、镜像 digest、进程、cgroup、挂载卷、eBPF/audit 实时导出。",
      },
      {
        heading: "与可验证关系",
        body: "若引导与镜像经证明（TPM/TDX），进程元数据才锚在可信基板上；否则内核可篡改一切。",
      },
    ],
    whoCanSee: "运营与（云上）客户看自己 VM；默认不外泄。",
    howToFake: "有 root  trivial；靠证明启动链。",
    howToVerify: "TPM/TDX 测得启动；证明内核；追加签名日志。",
  },
  "object-access": {
    ...LAYERS_BY_ID["object-access"],
    label: "对象存储访问日志",
    shortDesc: "GPU 读训练集桶时的每一次读写。",
    metaphor: "图书馆借书记录——只是书是 100 TB 数据集读很多遍。",
    facts: [
      { label: "常见标准", value: "S3 访问日志 / OTel" },
      { label: "单作业读取量", value: "TB 到 PB" },
      { label: "保留", value: "月到年" },
    ],
    comparison: "前沿训练可把数据集扫 10–50 遍——对象读全是日志。",
    sections: [
      {
        heading: "记什么",
        body: "时间、主体、桶、对象键（或哈希）、大小、返回码；多进 SIEM。",
      },
      {
        heading: "能证明什么",
        body: "某键/哈希的数据在训练窗口是否真被读过——用于出处与版权争议。",
      },
    ],
    whoCanSee: "运营与桶所有者。",
    howToFake: "改日志；靠追加签名与透明日志。",
    howToVerify: "出站字节与 fabric 计数对照；客户自留请求日志对账。",
  },
  "ml-training": {
    ...LAYERS_BY_ID["ml-training"],
    label: "机器学习训练日志",
    shortDesc: "损失、梯度范数、评测分、检查点——模型自述。",
    metaphor: "GPU 是转速表，训练日志是车速表——路有没有在赶。",
    facts: [
      { label: "工具", value: "W&B、MLflow、TensorBoard" },
      { label: "粒度", value: "按步、按评测" },
      { label: "保留", value: "按次归档" },
    ],
    comparison: "损失曲线形状随架构变化——是真实训练过程的强指纹。",
    sections: [
      {
        heading: "内容",
        body: "步损失、学习率、梯度范数、吞吐、评测、检查点哈希与运行配置。",
      },
      {
        heading: "可验证性",
        body: "与代码 commit 与数据哈希结合，外人可小规模重放几步核对损失——抽查式审计。",
      },
    ],
    whoCanSee: "作业方团队；外泄靠主动发布。",
    howToFake: "可仿真曲线，但很难与电耗与 fabric 总量对齐。",
    howToVerify: "独立硬件小规模重放；校验检查点；与功率与流量交叉。",
  },
  attestation: {
    ...LAYERS_BY_ID.attestation,
    label: "证明（Attestation）产物",
    shortDesc: "硬件签名的陈述：正在跑什么代码。",
    metaphor: "公证印章：不是文件照片，而是可信方声明“我验过原件”。",
    facts: [
      { label: "硬件", value: "TPM 2.0、TDX、SEV、NVIDIA CC" },
      { label: "标准", value: "RA-TLS、IETF RATS、DICE" },
      { label: "输出", value: "签名 quote / report" },
    ],
    comparison: "整栈里唯一能不完全盲信运营方的信号——只信硅厂。",
    sections: [
      {
        heading: "提供什么",
        body: "由硬件信任根签名的固件/OS/运行时镜像报告；常附 TDX/SEV/GPU CC 报告。",
      },
      {
        heading: "为何是基石",
        body: "进程与调度日志的可信度取决于 OS；证明把叙述锚到可核对的二进制。",
      },
    ],
    whoCanSee: "设计上任何人都可验——quote 给依赖方看的。",
    howToFake: "需破硅厂签名或 TEE 漏洞——罕见且会上新闻。",
    howToVerify: "用厂商根密钥验签；对照独立参考测量值；带新鲜 nonce。",
  },
  "challenge-probe": {
    ...LAYERS_BY_ID["challenge-probe"],
    label: "主动挑战探针",
    shortDesc: "外部方发探针，要硬件签名的即时回应。",
    metaphor: "打电话问“那边天气？”——回答随电话硬件签名且带时间戳。",
    facts: [
      { label: "往返", value: "毫秒到秒" },
      { label: "频率", value: "随机限速" },
      { label: "组合", value: "证明 + GPU 画像" },
    ],
    comparison: "从“信我 GPU 在跑”到“这是 200ms 前证明链出的回应”。",
    sections: [
      {
        heading: "如何工作",
        body: "审计发新鲜 nonce；目标在 TEE/机密 GPU 内跑小型证明负载，返回含 nonce、结果与栈测量的签名报告。",
      },
      {
        heading: "提升门槛",
        body: "静态日志可后补；实时挑战不行——时间窗口与 nonce 由审计控制。",
      },
    ],
    whoCanSee: "运营同意开放探针的对象——多为监管或独立审计。",
    howToFake: "需预测 nonce 或转发到另一台证明机——可被检测。",
    howToVerify: "验响应内签名；核对发送的 nonce；时序与地理位置合理。",
  },
  satellite: {
    ...LAYERS_BY_ID.satellite,
    label: "卫星与公开档案",
    shortDesc: "运营方之外：卫星热像、电网申报、许可证、海关。",
    metaphor: "园区藏不住废热，也藏不住 50 MW 升压站与报关单。",
    facts: [
      { label: "来源", value: "Sentinel/Landsat、FERC、EIA、海关等" },
      { label: "更新", value: "天到周" },
      { label: "成本", value: "多数公开或低价" },
    ],
    comparison: "100 MW 设施在 90m 热像上就是热点——免费 Sentinel 也能看。",
    sections: [
      {
        heading: "从外面能看什么",
        body: "屋顶热特征、冷却塔羽流、商业影像里的变电站施工、许可文件点名负荷、并网文件、GPU 报关。",
      },
      {
        heading: "为何锚定一切",
        body: "这些信号不需要运营配合；与内部细粒度遥测必须在粗尺度上一致。",
      },
    ],
    whoCanSee: "公众；部分需订阅或信息公开申请。",
    howToFake: "同时串通电网、监管、海关、航天机构——不现实。",
    howToVerify: "自行拉取数据；对报关 GPU 数量与申报 MW 与内部叙述交叉。",
  },
};

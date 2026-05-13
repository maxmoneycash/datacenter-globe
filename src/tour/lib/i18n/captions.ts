import type { Locale } from "./locale";
import type { StopId } from "@tour/lib/types";
import { TOUR_STOPS } from "@tour/lib/tour";

/** Tour narration line shown in the glass caption bar. */
export const CAPTION_ZH: Record<StopId, string> = {
  site: "欢迎。这是一座现代 AI 数据中心——一座把电变成智能的建筑。",
  power: "市电在这里降压、净化，并在到达任意一块 GPU 之前由电池托住。",
  cooling: "在建筑之外，冷却塔把 GPU 即将产生的热量排到大气里。",
  hall: "室内是计算机房：成百上千台一模一样的机柜，按冷热通道排布。",
  rack: "一台机柜——NVIDIA GB200 NVL72——把 72 颗 Blackwell GPU 塞进一台液冷柜。",
  node: "在托盘内部：4 颗 GPU 与 2 颗 CPU，用 NVLink 以每 GPU 1.8 TB/s 连在一起。",
  network: "单机柜之外，脊叶网络把成千上万 GPU 连成一颗训练集群。",
  storage: "最后是存储——PB 级闪存，喂给 GPU 们要读的数据。",
  "hw-inventory":
    "这里的每颗芯片、每台交换机都有序列号——也在资产数据库里占一行。",
  scheduler:
    "调度器是空管日志：谁拿到了哪些 GPU、何时、持续多久。",
  "cloud-billing":
    "云 API 与计费日志——运营方在结构上最有动机保持准确的一类信号。",
  "gpu-util":
    "每颗 GPU 的实时指标：利用率、功耗、显存、温度——千瓦级仪表盘。",
  "gpu-profile":
    "硬件性能计数器刻画负载特征——矩阵乘还是 memcpy，训练还是推理。",
  "nvlink-counters":
    "机柜内，NVSwitch ASIC 计量 GPU 之间的每一字节——全规约时每秒 TB 级。",
  "fabric-counters":
    "跨机柜的叶脊交换机计数器，注视着训练洪流的东向西行。",
  "rack-power":
    "智能 PDU 实时读取每一台机柜——而园区总表也在读整个园区。",
  "cooling-telemetry":
    "冷却剂流量与温差必须和电力对上——进去的功率要以热的形式出来。",
  "host-process":
    "GPU 之下是主机：内核、容器、——信任深度只到引导链能锚定之处。",
  "object-access":
    "对数据集桶的每一次读取都会留下一行——PB 级训练数据，全部有日志。",
  "ml-training":
    "任务自身会回传——损失曲线、评测分、检查点哈希，第三方可重放核对。",
  attestation:
    "硬件签名陈述正在运行什么代码——这里唯一不必盲信运营方的信号。",
  "challenge-probe":
    "外部审计方发送全新随机数；现场、签名、硬件根的回答会回来。",
  satellite:
    "从轨道上你无法藏起 100 MW 变电站、热羽流或海关台账——公共信号锚定其余一切。",
};

export function getTourCaption(stopId: StopId, locale: Locale): string {
  if (locale === "zh") {
    const z = CAPTION_ZH[stopId];
    if (z) return z;
  }
  const s = TOUR_STOPS.find((x) => x.id === stopId);
  return s?.caption ?? "";
}

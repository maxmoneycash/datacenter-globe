import type { LayerCategory } from "@tour/lib/types";
import type { Locale } from "./locale";

export type UiDictionary = {
  appTitle: string;
  appSubtitle: string;
  tour: string;
  free: string;
  language: string;
  english: string;
  chinese: string;
  chapterBuilding: string;
  chapterStack: string;
  stopOf: string;
  stopTotalJoin: string;
  layerPanelShow: string;
  layerPanelHide: string;
  introKicker: string;
  introTitleBefore: string;
  introTitleAfter: string;
  introBody: string;
  startTour: string;
  exploreFree: string;
  introTip: string;
  freeHintDrag: string;
  freeHintClick: string;
  loading: string;
  detailClose: string;
  detailVerificationTriple: string;
  detailWho: string;
  detailFake: string;
  detailVerify: string;
  detailReplay: string;
  detailNoAnim: string;
  detailNext: string;
  detailAttestable: string;
  detailSoft: string;
  detailLayerBadgeAttest: string;
  detailLayerBadgeSoft: string;
  detailModuleN: string;
  detailLayerN: string;
  detailGlossary: string;
  detailOf: string;
  ariaGoTo: string;
  category: Record<LayerCategory, string>;
  ariaPrev: string;
  ariaPlay: string;
  ariaPause: string;
  ariaNext: string;
  ariaRestart: string;
};

const EN: UiDictionary = {
  appTitle: "Inside an AI Data Center",
  appSubtitle: "An interactive 3D walkthrough",
  tour: "Tour",
  free: "Free",
  language: "Language",
  english: "EN",
  chinese: "中文",
  chapterBuilding: "Building",
  chapterStack: "Verifiable stack",
  stopOf: "Stop",
  stopTotalJoin: "of",
  layerPanelShow: "Who can see · how to fake · how to verify",
  layerPanelHide: "Hide",
  introKicker: "Interactive 3D Walkthrough",
  introTitleBefore: "Inside an ",
  introTitleAfter: " Data Center",
  introBody:
    "Two chapters, 23 stops, about seven minutes. First the building — power, cooling, racks, GPUs. Then the verifiable stack — who can see what really happens in here, how it could be faked, and how to check.",
  startTour: "Start guided tour",
  exploreFree: "Explore freely",
  introTip: "Tip: in Tour mode, press space to pause, ← / → to step.",
  freeHintDrag: "Drag to orbit · scroll to zoom",
  freeHintClick: "Click any tag to learn more",
  loading: "Booting the data center…",
  detailClose: "Close",
  detailVerificationTriple: "Verification triple",
  detailWho: "Who can see",
  detailFake: "How to fake",
  detailVerify: "How to verify",
  detailReplay: "Replay animation",
  detailNoAnim: "No animation",
  detailNext: "Next module",
  detailAttestable: "Cryptographically attestable",
  detailSoft: "Trust-the-operator signal",
  detailLayerBadgeAttest: "attestable",
  detailLayerBadgeSoft: "soft",
  detailModuleN: "Module",
  detailLayerN: "Layer",
  detailGlossary: "Glossary",
  detailOf: "of",
  ariaGoTo: "Go to",
  category: {
    control: "Control plane",
    hardware: "Hardware telemetry",
    facility: "Facility",
    software: "Software & data",
    verify: "Cryptographic verification",
    external: "External signals",
  },
  ariaPrev: "Previous",
  ariaPlay: "Play",
  ariaPause: "Pause",
  ariaNext: "Next",
  ariaRestart: "Restart tour",
};

const ZH: UiDictionary = {
  appTitle: "走进 AI 数据中心",
  appSubtitle: "交互式 3D 导览",
  tour: "导览",
  free: "自由",
  language: "语言",
  english: "EN",
  chinese: "中文",
  chapterBuilding: "建筑",
  chapterStack: "可验证栈",
  stopOf: "第",
  stopTotalJoin: "站，共",
  layerPanelShow: "谁能看见 · 如何造假 · 如何核验",
  layerPanelHide: "收起",
  introKicker: "交互式 3D 导览",
  introTitleBefore: "走进 ",
  introTitleAfter: " 数据中心",
  introBody:
    "两章、共 23 站，大约七分钟。先看建筑——电、冷、机柜与 GPU；再看「可验证栈」——谁能看见真实发生的事、可能怎样伪造、以及怎样独立核对。",
  startTour: "开始导览",
  exploreFree: "自由探索",
  introTip: "提示：导览模式下，空格暂停，← / → 换站。",
  freeHintDrag: "拖拽旋转 · 滚轮缩放",
  freeHintClick: "点击标签了解详情",
  loading: "正在加载数据中心…",
  detailClose: "关闭",
  detailVerificationTriple: "验证三问",
  detailWho: "谁能看见",
  detailFake: "如何造假",
  detailVerify: "如何核验",
  detailReplay: "重播动画",
  detailNoAnim: "无动画",
  detailNext: "下一模块",
  detailAttestable: "可作密码学证明",
  detailSoft: "依赖运营方诚信的信号",
  detailLayerBadgeAttest: "可证",
  detailLayerBadgeSoft: "软",
  detailModuleN: "模块",
  detailLayerN: "图层",
  detailGlossary: "术语",
  detailOf: "/",
  ariaGoTo: "前往",
  category: {
    control: "控制面",
    hardware: "硬件遥测",
    facility: "设施",
    software: "软件与数据",
    verify: "密码学验证",
    external: "外部信号",
  },
  ariaPrev: "上一站",
  ariaPlay: "播放",
  ariaPause: "暂停",
  ariaNext: "下一站",
  ariaRestart: "重新开始导览",
};

export const UI: Record<Locale, UiDictionary> = {
  en: EN,
  zh: ZH,
};

export function getUi(locale: Locale): UiDictionary {
  return UI[locale] ?? EN;
}

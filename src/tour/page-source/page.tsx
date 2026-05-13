"use client";

import dynamic from "next/dynamic";
import { TopBar } from "@tour/components/ui/TopBar";
import { Caption } from "@tour/components/ui/Caption";
import { TourControls } from "@tour/components/ui/TourControls";
import { DetailPanel } from "@tour/components/ui/DetailPanel";
import { IntroOverlay } from "@tour/components/ui/IntroOverlay";
import { FreeModeHint } from "@tour/components/ui/FreeModeHint";
import { Keyboard } from "@tour/components/ui/Keyboard";
import { CanvasLoading } from "@tour/components/ui/CanvasLoading";
import { LocaleHydration } from "@tour/components/ui/LocaleHydration";

const Scene = dynamic(
  () => import("@tour/components/scene/Scene").then((m) => m.Scene),
  {
    ssr: false,
    loading: () => <CanvasLoading />,
  },
);

export default function Home() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#07090d] text-white">
      <LocaleHydration />
      <Scene />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_55%,rgba(0,0,0,0.45)_100%)]" />

      <TopBar />
      <Caption />
      <TourControls />
      <FreeModeHint />
      <DetailPanel />
      <IntroOverlay />
      <Keyboard />
    </main>
  );
}

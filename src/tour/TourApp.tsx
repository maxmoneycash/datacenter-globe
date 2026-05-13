'use client';

import dynamic from 'next/dynamic';
import { TopBar } from '@tour/components/ui/TopBar';
import { Caption } from '@tour/components/ui/Caption';
import { TourControls } from '@tour/components/ui/TourControls';
import { DetailPanel } from '@tour/components/ui/DetailPanel';
import { IntroOverlay } from '@tour/components/ui/IntroOverlay';
import { FreeModeHint } from '@tour/components/ui/FreeModeHint';
import { Keyboard } from '@tour/components/ui/Keyboard';
import { CanvasLoading } from '@tour/components/ui/CanvasLoading';
import { LocaleHydration } from '@tour/components/ui/LocaleHydration';

const Scene = dynamic(
  () => import('@tour/components/scene/Scene').then((m) => m.Scene),
  { ssr: false, loading: () => <CanvasLoading /> }
);

interface TourAppProps {
  /** Datacenter info shown in the back/header bar. */
  datacenter?: { name: string; company: string; country: string };
  /** Called when the user closes the tour to return to the previous view. */
  onClose?: () => void;
}

export default function TourApp({ datacenter, onClose }: TourAppProps) {
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

      {datacenter && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="px-4 py-2 rounded-full glass text-xs flex items-center gap-3">
            <span className="text-white/50 uppercase tracking-widest">Touring</span>
            <span className="font-semibold text-white">{datacenter.name}</span>
            <span className="text-white/40">·</span>
            <span className="text-[#facc15]">{datacenter.company}</span>
            <span className="text-white/40">·</span>
            <span className="text-white/60">{datacenter.country}</span>
          </div>
        </div>
      )}

      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-50 px-3 py-1.5 rounded glass text-xs uppercase tracking-widest text-white/70 hover:text-[#ff9f43] transition-colors"
        >
          ← Back to map
        </button>
      )}
    </main>
  );
}

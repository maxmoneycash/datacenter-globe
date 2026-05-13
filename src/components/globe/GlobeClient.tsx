'use client';

import dynamic from 'next/dynamic';

const GlobeDashboard = dynamic(() => import('./GlobeDashboard'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-black flex items-center justify-center">
      <p
        className="animate-pulse tracking-widest text-sm"
        style={{ color: '#ff9f43', fontFamily: 'JetBrains Mono, monospace' }}
      >
        LOADING DATACENTER TELEMETRY…
      </p>
    </div>
  ),
});

export default function GlobeClient() {
  return <GlobeDashboard />;
}

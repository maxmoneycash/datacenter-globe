import React from 'react';

interface Props {
  totalSites: number;
  totalCountries: number;
}

const Legend: React.FC<Props> = ({ totalSites, totalCountries }) => {
  return (
    <div className="absolute bottom-8 left-8 z-10 p-4 bg-[#0c0c0e]/75 backdrop-blur-md border border-white/10 rounded-lg text-xs font-mono select-none pointer-events-none">
      <h3 className="mb-2 text-gray-400 font-bold uppercase tracking-widest">Datacenter Density</h3>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
          <span>&ge; 200 (Hyperscale Hub)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#fb923c] opacity-90"></div>
          <span>50 – 199 (High Density)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#facc15] opacity-80"></div>
          <span>10 – 49 (Medium Density)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#4ade80] opacity-60"></div>
          <span>1 – 9 (Low Density)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#4b5563] opacity-60"></div>
          <span>No Data</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/10">
        <h3 className="mb-1 text-gray-400 font-bold uppercase tracking-widest">Data Source</h3>
        <p className="text-gray-500">Ringmast4r / Global-Data-Center-Map</p>
        <p className="text-gray-500 mt-1">
          {totalSites.toLocaleString()} sites · {totalCountries} countries
        </p>
      </div>
    </div>
  );
};

export default Legend;

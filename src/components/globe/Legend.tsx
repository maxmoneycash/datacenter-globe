import React from 'react';
import { HUD_PANEL } from './hud';

interface Props {
  totalSites: number;
  totalCountries: number;
  preciseSites: number;
  /** Pins the current zoom level reveals — see lod.ts. */
  visibleAtZoom: number;
  /** Pins eligible to be drawn under the active filters. */
  pinTotal: number;
}

const Legend: React.FC<Props> = ({
  totalSites,
  totalCountries,
  preciseSites,
  visibleAtZoom,
  pinTotal,
}) => {
  return (
    <div className={`p-4 text-xs font-mono select-none pointer-events-auto ${HUD_PANEL}`}>
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

      {/* Explains why the globe is sparse at world zoom instead of leaving the
          user to assume the data is missing. */}
      {visibleAtZoom > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <h3 className="mb-1 text-gray-400 font-bold uppercase tracking-widest">Shown at this zoom</h3>
          <p className="text-gray-500 tabular-nums">
            {visibleAtZoom >= pinTotal
              ? `all ${pinTotal.toLocaleString()} pins shown`
              : `${visibleAtZoom.toLocaleString()} of ${pinTotal.toLocaleString()} pins · zoom in for more`}
          </p>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-white/10">
        <h3 className="mb-1 text-gray-400 font-bold uppercase tracking-widest">Data Sources</h3>
        <p className="text-gray-500">
          Data centers ©{' '}
          <a
            href="https://github.com/Ringmast4r/Global-Data-Center-Map"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-white/20 hover:text-gray-300"
          >
            Ringmast4r / Global-Data-Center-Map
          </a>
        </p>
        <p className="text-gray-500">
          Geocoding{' '}
          <a
            href="https://www.geonames.org/"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-white/20 hover:text-gray-300"
          >
            GeoNames
          </a>{' '}
          (CC BY 4.0)
        </p>
        <p className="text-gray-500 mt-1">
          {totalSites.toLocaleString()} sites · {totalCountries} countries
        </p>
        <p className="text-gray-500">
          {preciseSites.toLocaleString()} mapped to city accuracy or better
        </p>
      </div>
    </div>
  );
};

export default Legend;

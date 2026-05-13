import React, { useEffect, useState } from 'react';

const FpsCounter: React.FC = () => {
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const loop = () => {
      const currentTime = performance.now();
      frameCount++;

      if (currentTime - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm font-mono text-seismic-orange bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10 pointer-events-auto select-none shadow-lg">
      <div className={`w-2 h-2 rounded-full ${fps > 50 ? 'bg-seismic-orange' : fps > 30 ? 'bg-yellow-500' : 'bg-red-500'} animate-pulse shadow-[0_0_8px_currentColor]`} />
      <span className="tracking-widest">{fps} FPS</span>
    </div>
  );
};

export default FpsCounter;
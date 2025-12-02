import React from 'react';

interface UIProps {
  color: string;
  setColor: (c: string) => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

const UI: React.FC<UIProps> = ({ color, setColor, isFullscreen, toggleFullscreen }) => {
  return (
    <div className="absolute top-4 right-4 z-50 flex flex-col gap-4 p-4 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 text-white">
      <h1 className="text-lg font-bold tracking-wider">Particle Control</h1>
      
      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase text-gray-400">Base Color</label>
        <input 
          type="color" 
          value={color} 
          onChange={(e) => setColor(e.target.value)}
          className="w-full h-10 rounded cursor-pointer border-0"
        />
      </div>

      <button 
        onClick={toggleFullscreen}
        className="px-4 py-2 bg-white/10 hover:bg-white/20 transition rounded text-sm font-medium"
      >
        {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      </button>
    </div>
  );
};

export default UI;
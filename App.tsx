import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import WebcamBackground from './components/WebcamBackground';
import ParticleField from './components/ParticleField';
import UI from './components/UI';
import { HandResult } from './types';

const App: React.FC = () => {
  const [handData, setHandData] = useState<HandResult | null>(null);
  const [userColor, setUserColor] = useState('#00FFFF');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden font-sans">
      {/* 1. Camera Feed & 2D Hand Overlays */}
      <WebcamBackground onHandData={setHandData} />

      {/* 2. 3D Scene Overlay */}
      <div className="absolute top-0 left-0 w-full h-full z-20 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          
          <ParticleField handData={handData} userColor={userColor} />
        </Canvas>
      </div>

      {/* 3. UI Layer */}
      <UI 
        color={userColor} 
        setColor={setUserColor} 
        isFullscreen={isFullscreen} 
        toggleFullscreen={toggleFullscreen}
      />
    </div>
  );
};

export default App;
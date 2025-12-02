import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import WebcamBackground from './components/WebcamBackground';
import ParticleField from './components/ParticleField';
import UI from './components/UI';
import { HandResult } from './types';

// Simple Error Boundary to catch React Rendering errors (like 3D context crash)
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'white', padding: '20px', background: 'black', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <h1>Something went wrong.</h1>
          <p style={{ color: 'red' }}>{this.state.error}</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px', background: '#333', color: 'white' }}>Reload Page</button>
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  const [handData, setHandData] = useState<HandResult | null>(null);
  const [userColor, setUserColor] = useState('#00FFFF');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      }).then(() => setIsFullscreen(true));
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
      <ErrorBoundary>
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
      </ErrorBoundary>
    </div>
  );
};

export default App;
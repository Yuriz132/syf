import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { HandResult } from '../types';

interface WebcamBackgroundProps {
  onHandData: (data: HandResult) => void;
}

const WebcamBackground: React.FC<WebcamBackgroundProps> = ({ onHandData }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number | null>(null);
  const [status, setStatus] = useState<string>('Initializing AI...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initMediaPipe = async () => {
      try {
        setStatus('Loading Vision Models...');
        
        // Use 'latest' to avoid version mismatches with the npm package
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        
        if (!isMounted) return;

        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });

        if (isMounted) {
            setStatus('Starting Camera...');
            await startWebcam();
        }
      } catch (err: any) {
        console.error("MediaPipe Init Error:", err);
        if (isMounted) setError(`AI Init Failed: ${err.message || err}`);
      }
    };

    const startWebcam = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Camera API not available. Please use HTTPS.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user' }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Wait for data to be loaded
          videoRef.current.onloadeddata = () => {
             if (isMounted) {
                 setStatus(''); // Clear loading text
                 predictWebcam();
             }
          };
        }
      } catch (err: any) {
        console.error("Camera Error:", err);
        if (isMounted) setError(`Camera Error: ${err.message || 'Permission denied'}`);
      }
    };

    initMediaPipe();

    return () => {
      isMounted = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
      }
      if (handLandmarkerRef.current) {
          handLandmarkerRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const predictWebcam = async () => {
    if (!handLandmarkerRef.current || !videoRef.current || !canvasRef.current) return;
    
    // Ensure video is playing and has data
    if (videoRef.current.currentTime > 0 && !videoRef.current.paused && !videoRef.current.ended) {
      const startTimeMs = performance.now();
      try {
          const results = handLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);

          // Pass data up for 3D interaction
          onHandData({
              landmarks: results.landmarks,
              worldLandmarks: results.worldLandmarks,
              handedness: results.handedness
          });

          // Draw 2D Overlay
          drawLandmarks(results.landmarks);
      } catch (e) {
          console.warn("Detection error:", e);
      }
    }
    
    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  const drawLandmarks = (landmarksArray: any[]) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas size to video size
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Mirror transform to match the mirrored CSS of video
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);

    for (const landmarks of landmarksArray) {
      // Draw Connections (Cyan)
      drawConnectors(ctx, landmarks, HandLandmarker.HAND_CONNECTIONS, { color: '#00FFFF', lineWidth: 3 });
      // Draw Points (Cyan)
      for (const point of landmarks) {
        ctx.beginPath();
        ctx.arc(point.x * canvas.width, point.y * canvas.height, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#00FFFF';
        ctx.fill();
      }
    }
    ctx.restore();
  };

  // Helper to draw lines
  const drawConnectors = (ctx: CanvasRenderingContext2D, landmarks: any[], connections: any[], style: any) => {
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.lineWidth;
      for (const connection of connections) {
          const from = landmarks[connection[0]];
          const to = landmarks[connection[1]];
          if (from && to) {
            ctx.beginPath();
            ctx.moveTo(from.x * ctx.canvas.width, from.y * ctx.canvas.height);
            ctx.lineTo(to.x * ctx.canvas.width, to.y * ctx.canvas.height);
            ctx.stroke();
          }
      }
  };

  return (
    <>
      {/* Loading / Error Overlay */}
      {(status || error) && (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center z-50 bg-black/80 text-white pointer-events-none">
            <div className="text-center">
                {error ? (
                    <div className="text-red-500 font-bold text-xl mb-2">Error</div>
                ) : (
                    <div className="animate-pulse text-cyan-400 font-bold text-xl mb-2">Initialize</div>
                )}
                <p>{error || status}</p>
            </div>
        </div>
      )}

      {/* Video is hidden or behind, we use canvas to verify alignment or just show video directly */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted
        className="absolute top-0 left-0 w-full h-full object-cover -scale-x-100" // Mirror effect
        style={{ zIndex: 0 }}
      />
      <canvas 
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full object-cover" 
        style={{ zIndex: 10, pointerEvents: 'none' }} 
      />
    </>
  );
};

export default WebcamBackground;

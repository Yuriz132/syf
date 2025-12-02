import { HandLandmark } from '../types';

// Helper to calculate Euclidean distance between two 3D points
const distance = (a: HandLandmark, b: HandLandmark) => {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2));
};

// Check if a finger is extended (tip is further from wrist than PIP joint)
const isFingerExtended = (landmarks: HandLandmark[], tipIdx: number, pipIdx: number) => {
  // We use the wrist (0) as a reference point for orientation usually, 
  // but comparing distance to wrist works for general extension.
  // A better simple check: is the tip above the PIP in local hand space?
  // For simplicity in screen space (y is inverted usually), we use distance from wrist.
  const wrist = landmarks[0];
  const tip = landmarks[tipIdx];
  const pip = landmarks[pipIdx];
  
  return distance(wrist, tip) > distance(wrist, pip);
};

export const detectGesture = (landmarks: HandLandmark[]): string => {
  if (!landmarks || landmarks.length === 0) return 'unknown';

  const thumbOpen = isFingerExtended(landmarks, 4, 2); // Compare tip to MCP for thumb slightly different
  const indexOpen = isFingerExtended(landmarks, 8, 6);
  const middleOpen = isFingerExtended(landmarks, 12, 10);
  const ringOpen = isFingerExtended(landmarks, 16, 14);
  const pinkyOpen = isFingerExtended(landmarks, 20, 18);

  const openCount = [thumbOpen, indexOpen, middleOpen, ringOpen, pinkyOpen].filter(Boolean).length;

  // Specific Logic for prompt requirements
  
  // '5' - All open
  if (openCount === 5) return '5';
  
  // '1' - Only Index
  if (indexOpen && !middleOpen && !ringOpen && !pinkyOpen) return '1';

  // '2' - Index and Middle (Victory)
  if (indexOpen && middleOpen && !ringOpen && !pinkyOpen) return '2';

  // 'Fist' / Grasp - mostly closed
  if (openCount <= 1 && !indexOpen) return 'fist';

  return 'unknown';
};

// Generate points from text using a canvas
export const generateTextParticles = (text: string, width: number, height: number, density: number = 6): Float32Array => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return new Float32Array(0);

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);
  
  ctx.fillStyle = 'white';
  ctx.font = 'bold 120px "Microsoft YaHei", "Heiti SC", sans-serif'; // Support Chinese
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const positions: number[] = [];

  // Scan pixels
  for (let y = 0; y < height; y += density) {
    for (let x = 0; x < width; x += density) {
      const index = (y * width + x) * 4;
      // If pixel is bright (white text)
      if (data[index] > 128) {
        // Add random jitter to break grid structure
        // Reduced jitter factor to make text tighter (0.3 instead of 1.0)
        const jitterX = (Math.random() - 0.5) * density * 0.3;
        const jitterY = (Math.random() - 0.5) * density * 0.3;

        // Normalize coordinates to -10 to 10 range (approx world space)
        const nX = ((x + jitterX) / width - 0.5) * 20;
        const nY = -((y + jitterY) / height - 0.5) * 20 * (height/width); // Aspect correction
        
        // Reduced depth variation for sharper text
        const nZ = (Math.random() - 0.5) * 0.2;

        positions.push(nX, nY, nZ);
      }
    }
  }

  return new Float32Array(positions);
};
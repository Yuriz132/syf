export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandResult {
  landmarks: HandLandmark[][];
  worldLandmarks: HandLandmark[][];
  handedness: { index: number; score: number; categoryName: string; displayName: string }[][];
}

export enum AppState {
  IDLE = 'IDLE', // No hands or hands far away
  INTERACTIVE = 'INTERACTIVE', // Hands near, changing color/repelling
  TEXT_MODE = 'TEXT_MODE', // Forming text
}

export interface DetectedGesture {
  left: string | null; // '1', '2', '5', 'fist', 'open'
  right: string | null;
}

export interface ParticleConfig {
  color: string;
  count: number;
}
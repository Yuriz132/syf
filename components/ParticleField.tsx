import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { HandResult, AppState } from '../types';
import { detectGesture, generateTextParticles } from '../utils/gestureUtils';

interface ParticleFieldProps {
  handData: HandResult | null;
  userColor: string;
}

const COUNT = 8000; // Number of particles

const ParticleField: React.FC<ParticleFieldProps> = ({ handData, userColor }) => {
  const mesh = useRef<THREE.Points>(null);
  const { viewport } = useThree();
  
  // Particle State
  const particles = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const target = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    
    // Initial sphere shape
    for (let i = 0; i < COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const r = 4 + Math.random() * 2; // Initial radius
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      target[i * 3] = x;
      target[i * 3 + 1] = y;
      target[i * 3 + 2] = z;

      // Initial Cyan
      const color = new THREE.Color('#00FFFF');
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return { pos, target, colors };
  }, []);

  // Text Geometries Cache
  const textGeometries = useMemo(() => {
    // We generate point clouds for the required phrases
    const w = 1024;
    const h = 512;
    
    return {
      'HELLO': generateTextParticles('大家好', w, h),
      'YUFU': generateTextParticles('我是玉福', w, h),
      'WITHME': generateTextParticles('和我一起', w, h),
      'PHOTO': generateTextParticles('走进摄影世界', w, h),
    };
  }, []);

  const [currentColor, setCurrentColor] = useState(new THREE.Color(userColor));
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  // Sync user color from UI if it changes explicitly
  useEffect(() => {
    setCurrentColor(new THREE.Color(userColor));
  }, [userColor]);

  useFrame((state, delta) => {
    if (!mesh.current || !groupRef.current) return;
    timeRef.current += delta;

    const positions = mesh.current.geometry.attributes.position.array as Float32Array;
    const colors = mesh.current.geometry.attributes.color.array as Float32Array;
    
    // 1. Analyze Hands & Determine State
    const hands = handData?.landmarks || [];
    const handCount = hands.length;
    
    let activeTextTarget: Float32Array | null = null;
    let targetColor = new THREE.Color(userColor); // Default user selected
    let interactionMode = AppState.IDLE;
    let rotationSpeed = 0.2;
    let diffusion = 1.0;
    
    // Map hand centroids to world space (approximate) for gesture logic
    const worldHands = hands.map(hand => {
        // Average point of palm
        const cx = hand[0].x + hand[5].x + hand[17].x;
        const cy = hand[0].y + hand[5].y + hand[17].y;
        return {
            x: (0.5 - cx/3) * viewport.width, // Invert X for mirror effect
            y: (0.5 - cy/3) * viewport.height,
            rawX: cx/3,
            gesture: detectGesture(hand)
        };
    });

    // Create detailed interaction points for physics (Fingertips + Palm)
    const interactionPoints: {x: number, y: number}[] = [];
    hands.forEach(hand => {
        // Tips: Thumb(4), Index(8), Middle(12), Ring(16), Pinky(20) + Palm Center(9)
        const indices = [4, 8, 12, 16, 20, 9];
        indices.forEach(idx => {
            const p = hand[idx];
            interactionPoints.push({
                x: (0.5 - p.x) * viewport.width,
                y: (0.5 - p.y) * viewport.height
            });
        });
    });

    if (handCount > 0) {
        if (handCount === 1) {
            const h = worldHands[0];
            // Check for single hand 5 -> "大家好"
            if (h.gesture === '5') {
                 activeTextTarget = textGeometries['HELLO'];
                 interactionMode = AppState.TEXT_MODE;
            } 
            
            // Prompt 5: Single hand control (Only if not in text mode)
            if (interactionMode !== AppState.TEXT_MODE) {
                interactionMode = AppState.INTERACTIVE; 
                
                // Rotation Control
                if (h.rawX < 0.2) {
                    groupRef.current.rotation.y += 2 * delta; 
                } else if (h.rawX > 0.8) {
                    groupRef.current.rotation.y -= 2 * delta; 
                } else {
                    groupRef.current.rotation.y += 0.1 * delta;
                }

                // Diffusion / Scale based on open/close
                const l = hands[0];
                const palmSize = Math.sqrt(Math.pow(l[0].x - l[5].x, 2) + Math.pow(l[0].y - l[5].y, 2));
                const spread = Math.sqrt(Math.pow(l[4].x - l[20].x, 2) + Math.pow(l[4].y - l[20].y, 2));
                
                const ratio = spread / palmSize; 
                const normalizedOpen = Math.min(Math.max((ratio - 1.0) / 2.0, 0), 1);
                
                diffusion = 1.0 + (normalizedOpen * 3.0); 
                rotationSpeed = 0.2 + (normalizedOpen * 2.0);
                
                groupRef.current.rotation.y += rotationSpeed * delta;
            }

        } else if (handCount === 2) {
             const g1 = worldHands[0].gesture;
             const g2 = worldHands[1].gesture;
             
             // Prompt 3 Logic
             if ((g1 === '1' && g2 === '1')) {
                 activeTextTarget = textGeometries['YUFU'];
                 interactionMode = AppState.TEXT_MODE;
             } else if ((g1 === '2' && g2 === '2')) {
                 activeTextTarget = textGeometries['WITHME'];
                 interactionMode = AppState.TEXT_MODE;
             } else if ((g1 === '5' && g2 === '5')) {
                 activeTextTarget = textGeometries['PHOTO'];
                 interactionMode = AppState.TEXT_MODE;
             } else {
                 // Two hands present but no text gesture -> Interactive Color Mode
                 interactionMode = AppState.INTERACTIVE;
                 
                 const avgDist = (Math.abs(worldHands[0].x) + Math.abs(worldHands[0].y) + Math.abs(worldHands[1].x) + Math.abs(worldHands[1].y)) / 4;
                 
                 if (avgDist < 3.5) {
                     targetColor.set('#FFFFFF');
                 } else if (avgDist < 8) {
                     targetColor.set('#FF0000');
                 } else {
                     targetColor.set('#00FFFF');
                 }
             }
        }
    } else {
        targetColor.set('#00FFFF');
    }

    // Force rotation reset if in Text Mode so it's readable
    if (interactionMode === AppState.TEXT_MODE) {
        // Smoothly lerp rotation back to 0
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, delta * 3);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, delta * 3);
        groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, delta * 3);
    }

    // Interpolate Color
    currentColor.lerp(targetColor, 0.1);
    const r = currentColor.r;
    const g = currentColor.g;
    const b = currentColor.b;
    
    const isHolding = interactionMode === AppState.INTERACTIVE && targetColor.r > 0.95 && targetColor.g > 0.95 && targetColor.b > 0.95;

    // Center of hands for holding evasion global calculation
    const handCenter = new THREE.Vector3();
    if (handCount > 0) {
        let sumX = 0, sumY = 0;
        worldHands.forEach(h => { sumX += h.x; sumY += h.y; });
        handCenter.set(sumX / handCount, sumY / handCount, 0);
    }

    for (let i = 0; i < COUNT; i++) {
        const ix = i * 3;
        const iy = i * 3 + 1;
        const iz = i * 3 + 2;

        let tx = 0, ty = 0, tz = 0;

        // 1. Calculate Target Position based on Mode
        if (interactionMode === AppState.TEXT_MODE && activeTextTarget && activeTextTarget.length > 0) {
            const textIdx = (i % (activeTextTarget.length / 3)) * 3;
            tx = activeTextTarget[textIdx];
            ty = activeTextTarget[textIdx + 1];
            tz = activeTextTarget[textIdx + 2];

            // Reduced spread to tighten text (0.04 instead of 0.12)
            const spread = 0.04;
            tx += Math.sin(i * 0.5) * spread;
            ty += Math.cos(i * 0.9) * spread;
            tz += Math.sin(i * 1.2) * spread;

        } else {
            // Sphere/Cloud Mode
            const baseTx = particles.target[ix] * diffusion;
            const baseTy = particles.target[iy] * diffusion;
            const baseTz = particles.target[iz] * diffusion;
            
            let noiseX = Math.sin(timeRef.current * 2 + i * 0.1) * 0.2;
            let noiseY = Math.cos(timeRef.current * 2 + i * 0.1) * 0.2;
            let noiseZ = 0;

            if (isHolding) {
                // "Shape changes back and forth"
                // Rapidly morphing noise
                const morphSpeed = 8.0;
                const morphAmp = 2.0;
                noiseX += Math.sin(timeRef.current * morphSpeed + iy * 0.1) * morphAmp;
                noiseY += Math.cos(timeRef.current * morphSpeed + ix * 0.1) * morphAmp;
                noiseZ += Math.sin(timeRef.current * morphSpeed + iz * 0.1) * morphAmp;

                // "Let me not touch it" - Chaotic jitter
                noiseX += (Math.random() - 0.5) * 1.5;
                noiseY += (Math.random() - 0.5) * 1.5;
                noiseZ += (Math.random() - 0.5) * 1.5;
            }

            tx = baseTx + noiseX;
            ty = baseTy + noiseY;
            tz = baseTz + noiseZ;
        }

        // 2. Apply Interaction / Repulsion Forces
        // Applied to ALL modes so text can be touched by any finger
        if (interactionPoints.length > 0) {
             // Iterate through all fingertips and palm centers
             for (const point of interactionPoints) {
                 const dx = positions[ix] - point.x;
                 const dy = positions[iy] - point.y;
                 const dz = positions[iz] - 0; 
                 
                 const distSq = dx*dx + dy*dy + dz*dz;
                 
                 // Radius settings
                 let radius = 3.5;
                 let forceMulti = 3.0; // Moderate force per finger

                 if (interactionMode === AppState.TEXT_MODE) {
                     radius = 1.5; // Precise touch for text
                     forceMulti = 8.0; // Snappy reaction
                 } else if (isHolding) {
                     radius = 8.0; // Large avoidance radius
                     forceMulti = 15.0; // Strong force
                 }

                 const radiusSq = radius * radius;
                 
                 if (distSq < radiusSq) {
                     const force = (1.0 - distSq / radiusSq); 
                     
                     tx += dx * force * forceMulti;
                     ty += dy * force * forceMulti;
                     tz += dz * force * forceMulti;
                 }
             }

             // Special "Global Flee" for Holding
             // Keeps the core logic of running away from the "trap" of hands
             if (isHolding) {
                 const dx = positions[ix] - handCenter.x;
                 const dy = positions[iy] - handCenter.y;
                 const dist = Math.sqrt(dx*dx + dy*dy) || 0.1;
                 
                 const spiralX = -dy;
                 const spiralY = dx;

                 tx += (dx / dist) * 8.0; // Push out from center
                 ty += (dy / dist) * 8.0;
                 
                 tx += (spiralX / dist) * 4.0 * Math.sin(timeRef.current * 5); // Swirl
                 ty += (spiralY / dist) * 4.0 * Math.sin(timeRef.current * 5);
             }
        }

        // Physics Update (Lerp)
        const speed = isHolding ? 0.15 : 0.1;
        
        positions[ix] += (tx - positions[ix]) * speed;
        positions[iy] += (ty - positions[iy]) * speed;
        positions[iz] += (tz - positions[iz]) * speed;

        colors[ix] = r;
        colors[iy] = g;
        colors[iz] = b;
    }

    mesh.current.geometry.attributes.position.needsUpdate = true;
    mesh.current.geometry.attributes.color.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      <points ref={mesh}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={COUNT}
            array={particles.pos}
            itemSize={3}
          />
          <bufferAttribute
             attach="attributes-color"
             count={COUNT}
             array={particles.colors}
             itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.15}
          vertexColors
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
};

export default ParticleField;
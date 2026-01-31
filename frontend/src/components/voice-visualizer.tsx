import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface VoiceVisualizerProps {
  isActive: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  className?: string;
}

export function VoiceVisualizer({ isActive, isSpeaking, isListening, className }: VoiceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const baseRadius = Math.min(rect.width, rect.height) * 0.25;

      // Draw multiple orbital rings
      const ringCount = 3;
      const time = Date.now() * 0.001;
      phaseRef.current += isActive ? 0.02 : 0.005;

      for (let ring = 0; ring < ringCount; ring++) {
        const ringRadius = baseRadius + ring * 25;
        const particleCount = 12 + ring * 4;
        const speed = (ringCount - ring) * 0.5;

        for (let i = 0; i < particleCount; i++) {
          const angle = (i / particleCount) * Math.PI * 2 + phaseRef.current * speed + ring * 0.5;
          
          // Add wave motion based on state
          let waveAmplitude = 0;
          if (isSpeaking) {
            waveAmplitude = Math.sin(time * 8 + i * 0.5) * 15;
          } else if (isListening) {
            waveAmplitude = Math.sin(time * 12 + i * 0.3) * 10;
          } else if (isActive) {
            waveAmplitude = Math.sin(time * 3 + i * 0.2) * 5;
          }

          const x = centerX + Math.cos(angle) * (ringRadius + waveAmplitude);
          const y = centerY + Math.sin(angle) * (ringRadius + waveAmplitude);

          // Particle glow effect
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, 8);
          
          if (isSpeaking) {
            gradient.addColorStop(0, `hsla(280, 85%, 65%, ${0.9 - ring * 0.2})`);
            gradient.addColorStop(0.5, `hsla(280, 85%, 55%, ${0.5 - ring * 0.1})`);
            gradient.addColorStop(1, 'transparent');
          } else if (isListening) {
            gradient.addColorStop(0, `hsla(200, 90%, 60%, ${0.9 - ring * 0.2})`);
            gradient.addColorStop(0.5, `hsla(200, 90%, 50%, ${0.5 - ring * 0.1})`);
            gradient.addColorStop(1, 'transparent');
          } else if (isActive) {
            gradient.addColorStop(0, `hsla(260, 70%, 60%, ${0.7 - ring * 0.15})`);
            gradient.addColorStop(0.5, `hsla(260, 70%, 50%, ${0.4 - ring * 0.1})`);
            gradient.addColorStop(1, 'transparent');
          } else {
            gradient.addColorStop(0, `hsla(260, 30%, 50%, ${0.4 - ring * 0.1})`);
            gradient.addColorStop(0.5, `hsla(260, 30%, 40%, ${0.2 - ring * 0.05})`);
            gradient.addColorStop(1, 'transparent');
          }

          ctx.beginPath();
          ctx.arc(x, y, 6 - ring * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }
      }

      // Draw center orb
      const pulseScale = isActive ? 1 + Math.sin(time * 4) * 0.1 : 1;
      const orbRadius = baseRadius * 0.6 * pulseScale;

      // Outer glow
      const glowGradient = ctx.createRadialGradient(
        centerX, centerY, orbRadius * 0.5,
        centerX, centerY, orbRadius * 2
      );
      
      if (isSpeaking) {
        glowGradient.addColorStop(0, 'hsla(280, 90%, 60%, 0.4)');
        glowGradient.addColorStop(0.5, 'hsla(280, 90%, 50%, 0.2)');
        glowGradient.addColorStop(1, 'transparent');
      } else if (isListening) {
        glowGradient.addColorStop(0, 'hsla(200, 95%, 55%, 0.4)');
        glowGradient.addColorStop(0.5, 'hsla(200, 95%, 45%, 0.2)');
        glowGradient.addColorStop(1, 'transparent');
      } else if (isActive) {
        glowGradient.addColorStop(0, 'hsla(260, 80%, 55%, 0.3)');
        glowGradient.addColorStop(0.5, 'hsla(260, 80%, 45%, 0.15)');
        glowGradient.addColorStop(1, 'transparent');
      } else {
        glowGradient.addColorStop(0, 'hsla(260, 40%, 40%, 0.2)');
        glowGradient.addColorStop(0.5, 'hsla(260, 40%, 30%, 0.1)');
        glowGradient.addColorStop(1, 'transparent');
      }

      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius * 2, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();

      // Inner orb
      const orbGradient = ctx.createRadialGradient(
        centerX - orbRadius * 0.3, centerY - orbRadius * 0.3, 0,
        centerX, centerY, orbRadius
      );
      
      if (isSpeaking) {
        orbGradient.addColorStop(0, 'hsla(280, 100%, 80%, 1)');
        orbGradient.addColorStop(0.4, 'hsla(280, 90%, 60%, 1)');
        orbGradient.addColorStop(1, 'hsla(280, 80%, 40%, 1)');
      } else if (isListening) {
        orbGradient.addColorStop(0, 'hsla(200, 100%, 75%, 1)');
        orbGradient.addColorStop(0.4, 'hsla(200, 95%, 55%, 1)');
        orbGradient.addColorStop(1, 'hsla(200, 85%, 35%, 1)');
      } else if (isActive) {
        orbGradient.addColorStop(0, 'hsla(260, 90%, 70%, 1)');
        orbGradient.addColorStop(0.4, 'hsla(260, 80%, 55%, 1)');
        orbGradient.addColorStop(1, 'hsla(260, 70%, 35%, 1)');
      } else {
        orbGradient.addColorStop(0, 'hsla(260, 40%, 55%, 1)');
        orbGradient.addColorStop(0.4, 'hsla(260, 35%, 40%, 1)');
        orbGradient.addColorStop(1, 'hsla(260, 30%, 25%, 1)');
      }

      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
      ctx.fillStyle = orbGradient;
      ctx.fill();

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [isActive, isSpeaking, isListening]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('w-full h-full', className)}
      style={{ width: '100%', height: '100%' }}
    />
  );
}

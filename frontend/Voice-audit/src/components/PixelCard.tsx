import React, { useEffect, useRef } from 'react';
import './PixelCard.css';

interface PixelCardProps {
  variant?: 'default' | 'blue' | 'yellow' | 'green' | 'purple' | 'pink';
  gap?: number;
  speed?: number;
  colors?: string;
  noFocus?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const VARIANTS: Record<string, string> = {
  default: '#f97316,#eab308,#22c55e,#06b6d4,#3b82f6,#8b5cf6,#d946ef',
  blue: '#60a5fa,#3b82f6,#1d4ed8,#1e40af,#1e3a8a',
  yellow: '#fef08a,#facc15,#eab308,#ca8a04,#a16207',
  green: '#86efac,#22c55e,#16a34a,#15803d,#166534',
  purple: '#c4b5fd,#a78bfa,#8b5cf6,#7c3aed,#6d28d9',
  pink: '#f9a8d4,#f472b6,#ec4899,#db2777,#be185d',
};

const PixelCard: React.FC<PixelCardProps> = ({
  variant = 'blue',
  gap = 5,
  speed = 35,
  colors,
  noFocus = false,
  children,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colorString = colors || VARIANTS[variant] || VARIANTS.default;
    const colorArray = colorString.split(',').map((c) => c.trim());

    const dpr = window.devicePixelRatio || 1;

    const setCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    setCanvasSize();

    let focusFactor = noFocus ? 1 : 0;
    let isFocused = noFocus;

    const handleFocus = () => {
      isFocused = true;
    };
    const handleBlur = () => {
      isFocused = false;
    };
    const handleMouseEnter = () => {
      isFocused = true;
    };
    const handleMouseLeave = () => {
      isFocused = false;
    };

    if (!noFocus) {
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
      container.addEventListener('focus', handleFocus, true);
      container.addEventListener('blur', handleBlur, true);
    }

    const animate = () => {
      if (!ctx || !canvas) return;
      timeRef.current += reducedMotion ? 0 : 1;

      if (noFocus) {
        focusFactor = 1;
      } else {
        focusFactor += isFocused ? 0.05 : -0.05;
        focusFactor = Math.max(0, Math.min(1, focusFactor));
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const effectiveGap = gap * dpr;
      const cols = Math.ceil(canvas.width / effectiveGap);
      const rows = Math.ceil(canvas.height / effectiveGap);

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * effectiveGap;
          const y = j * effectiveGap;

          const distFromCenter = Math.sqrt(
            Math.pow(x - canvas.width / 2, 2) + Math.pow(y - canvas.height / 2, 2)
          );

          const maxDist = Math.sqrt(
            Math.pow(canvas.width / 2, 2) + Math.pow(canvas.height / 2, 2)
          );

          const distFactor = distFromCenter / maxDist;

          const noise = Math.sin(x * 0.01 + timeRef.current * 0.02 / speed) *
            Math.cos(y * 0.01 + timeRef.current * 0.02 / speed);

          const colorIndex = Math.floor(
            (noise * 0.5 + 0.5 + distFactor * 0.5) * colorArray.length
          );

          const color = colorArray[Math.abs(colorIndex) % colorArray.length];

          const baseOpacity = 0.1 + distFactor * 0.2;
          const focusOpacity = baseOpacity + focusFactor * 0.6 * (1 - distFactor);

          ctx.fillStyle = color;
          ctx.globalAlpha = Math.min(1, focusOpacity);

          const size = effectiveGap * 0.4;
          ctx.beginPath();
          ctx.rect(x - size / 2, y - size / 2, size, size);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    const resizeObserver = new ResizeObserver(() => {
      setCanvasSize();
    });
    resizeObserver.observe(container);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      resizeObserver.disconnect();
      if (!noFocus) {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
        container.removeEventListener('focus', handleFocus, true);
        container.removeEventListener('blur', handleBlur, true);
      }
    };
  }, [variant, gap, speed, colors, noFocus, reducedMotion]);

  return (
    <div ref={containerRef} className={`pixel-card ${className}`}>
      <canvas ref={canvasRef} className="pixel-card-canvas" />
      <div className="pixel-card-content">{children}</div>
    </div>
  );
};

export default PixelCard;

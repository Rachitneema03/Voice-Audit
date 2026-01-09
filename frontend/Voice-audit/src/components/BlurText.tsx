import { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';

interface BlurTextProps {
  text: string;
  delay?: number;
  animateBy?: 'words' | 'letters';
  direction?: 'top' | 'bottom' | 'left' | 'right';
  onAnimationComplete?: () => void;
  className?: string;
}

const BlurText = ({
  text,
  delay = 150,
  animateBy = 'words',
  direction = 'top',
  onAnimationComplete,
  className = '',
}: BlurTextProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const getDirectionValues = () => {
    switch (direction) {
      case 'top':
        return { y: -30, x: 0 };
      case 'bottom':
        return { y: 30, x: 0 };
      case 'left':
        return { x: -30, y: 0 };
      case 'right':
        return { x: 30, y: 0 };
      default:
        return { y: -30, x: 0 };
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible || !containerRef.current) return;

    const elements = containerRef.current.querySelectorAll('.blur-text-item');
    const { x, y } = getDirectionValues();

    gsap.set(elements, {
      opacity: 0,
      filter: 'blur(10px)',
      x,
      y,
    });

    gsap.to(elements, {
      opacity: 1,
      filter: 'blur(0px)',
      x: 0,
      y: 0,
      duration: 0.6,
      ease: 'power3.out',
      stagger: delay / 1000,
      onComplete: onAnimationComplete,
    });
  }, [isVisible, delay, direction, onAnimationComplete]);

  const splitText = () => {
    if (animateBy === 'words') {
      return text.split(' ').map((word, index) => (
        <span
          key={index}
          className="blur-text-item"
          style={{
            display: 'inline-block',
            marginRight: '0.3em',
            opacity: 0,
          }}
        >
          {word}
        </span>
      ));
    } else {
      return text.split('').map((letter, index) => (
        <span
          key={index}
          className="blur-text-item"
          style={{
            display: 'inline-block',
            opacity: 0,
            whiteSpace: letter === ' ' ? 'pre' : 'normal',
          }}
        >
          {letter === ' ' ? '\u00A0' : letter}
        </span>
      ));
    }
  };

  return (
    <div ref={containerRef} className={className} style={{ display: 'inline-block' }}>
      {splitText()}
    </div>
  );
};

export default BlurText;

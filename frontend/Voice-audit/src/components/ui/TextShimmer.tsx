'use client';
import { motion } from 'framer-motion';
import './TextShimmer.css';

interface TextShimmerProps {
  children: string;
  className?: string;
  duration?: number;
}

export function TextShimmer({
  children,
  className = '',
  duration = 2,
}: TextShimmerProps) {
  return (
    <motion.span
      className={`text-shimmer ${className}`}
      initial={{ backgroundPosition: '100% center' }}
      animate={{ backgroundPosition: '0% center' }}
      transition={{
        repeat: Infinity,
        duration,
        ease: 'linear',
      }}
    >
      {children}
    </motion.span>
  );
}

export default TextShimmer;

"use client"

import { motion } from "framer-motion"
import "./ShiningText.css"

interface ShiningTextProps {
  text: string;
  className?: string;
}

export function ShiningText({ text, className = "" }: ShiningTextProps) {
  return (
    <motion.span
      className={`shining-text ${className}`}
      initial={{ backgroundPosition: "200% 0" }}
      animate={{ backgroundPosition: "-200% 0" }}
      transition={{
        repeat: Infinity,
        duration: 2,
        ease: "linear",
      }}
    >
      {text}
    </motion.span>
  );
}

export default ShiningText;

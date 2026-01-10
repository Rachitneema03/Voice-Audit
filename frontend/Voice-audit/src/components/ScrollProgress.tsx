import NumberFlow from "@number-flow/react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import { useState } from "react";
import "./ScrollProgress.css";

const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  const [progressPercent, setProgressPercent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const clampedProgress = useTransform(scrollYProgress, (value) =>
    Math.min(Math.max(value, 0), 1)
  );
  const progressAsPercent = useTransform(clampedProgress, (value) =>
    Math.round(value * 100)
  );

  useMotionValueEvent(progressAsPercent, "change", (value) => {
    setProgressPercent(value);
  });

  const svgRadius = 18;
  const circumference = 2 * Math.PI * svgRadius;

  return (
    <motion.div
      drag
      dragMomentum={false}
      className="scroll-progress-container"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <NumberFlow
        value={progressPercent}
        className={`scroll-progress-number ${isHovered ? 'visible' : ''}`}
        suffix="%"
      />
      <div className="scroll-progress-circle-wrapper">
        <svg
          className="scroll-progress-svg"
          viewBox="0 0 48 48"
          role="presentation"
        >
          <circle
            cx="24"
            cy="24"
            r={svgRadius}
            stroke="currentColor"
            strokeWidth="3"
            className="scroll-progress-bg-circle"
            fill="none"
          />
          <motion.circle
            cx="24"
            cy="24"
            r={svgRadius}
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            style={{
              pathLength: clampedProgress,
              rotate: -90,
              transformOrigin: "50% 50%",
            }}
            className="scroll-progress-fill-circle"
          />
        </svg>
      </div>
    </motion.div>
  );
};

export default ScrollProgress;

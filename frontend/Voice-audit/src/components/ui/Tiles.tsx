"use client"

import { motion } from "framer-motion"
import "./Tiles.css"

interface TilesProps {
  className?: string
  rows?: number
  cols?: number
  tileSize?: "sm" | "md" | "lg"
}

export function Tiles({
  className = "",
  rows = 100,
  cols = 10,
  tileSize = "md",
}: TilesProps) {
  const rowsArray = new Array(rows).fill(1)
  const colsArray = new Array(cols).fill(1)

  return (
    <div className={`tiles-container ${className}`}>
      {rowsArray.map((_, i) => (
        <motion.div
          key={`row-${i}`}
          className={`tiles-row tiles-${tileSize}`}
        >
          {colsArray.map((_, j) => (
            <motion.div
              whileHover={{
                backgroundColor: "rgba(99, 102, 241, 0.08)",
                transition: { duration: 0 }
              }}
              animate={{
                backgroundColor: "transparent",
                transition: { duration: 2 }
              }}
              key={`col-${j}`}
              className={`tiles-cell tiles-${tileSize}`}
            />
          ))}
        </motion.div>
      ))}
    </div>
  )
}

import React, { useState } from "react";
import { motion } from "motion/react";

/*
  Headline split into letters. Entrance: each letter dissolves in from a
  soft blur with a gentle rise, staggered across the line. Hover: the
  letter melts smoothly toward a warm accent and eases back after the
  cursor leaves — no bounce, just a slow fade.
*/

const PRIMARY = "oklch(0.98 0.0293 146.88)";
const ACCENT = "oklch(0.72 0.2466 360)"; // bunny

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.035, delayChildren: 0.2 } },
};

const letterVariant = {
  hidden: { opacity: 0, y: 26, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
  },
};

function Letter({ char }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.span
      variants={letterVariant}
      className="inline-block cursor-default will-change-transform"
      animate={{ color: hovered ? ACCENT : PRIMARY }}
      transition={{
        duration: hovered ? 0.3 : 1.4,
        ease: "easeOut",
      }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      {char}
    </motion.span>
  );
}

function Word({ word, fancy }) {
  return (
    <span
      className={`inline-block whitespace-nowrap ${fancy ? "font-fancy" : "font-primary"}`}
    >
      {word.split("").map((char, i) => (
        <Letter key={i} char={char} />
      ))}
    </span>
  );
}

/**
 * lines: array of arrays of { text, fancy? }
 */
function KineticHeadline({ lines, className = "" }) {
  return (
    <motion.h1
      variants={container}
      initial="hidden"
      animate="visible"
      className={`flex flex-col leading-[0.95] font-bold ${className}`}
    >
      {lines.map((line, i) => (
        <span key={i} className="flex flex-wrap justify-center gap-x-[0.3em]">
          {line.map((word, j) => (
            <Word key={j} word={word.text} fancy={word.fancy} />
          ))}
        </span>
      ))}
    </motion.h1>
  );
}

export default KineticHeadline;

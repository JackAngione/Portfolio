import React, { useRef } from "react";
import { Link } from "react-router";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

/*
  Portfolio card that tilts in 3D toward the cursor, with a glare
  highlight that tracks the pointer across the surface.
*/
function TiltCard({ to, title, subtitle, gradient, index = 0 }) {
  const ref = useRef(null);
  const px = useMotionValue(0.5); // pointer position within card, 0..1
  const py = useMotionValue(0.5);

  const rotateY = useSpring(useTransform(px, [0, 1], [-10, 10]), {
    stiffness: 250,
    damping: 20,
  });
  const rotateX = useSpring(useTransform(py, [0, 1], [10, -10]), {
    stiffness: 250,
    damping: 20,
  });
  const glareX = useTransform(px, [0, 1], ["20%", "80%"]);
  const glareY = useTransform(py, [0, 1], ["20%", "80%"]);
  const glare = useTransform(
    [glareX, glareY],
    ([gx, gy]) =>
      `radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.25), transparent 60%)`,
  );

  function handlePointerMove(e) {
    const rect = ref.current.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  }

  function reset() {
    px.set(0.5);
    py.set(0.5);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 22,
        delay: index * 0.08,
      }}
      style={{ perspective: 900 }}
    >
      <motion.div
        ref={ref}
        onPointerMove={handlePointerMove}
        onPointerLeave={reset}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        whileHover={{ scale: 1.04 }}
        className="group relative overflow-hidden rounded-2xl border border-white/10"
      >
        <Link
          to={to}
          className="relative block h-52 p-6 text-left sm:h-64 sm:p-8"
        >
          {/* color wash */}
          <div
            className={`absolute inset-0 opacity-60 transition-opacity duration-300 group-hover:opacity-90 ${gradient}`}
          />
          {/* pointer glare */}
          <motion.div
            className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: glare }}
          />
          <div
            className="relative flex h-full flex-col justify-end"
            style={{ transform: "translateZ(40px)" }}
          >
            <span className="font-primary text-primary text-3xl font-bold sm:text-4xl">
              {title}
            </span>
            <span className="text-primary/70 mt-1 text-sm">{subtitle}</span>
            <motion.span
              className="text-primary/80 absolute top-0 right-0 text-2xl"
              initial={false}
              aria-hidden="true"
            >
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1">
                ↗
              </span>
            </motion.span>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}

export default TiltCard;

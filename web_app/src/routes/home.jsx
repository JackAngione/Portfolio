import React, { useContext, useEffect, useRef, useState } from "react";
import LoginModal from "./modals/loginModal";
import { jwtDecode } from "jwt-decode";
import LogosMarquee from "./logosMarquee.jsx";
import MarbleField from "./marbleField.jsx";
import KineticHeadline from "./kineticHeadline.jsx";
import TiltCard from "./tiltCard.jsx";
import { AuthContext, logout } from "../useAuth.jsx";
import { motion, useMotionValue, useSpring } from "motion/react";
import { media_server_address } from "../serverInfo.jsx";

/* Resume button that leans toward the cursor while hovered */
function MagneticResumeButton() {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 200, damping: 15 });
  const springY = useSpring(y, { stiffness: 200, damping: 15 });

  function handlePointerMove(e) {
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - (rect.left + rect.width / 2)) * 0.35);
    y.set((e.clientY - (rect.top + rect.height / 2)) * 0.35);
  }

  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      style={{ x: springX, y: springY }}
      className="relative overflow-hidden rounded-lg p-0.75"
      initial={{ boxShadow: "0px 0px 30px 1px rgba(255, 255, 255, 0.35)" }}
      whileHover={{ boxShadow: "0px 0px 30px 2px rgba(255, 255, 255, 0.9)" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <motion.div
        className="absolute inset-0 scale-400 rounded-4xl bg-conic/decreasing from-violet-500 via-lime-500 to-violet-500"
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />
      <button
        className="no-wash relative tracking-widest focus:outline-none"
        onClick={() => {
          window.open(media_server_address + "/resume", "_blank");
        }}
      >
        RESUME
      </button>
    </motion.div>
  );
}

const CARDS = [
  {
    to: "/code",
    title: "CODE",
    subtitle: "software & side projects",
    gradient:
      "bg-linear-to-br from-lime-500/60 via-emerald-600/40 to-cyan-600/60",
  },
  {
    to: "/hdrphotos",
    title: "PHOTOGRAPHY",
    subtitle: "HDR photo collections",
    gradient: "bg-linear-to-br from-sunny/70 via-orange-600/40 to-bunny/60",
  },
  {
    to: "/music",
    title: "MUSIC",
    subtitle: "tracks & sound experiments",
    gradient:
      "bg-linear-to-br from-bunny/70 via-fuchsia-700/40 to-violet-600/60",
  },
  {
    to: "/resources",
    title: "RESOURCES",
    subtitle: "tutorials & references",
    gradient:
      "bg-linear-to-br from-violet-500/60 via-indigo-700/40 to-sky-600/60",
  },
];

function Home() {
  const [openModal, setOpenModal] = useState(false);
  const [username, setUsername] = useState(null);
  const { token } = useContext(AuthContext);

  useEffect(() => {
    try {
      const decoded = jwtDecode(token);
      setUsername(decoded.username);
    } catch (e) {
      //console.error("An error occurred while decoding the token:", e);
    }
  }, []);

  return (
    <>
      <MarbleField />

      {/* hero */}
      <section className="relative z-10 -mt-1 flex min-h-svh flex-col items-center justify-center gap-10 px-6 pt-10">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="text-primary/60 text-sm tracking-[0.35em] uppercase"
        >
          Jack Angione
        </motion.p>

        <KineticHeadline
          className="text-5xl sm:text-7xl lg:text-8xl"
          lines={[
            [{ text: "SOFTWARE" }, { text: "DEVELOPER" }],
            [{ text: "&", fancy: true }],
            [{ text: "HOBBYIST" }, { text: "CREATIVE" }],
          ]}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="flex flex-col items-center gap-6"
        >
          {/*<MagneticResumeButton />*/}
        </motion.div>

        {/* scroll hint */}
        <motion.div
          className="bg-background/10 absolute bottom-6 w-14 rounded-xl backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, -8, 0] }}
          transition={{
            opacity: { delay: 1.4, duration: 0.8 },
            y: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
          }}
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="white"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m4.5 5.25 7.5 7.5 7.5-7.5m-15 6 7.5 7.5 7.5-7.5"
            />
          </svg>
        </motion.div>
      </section>

      {/* explore */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-24">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          EXPLORE
        </motion.h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {CARDS.map((card, i) => (
            <TiltCard key={card.to} index={i} {...card} />
          ))}
        </div>
      </section>

      {/* account */}
      <div className="relative z-10 mb-4">
        {username ? (
          <>
            {username}
            <button
              className="m-8"
              onClick={() => {
                logout({ token }).then((r) => {});
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                setOpenModal(!openModal);
              }}
              className="m-2"
            >
              Login
            </button>
            <LoginModal open={openModal}></LoginModal>
          </>
        )}
      </div>

      <div className="relative z-0">
        <LogosMarquee />
      </div>
    </>
  );
}

export default Home;

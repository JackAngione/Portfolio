import React, { useContext, useEffect, useState } from "react";
import LoginModal from "./modals/loginModal";
import { jwtDecode } from "jwt-decode";
import BackgroundAnim from "./backgroundAnimation.jsx";
import LogosMarquee from "./logosMarquee.jsx";
import { AuthContext, logout } from "../useAuth.jsx";
import { motion, useTime, useTransform } from "motion/react";
import { media_server_address } from "../serverInfo.jsx";

function Home() {
  const [openModal, setOpenModal] = useState(false);
  const [username, setUsername] = useState(null);
  //CCOOOOOKKIEEEEE
  const { token } = useContext(AuthContext);

  useEffect(() => {
    try {
      const decoded = jwtDecode(token);
      setUsername(decoded.username);
    } catch (e) {
      //console.error("An error occurred while decoding the token:", e);
    }
  }, []);

  // Create a motion value that will continuously animate

  // Use Framer Motion's useTime hook to get continuously updating time value
  const time = useTime();
  const hue = useTransform(time, [0, 2000], [0, 360], { clamp: false });
  return (
    <>
      <BackgroundAnim />

      <div className="mt-[50vh] flex flex-col items-center justify-center gap-4 p-10">
        <div className="!-mx-4">
          <h1 className="!-mx-4">SOFTWARE DEVELOPER </h1>
          <h1 className="!-mx-4">AND</h1>
          <h1 className="!-mx-4">HOBBYIST CREATIVE</h1>
        </div>

        <motion.div
          className="relative mt-16 overflow-hidden rounded-lg p-0.75"
          initial={{
            boxShadow: "0px 0px 30px 1px rgba(255, 255, 255, 0.5)",
          }}
          whileHover={{
            boxShadow: "0px 0px 30px 2px rgba(255, 255, 255, 1)",
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <motion.div
            className="absolute inset-0 scale-400 rounded-4xl bg-conic/decreasing from-violet-500 via-lime-500 to-violet-500"
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          <button
            className="relative focus:outline-none"
            onClick={() => {
              window.open(media_server_address + "/resume", "_blank");
            }}
          >
            RESUME
          </button>
        </motion.div>

        <p>contact: 8jk.ang8@gmail.com</p>
      </div>
      <div className="mt-[200px] mb-4">
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

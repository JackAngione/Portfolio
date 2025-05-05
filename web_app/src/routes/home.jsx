import React, { useContext, useEffect, useState } from "react";
import LoginModal from "./modals/loginModal";
import { jwtDecode } from "jwt-decode";
import BackgroundAnim from "./backgroundAnimation.jsx";
import LogosMarquee from "./logosMarquee.jsx";
import { AuthContext, logout } from "../useAuth.jsx";

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

  return (
    <>
      <BackgroundAnim />
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

      <div className="text-white">
        <LogosMarquee />
      </div>
    </>
  );
}

export default Home;

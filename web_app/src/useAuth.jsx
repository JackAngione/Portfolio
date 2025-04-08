import React, { createContext, useContext, useEffect, useState } from "react";
import { serverAddress } from "./routes/serverInfo.jsx";
import Cookies from "js-cookie";
import axios from "axios";
export const AuthContext = createContext({ loggedIn: false, token: "" });

export async function login(username, password) {
  let loginStatus = "login failed";
  let login_credentials = { username: username, password: password };
  const response = await fetch(serverAddress + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(login_credentials),
  });
  if (response.status === 200) {
    const response_json = await response.json();
    Cookies.set("LoginToken", response_json.token, { expires: 1 }); // Expires after 1 day
    loginStatus = "login successful";
    window.location.reload();
  } else {
    loginStatus = "login failed";
  }
  return loginStatus;
}

export async function logout() {
  const token = Cookies.get("LoginToken");
  try {
    await axios
      .post(serverAddress + "/logout", token, {
        headers: {
          authorization: `Bearer ${token}`, // Pass JWT in Authorization header
        },
      })
      .then(function (response) {
        console.log("response recieved");
        if (response.status === 200) {
          Cookies.remove("LoginToken"); // Expires after 1 day
          window.location.reload();
        } else {
          console.log("Logout Failed");
        }
      });
  } catch (e) {
    if (e.response.status === 401) {
      //token was invalid, so logout anyways
      Cookies.remove("LoginToken");
      window.location.reload();
    } else {
      console.log("server side error logging out");
    }
  }
}

function AuthProvider({ children }) {
  const [authLoaded, setAuthLoaded] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [token, setToken] = useState("");
  const browserToken = Cookies.get("LoginToken");
  useEffect(() => {
    async function handleAuthenticate() {
      if (browserToken != null && authenticated === false) {
        await fetch(serverAddress + "/auth", {
          headers: {
            authorization: `Bearer ${browserToken}`, // Pass JWT in Authorization header
          },
        })
          .then((r) => {
            if (r.status === 200) {
              setAuthenticated(true);
              setToken(browserToken);
              console.log("AUTHRUNNING");
            }
            if (r.status === 401) {
              setAuthenticated(false);
            }
          })
          .catch((err) => console.log("Authentication failed"));
      }
    }
    handleAuthenticate().then((r) => {
      setAuthLoaded(true);
    });
  }, [browserToken]);

  return (
    <AuthContext.Provider value={{ loggedIn: authenticated, token: token }}>
      {/*
        only loads Router after authentication is finished,
        otherwise router runs before authentication finishes
      */}

      {authLoaded ? children : null}
    </AuthContext.Provider>
  );
}
export default AuthProvider;

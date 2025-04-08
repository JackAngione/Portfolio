import { Navigate } from "react-router";
import { AuthContext } from "../useAuth.jsx";
import { useContext } from "react";

export const AdminRoute = ({ children }) => {
  const { loggedIn } = useContext(AuthContext);

  if (loggedIn) {
    return children;
  } else {
    return <Navigate to={"/resources"} />;
  }
};

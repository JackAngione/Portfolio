import { Link, Outlet } from "react-router";
import "./navigationBar.css";
import { useContext } from "react";
import AuthProvider, { AuthContext } from "../useAuth.jsx";
import GrainOverlay from "../GrainOverlay.jsx";
//BASICALLY THE NAVIGATION BAR
export default function NavigationBar() {
  const authenticated = useContext(AuthContext).loggedIn;

  return (
    <>
      <nav className="navigation">
        <div className="navDropdown">
          <Link className="mainDropdown" to="">
            SKILLS
          </Link>
          <div className="dropDownList">
            <Link to="/code"> /PROGRAMMING</Link>
            <Link to="/hdrphotos"> /HDR_PHOTOS </Link>
            <Link to="/music"> /MUSIC </Link>
          </div>
        </div>
        |
        <li className="home">
          <Link to="/"> HOME </Link>
        </li>
        |
        <div className="navDropdown">
          <Link className="mainDropdownResources" to="/resources">
            /RESOURCES
          </Link>
          {authenticated ? (
            <div className="dropDownList">
              <Link to="/resources/upload">UPLOAD TUTORIAL</Link>
              <Link to="/resources/category">CATEGORY</Link>
            </div>
          ) : (
            <></>
          )}
        </div>
      </nav>
      <Outlet />
    </>
  );
}

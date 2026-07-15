import { Link, Outlet } from "react-router";
import "./navigationBar.css";
import { useContext } from "react";
import { AuthContext } from "../useAuth.jsx";
//BASICALLY THE NAVIGATION BAR
export default function NavigationBar() {
  const authenticated = useContext(AuthContext).loggedIn;

  return (
    <>
      <nav className="navigation">
        <div className="navDropdown">
          <Link className="navLink" to="">
            SKILLS
          </Link>
          <div className="dropDownList">
            <Link to="/code">PROGRAMMING</Link>
            <Link to="/hdrphotos">PHOTOGRAPHY</Link>
            <Link to="/music">MUSIC</Link>
          </div>
        </div>

        <span className="navDivider" aria-hidden="true" />

        <Link className="navLink" to="/">
          HOME
        </Link>

        <span className="navDivider" aria-hidden="true" />

        <div className="navDropdown">
          <Link className="navLink" to="/resources">
            RESOURCES
          </Link>
          {authenticated && (
            <div className="dropDownList">
              <Link to="/resources/upload">UPLOAD TUTORIAL</Link>
              <Link to="/resources/category">CATEGORY</Link>
            </div>
          )}
        </div>
      </nav>
      <Outlet />
    </>
  );
}

import { Link, Outlet } from "react-router";
import "./navigationBar.css";
import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../useAuth.jsx";
//BASICALLY THE NAVIGATION BAR

// Grace period before closing on mouse-leave, so a diagonal mouse path
// that briefly grazes a neighboring nav item (common once the bar wraps
// to two rows at narrow desktop widths) doesn't kill the hover.
const HOVER_CLOSE_DELAY_MS = 250;

function supportsHover() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function NavDropdown({ id, triggerTo, triggerLabel, activeDropdown, setActiveDropdown, children }) {
  const open = activeDropdown === id;
  const ref = useRef(null);
  const closeTimer = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setActiveDropdown((prev) => (prev === id ? null : prev));
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open, id, setActiveDropdown]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const handleMouseEnter = () => {
    if (!supportsHover()) return;
    clearTimeout(closeTimer.current);
    setActiveDropdown(id);
  };

  const handleMouseLeave = () => {
    if (!supportsHover()) return;
    closeTimer.current = setTimeout(() => {
      setActiveDropdown((prev) => (prev === id ? null : prev));
    }, HOVER_CLOSE_DELAY_MS);
  };

  return (
    <div
      className="navDropdown"
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        className="navLink"
        to={triggerTo}
        onClick={(e) => {
          e.preventDefault();
          setActiveDropdown((prev) => (prev === id ? null : id));
        }}
      >
        {triggerLabel}
      </Link>
      <div
        className={`dropDownList${open ? " open" : ""}`}
        onClick={() => setActiveDropdown((prev) => (prev === id ? null : prev))}
      >
        {children}
      </div>
    </div>
  );
}

// The bar sits at top: 24px. Publish the space it actually occupies
// (that offset + its rendered height + a breathing gap) as --nav-safe-top so
// pages can reserve top room that grows automatically when the bar wraps to a
// second row at narrow widths, instead of overlapping the content beneath it.
const NAV_TOP_OFFSET = 24;
const NAV_BOTTOM_GAP = 24;

export default function NavigationBar() {
  const authenticated = useContext(AuthContext).loggedIn;
  const [activeDropdown, setActiveDropdown] = useState(null);
  const navRef = useRef(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const publishHeight = () => {
      const safeTop = NAV_TOP_OFFSET + nav.offsetHeight + NAV_BOTTOM_GAP;
      document.documentElement.style.setProperty("--nav-safe-top", `${safeTop}px`);
    };

    publishHeight();
    const observer = new ResizeObserver(publishHeight);
    observer.observe(nav);
    // ResizeObserver doesn't reliably fire when a fixed, shrink-to-fit bar
    // re-wraps purely because the viewport changed width, so also recompute on
    // window resize.
    window.addEventListener("resize", publishHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", publishHeight);
    };
  }, []);

  return (
    <>
      <nav className="navigation" ref={navRef}>
        <NavDropdown
          id="skills"
          triggerTo=""
          triggerLabel="SKILLS"
          activeDropdown={activeDropdown}
          setActiveDropdown={setActiveDropdown}
        >
          <Link to="/code">PROGRAMMING</Link>
          <Link to="/hdrphotos">PHOTOGRAPHY</Link>
          <Link to="/music">MUSIC</Link>
        </NavDropdown>

        <span className="navDivider" aria-hidden="true" />

        <Link className="navLink" to="/">
          HOME
        </Link>

        <span className="navDivider" aria-hidden="true" />

        {authenticated ? (
          <NavDropdown
            id="resources"
            triggerTo="/resources"
            triggerLabel="RESOURCES"
            activeDropdown={activeDropdown}
            setActiveDropdown={setActiveDropdown}
          >
            <Link to="/resources">SEARCH</Link>
            <Link to="/resources/upload">UPLOAD TUTORIAL</Link>
            <Link to="/resources/category">CATEGORY</Link>
          </NavDropdown>
        ) : (
          <Link className="navLink" to="/resources">
            RESOURCES
          </Link>
        )}
      </nav>
      <Outlet />
    </>
  );
}

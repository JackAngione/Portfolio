import {Link, Outlet, useLocation} from "react-router-dom";
import "./navigationBar.css"
import {useEffect, useState} from "react";
import BackgroundAnim from "./backgroundAnimation.jsx";
//BASICALLY THE NAVIGATION BAR
export default function NavigationBar() {
    const location = useLocation();
    const [navClassName, setNavClassName] = useState("navigation")
        //THEATER MODE, FOR PHOTOGRAPHY PAGE
    useEffect(() => {
        // Check if we're on the special page
        if (location.pathname === '/photography') {
            document.body.classList.add('theaterMode');
            setNavClassName("navigationDark")
        } else {
            document.body.classList.remove('theaterMode');
            setNavClassName("navigation")
        }
    }, [location]);
    return (
        <>
            { useLocation().pathname==="/" && <BackgroundAnim/>}
                <nav class={navClassName}>
                    <div className="navDropdown">
                        <Link className ="mainDropdown" >Skills</Link>
                        <div className="dropDownList">
                            <Link to="/code"> PROGRAMMING</Link>
                            <Link to="/photography"> PHOTOGRAPHY </Link>
                            <Link to="/music"> MUSIC </Link>
                        </div>
                    </div>
                    |
                    <li>
                        <Link to="/"> HOME </Link>
                    </li>
                    |
                    <div className="navDropdown">
                        <Link className ="mainDropdownResources" to="/resources">RESOURCES</Link>
                        <div className="dropDownList">
                            <Link to="/upload">UPLOAD TUTORIAL</Link>
                            <Link to="/category">CATEGORY</Link>
                        </div>
                    </div>
                </nav>
        </>
    );
}
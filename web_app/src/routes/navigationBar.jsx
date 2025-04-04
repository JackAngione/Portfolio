import {Link, Outlet, useLocation} from "react-router-dom";
import "./navigationBar.css"
import {useContext, useEffect, useState} from "react";
import BackgroundAnim from "./backgroundAnimation.jsx";
import Cookies from 'js-cookie';
import {AuthContext} from "../useAuth.jsx";
//BASICALLY THE NAVIGATION BAR
export default function NavigationBar() {
    const location = useLocation();
    const [navClassName, setNavClassName] = useState("navigation")
    //const [token, setToken] = useState()
    const authenticated = useContext(AuthContext).loggedIn;

    //THEATER MODE, FOR PHOTOGRAPHY PAGES
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
    useEffect(() => {
        try {
            //setToken(Cookies.get("LoginToken"))
        }
        catch (e) {
            console.log("no token")
        }
    }, []);
    return (
        <>

           {/* { useLocation().pathname==="/" && <BackgroundAnim/>}*/}
                <nav className={navClassName}>
                    <div className="navDropdown">
                        <Link className ="mainDropdown" >SKILLS</Link>
                        <div className="dropDownList">
                            <Link to="/code"> PROGRAMMING</Link>
                            <Link to="/hdrphotos"> HDR PHOTOS </Link>
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
                        {authenticated ? (<div className="dropDownList">
                            <Link to="/upload">UPLOAD TUTORIAL</Link>
                            <Link to="/category">CATEGORY</Link>
                        </div>): (<></> ) }
                    </div>
                </nav>
        </>
    );
}
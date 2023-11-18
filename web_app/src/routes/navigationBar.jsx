import {Link, Outlet, useLocation} from "react-router-dom";
import "./navigationBar.css"
import {useEffect, useState} from "react";
import BackgroundAnim from "./backgroundAnimation.jsx";
import Cookies from 'js-cookie';
//BASICALLY THE NAVIGATION BAR
export default function NavigationBar() {
    const location = useLocation();
    const [navClassName, setNavClassName] = useState("navigation")
    //const [token, setToken] = useState()
    const token = Cookies.get("LoginToken")
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
            { useLocation().pathname==="/" && <BackgroundAnim/>}
                <nav className={navClassName}>
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
                        {token ? (<div className="dropDownList">
                            <Link to="/upload">UPLOAD TUTORIAL</Link>
                            <Link to="/category">CATEGORY</Link>
                        </div>): (<></> ) }

                    </div>
                </nav>

        </>
    );
}
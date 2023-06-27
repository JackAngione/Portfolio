import {Link, Outlet, useLocation} from "react-router-dom";
import "./navigationBar.css"
import {useEffect} from "react";
import BackgroundAnim from "./backgroundAnimation.jsx";
//BASICALLY THE NAVIGATION BAR
export default function NavigationBar() {
    const location = useLocation();
    //THEATER MODE, FOR PHOTOGRAPHY PAGE
    useEffect(() => {
        // Check if we're on the special page
        if (location.pathname === '/photography') {
            document.body.classList.add('theaterMode');
        } else {
            document.body.classList.remove('theaterMode');
        }
    }, [location]);
    return (
        <>
            { useLocation().pathname==="/" && <BackgroundAnim/>}
                <nav id="navigation">
                    <div className="navDropdown">
                        <Link className ="mainDropdown" >Skills</Link>
                        <div className="dropDownList">
                            <Link to="/code"> Programming</Link>
                            <Link to="/photography"> Photography </Link>
                            <Link to="/music"> Music </Link>
                        </div>
                    </div>
                    |
                    <li>
                        <Link to="/"> Home </Link>
                    </li>
                    |
                    <div className="navDropdown">
                        <Link className ="mainDropdownResources" to="/resources">Resources</Link>
                        <div className="dropDownList">
                            <Link to="/upload">Upload Tutorial</Link>
                            <Link to="/category">Category</Link>
                        </div>
                    </div>
                </nav>


        </>
    );
}
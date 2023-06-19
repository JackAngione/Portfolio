import {Link, Outlet} from "react-router-dom";
import "./navigationBar.css"
import {useEffect} from "react";
//BASICALLY THE NAVIGATION BAR
export default function NavigationBar() {
    return (
        <>
            <nav id="navigation">
                <li>
                    <Link to="/"> Home </Link>
                </li>
                    |
                <div className="skillDropdown">
                    <button className ="skillsBtn"><a href=""> Skills </a></button>
                    <div className="skillsList">
                            <Link to="/code"> Programming</Link>
                            <Link to="/photography"> Photography </Link>
                            <Link to="/music"> Music </Link>
                    </div>
                </div>
                    |
                <li>
                    <Link to="/resources">Resources</Link>
                </li>

                <li>
                    |
                    <Link to="/upload">Upload Tutorial</Link>
                </li>
               
                <li>
                    |
                    <Link to="/category">Category</Link>
                </li>
            </nav>

        </>
    );
}
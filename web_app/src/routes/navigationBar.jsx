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
                <li>
                    <Link to="/projects"> Projects </Link>
                </li>
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
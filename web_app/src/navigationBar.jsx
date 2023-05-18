import { Outlet} from "react-router-dom";
import "./navigationBar.css"
//BASICALLY THE NAVIGATION BAR
export default function NavigationBar() {
    return (
        <>
            <div id="navigation">
                        <li>
                            <a href={`/homepage`}>Homepage</a>
                        </li>

                        <li>
                            |
                            <a href={`/upload`}>Upload Tutorial</a>
                        </li>
            </div>
            <Outlet />
        </>
    );
}
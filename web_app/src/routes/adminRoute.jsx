import { Navigate } from "react-router-dom";
import AuthProvider, {AuthContext} from "../useAuth.jsx";
import {useContext} from "react";

export const AdminRoute = ({ children }) => {

    const authenticated = useContext(AuthContext).loggedIn;
    if(authenticated){
        return (children)
    }
    else{return <Navigate to="/" />;}

};
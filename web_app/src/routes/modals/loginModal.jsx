import {useState} from "react";
import axios from "axios";
import {serverAddress} from "../serverInfo.jsx";
import Cookies from 'js-cookie';
import {useNavigate} from "react-router-dom";
import {login} from "../../useAuth.jsx";

function LoginModal(props) {
    const [loginFail, setLoginFail] = useState("");
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)

    //close modal
    if(!props.open)
    {
        return null
    }
    const toggleShowPassword = () => {
        setShowPassword(prevShowPassword => !prevShowPassword);
    };
    async function handleLogin() {
        let loginStatus = await login(username, password)
        setLoginFail(loginStatus)
    }
    return(
        <>
            <label htmlFor="username">Username:</label>
            <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            />

            <label htmlFor="password">Password:</label>
            <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />

            <button type="button" onClick={toggleShowPassword}>
                {showPassword ? 'Hide' : 'Show'} Password
            </button>

            <button onClick={handleLogin}> Submit </button>
        </>
    )

}
export default LoginModal;
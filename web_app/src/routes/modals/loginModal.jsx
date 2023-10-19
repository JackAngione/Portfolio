import {useState} from "react";
import axios from "axios";
import {serverAddress} from "../serverInfo.jsx";
import Cookies from 'js-cookie';
import {useNavigate} from "react-router-dom";

function LoginModal(props) {
    const [loginFail, setLoginFail] = useState("");
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const navigate = useNavigate()
    if(!props.open)
    {
        return null
    }
    const toggleShowPassword = () => {
        setShowPassword(prevShowPassword => !prevShowPassword);
    };
    async function process_login() {
        let login_credentials = {"username": username, "password": password}
        await axios.post(serverAddress + "/login", login_credentials)
            .then(function (response) {
                if (response.status === 200) {
                    const token = response.data.token; // Ensure your server sends the JWT as "token" in the response body
                    Cookies.set('LoginToken', token, { expires: 1 }); // Expires after 1 day
                    console.log("cookie set sucessfully")
                    window.location.reload()
                } else {
                    setLoginFail("")
                }
            })
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

            <button onClick={process_login}> Submit </button>
        </>
    )

}
export default LoginModal;
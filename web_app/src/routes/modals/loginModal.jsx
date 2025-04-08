import { useState } from "react";
import { login } from "../../useAuth.jsx";

function LoginModal(props) {
  const [loginFail, setLoginFail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  //close modal
  if (!props.open) {
    return null;
  }
  const toggleShowPassword = () => {
    setShowPassword((prevShowPassword) => !prevShowPassword);
  };
  async function handleLogin() {
    let loginStatus = await login(username, password);
    setLoginFail(loginStatus);
  }
  return (
    <>
      <label htmlFor="username" className="m-2">
        Username:
      </label>
      <input
        type="text"
        id="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <label htmlFor="password" className="m-2">
        Password:
      </label>
      <input
        type={showPassword ? "text" : "password"}
        id="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button type="button" className="m-2" onClick={toggleShowPassword}>
        {showPassword ? "Hide" : "Show"} Password
      </button>

      <button onClick={handleLogin} className="m-2">
        {" "}
        Submit{" "}
      </button>
    </>
  );
}
export default LoginModal;

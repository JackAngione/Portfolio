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
    <div className="flex flex-col items-center justify-center">
      <div>
        <label htmlFor="username" className="m-2">
          Username:
        </label>
        <input
          type="text"
          className="outline-secondary rounded-sm outline-1"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="password" className="m-2">
          Password:
        </label>
        <input
          type={showPassword ? "text" : "password"}
          className="outline-secondary rounded-sm outline-1"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="button" className="scale-75" onClick={toggleShowPassword}>
          {showPassword ? "Hide" : "Show"} Password
        </button>
      </div>

      <button onClick={handleLogin} className="m-2">
        {" "}
        Submit{" "}
      </button>
    </div>
  );
}

export default LoginModal;

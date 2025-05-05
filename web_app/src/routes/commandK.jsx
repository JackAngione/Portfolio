import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router";

function CommandK({ children }) {
  //COMMAND K TO SEARCH RESOURCES KEYBIND
  let navigate = useNavigate();
  const handleKeyPress = useCallback((event) => {
    if (event.metaKey && event.key === "k") {
      navigate("/resources");
    }
  }, []);

  useEffect(() => {
    // attach the event listener
    document.addEventListener("keydown", handleKeyPress);

    // remove the event listener
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress]);
  return children;
}

export default CommandK;

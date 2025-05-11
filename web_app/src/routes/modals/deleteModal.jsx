import { useContext, useState } from "react";
import "./editModal.css";
import axios from "axios";
import { backend_address } from "../../serverInfo.jsx";
import trashIcon from "../../svgIcons/trashIcon.svg";
import { AuthContext } from "../../useAuth.jsx";

function DeleteModal({ open, tutorialData, onClose }) {
  const [isChecked, setIsChecked] = useState(false);
  const { token } = useContext(AuthContext); //get token from auth
  if (!open) {
    return null;
  }

  function deleteTutorial() {
    let inputs = {
      title: tutorialData.title,
      source: tutorialData.source,
      resource_id: tutorialData.resource_id,
    };
    axios
      .post(backend_address + "/deleteTutorial", inputs, {
        headers: {
          authorization: `Bearer ${token}`, // Pass JWT in Authorization header
        },
      })
      .then(({ response }) => {
        //console.log(response.data)
      });
    onClose();
  }

  return (
    <>
      <div className="overlay">
        <div className="modalContent">
          <h1> Delete Tutorial </h1>
          <p>{tutorialData.title}</p>
          <p>resource_id: {tutorialData.resource_id}</p>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => {
              setIsChecked(!isChecked);
            }}
          />
          Confirm
          <div className="flex justify-center gap-4">
            <button onClick={deleteTutorial} disabled={!isChecked}>
              <img className="SVG_icon" src={trashIcon} alt="" />
            </button>
            <button onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </>
  );
}

export default DeleteModal;

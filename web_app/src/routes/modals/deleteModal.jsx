import { useContext, useState } from "react";
import "./editModal.css";
import { backend_address } from "../../serverInfo.jsx";
import trashIcon from "../../svgIcons/trashIcon.svg";
import { AuthContext } from "../../useAuth.jsx";

function DeleteModal({ open, tutorialData, onClose, onDeleted }) {
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
    fetch(backend_address + "/deleteTutorial", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`, // Pass JWT in Authorization header
      },
      body: JSON.stringify(inputs),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("delete failed");
        }
        if (onDeleted) {
          onDeleted();
        }
      })
      .catch((error) => {
        console.error("failed to delete tutorial:", error);
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

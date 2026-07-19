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
    //legacy tutorials (from the schemaless express days) have no resource_id;
    //they are deleted by title+source on the collection instead
    const url = tutorialData.resource_id
      ? backend_address +
        "/tutorials/" +
        encodeURIComponent(tutorialData.resource_id)
      : backend_address +
        "/tutorials?" +
        new URLSearchParams({
          title: tutorialData.title,
          source: tutorialData.source,
        });
    fetch(url, {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${token}`, // Pass JWT in Authorization header
      },
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

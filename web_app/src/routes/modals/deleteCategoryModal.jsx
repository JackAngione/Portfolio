import { useContext, useState } from "react";

import { backend_address } from "../../serverInfo.jsx";
import "../category.css";
import trashIcon from "../../svgIcons/trashIcon.svg";
import { AuthContext } from "../../useAuth.jsx";

function DeleteCategoryModal({ categoryData, onDeleted }) {
  const [isChecked, setIsChecked] = useState(false);
  const [error, setError] = useState(false);
  //CCOOOOOKKIEEEEE
  const { token } = useContext(AuthContext);

  function deleteCategory() {
    setError(false);
    fetch(backend_address + "/deleteCategory", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`, // Pass JWT in Authorization header
      },
      body: JSON.stringify({ title: categoryData }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("delete category failed");
        setIsChecked(false);
        onDeleted?.(categoryData);
      })
      .catch(() => {
        setError(true);
      });
  }

  return (
    <div id="confirmDelete">
      <label>
        Confirm Delete "{categoryData}"
        <input
          name="confirmDeleteCategory"
          type="checkbox"
          checked={isChecked}
          onChange={() => {
            setIsChecked(!isChecked);
          }}
        />
      </label>

      <button className="m-4" onClick={deleteCategory} disabled={!isChecked}>
        <img className="SVG_icon" src={trashIcon} alt="trash icon" />
      </button>
      {error && <p role="status">✗ Error deleting Category!</p>}
    </div>
  );
}

export default DeleteCategoryModal;

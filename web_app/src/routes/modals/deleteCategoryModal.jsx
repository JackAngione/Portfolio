import { useContext, useState } from "react";

import { backend_address } from "../../serverInfo.jsx";
import "../category.css";
import trashIcon from "../../svgIcons/trashIcon.svg";
import { AuthContext } from "../../useAuth.jsx";

function DeleteCategoryModal(props) {
  const [isChecked, setIsChecked] = useState(false);
  //CCOOOOOKKIEEEEE
  const { token } = useContext(AuthContext);

  function deleteTutorial() {
    let inputs = {
      title: props.categoryData,
    };
    fetch(backend_address + "/deleteCategory", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`, // Pass JWT in Authorization header
      },
      body: JSON.stringify(inputs),
    }).then((response) => {
      //console.log(response.data)
    });
  }

  return (
    <>
      <div id="confirmDelete">
        <label>
          Confirm Delete Category
          <input
            name="confirmDeleteCategory"
            type="checkbox"
            checked={isChecked}
            onChange={() => {
              setIsChecked(!isChecked);
            }}
          />
        </label>

        <button className="m-4" onClick={deleteTutorial} disabled={!isChecked}>
          <img className="SVG_icon" src={trashIcon} alt="trash icon" />
        </button>
      </div>
    </>
  );
}

export default DeleteCategoryModal;

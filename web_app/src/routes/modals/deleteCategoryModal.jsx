import {useState} from 'react'

import axios from "axios";
import {serverAddress} from "../serverInfo.jsx";
import "../category.css"
import trashIcon from "../../svgIcons/trashIcon.svg"
function DeleteCategoryModal(props) {
    const [isChecked, setIsChecked] = useState(false);

    function deleteTutorial()
    {
        let inputs = {
            "title": props.categoryData
        }
        axios.post(serverAddress + "/api/deleteCategory", inputs)
            .then(({response}) => {
                //console.log(response.data)
            })
    }
    return (
        <>
            <div id="confirmDelete">
                    <label>
                        Confirm Delete Category
                        <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={()=> {setIsChecked(!isChecked)}}
                        />

                    </label>


                <button onClick={deleteTutorial} disabled={!isChecked}>
                    <img className="SVG_icon" src={trashIcon}/>
                </button>

            </div>

        </>
    )



}
export default DeleteCategoryModal
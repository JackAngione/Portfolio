import {useEffect, useState} from 'react'

import axios from "axios";
import {serverAddress} from "../serverInfo.jsx";
import trashIcon from "../../svgIcons/trashIcon.svg";
import Cookies from 'js-cookie';
function DeleteModal(props) {
    const [isChecked, setIsChecked] = useState(false);

    if(!props.open)
    {
        return null
    }
    function deleteTutorial()
    {
        let inputs = {
            "title": props.tutorialData.title,
            "source": props.tutorialData.source
        }
        const token = Cookies.get('LoginToken');  // Get JWT from cookies
        axios.post(serverAddress + "/deleteTutorial", inputs, {
            headers: {
                authorization: `Bearer ${token}`,  // Pass JWT in Authorization header
            }})
            .then(({response}) => {
                //console.log(response.data)
            })
        props.onClose()
    }
    return (
        <>
            <div className="overlay">
                <div className="modalContent">
                    <h1> Delete Tutorial </h1>
                    <p>{props.tutorialData.title}</p>
                    <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={()=> {setIsChecked(!isChecked)}}
                    />
                    Confirm
                    <div className="modalButtons">
                        <button onClick={deleteTutorial} disabled={!isChecked}>
                            <img className="SVG_icon" src={trashIcon}/>
                        </button>
                        <button onClick={props.onClose}>Cancel</button>
                    </div>
                </div>
            </div>
        </>
    )



}
export default DeleteModal
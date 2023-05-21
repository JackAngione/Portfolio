import {useEffect, useState} from 'react'
import './upload.css'
import axios from 'axios'

function Upload() {
    const serverAddress = "http://127.0.0.1:3000"
    let [submitFlag, setSubmitFlag]= useState(false)
    let [keywordString, setKeywordString] = useState("")
    let [inputs, setInputs] = useState({
        title: "",
        description: "",
        source: "",
        category: "",
        //delimiter for keywords is semicolon
        keywords: []
    })

    const handleChange = (event) =>
    {
        const name = event.target.name;
        const value = event.target.value;
        setInputs(values => ({...values, [name]: value}))
    }
    const handleKeywords = (event) =>
    {

        const value = event.target.value;
        setKeywordString(value)
    }
    //SHOULD ONLY RUN ON SUBMIT
    useEffect(() => {
        console.log(submitFlag)
        if(submitFlag === true)
        {
            axios.post(serverAddress + "/api/upload", inputs)
                .then(({response}) => {
                    //console.log(response.data)
                })
        }
    }, [inputs.keywords, submitFlag])
    function finalizeKeywords()
    {
       let finalArray = keywordString.split(";")
       console.log("pre final ARRAY" + finalArray)
       for(let i =0; i < finalArray.length; i++)
       {
           finalArray[i] = finalArray[i].trim()
           console.log("after trim: " + finalArray[i])
           if(finalArray[i].length === 0)
           {
               finalArray.splice(i, 1)
               console.log("spliced array: " + finalArray)
               i = i-1
           }

           /*else
           {
               finalArray[i] = finalArray[i].replace(/^\s+/, "");
           }*/
       }
        console.log("FINAL array: " + finalArray)

        setInputs(prevState => ({...prevState, keywords: finalArray}))
        setSubmitFlag(true)
    }

    function submitUpload(e) {
        e.preventDefault()
        console.log(inputs)
        finalizeKeywords()



    }

    return (
        <>
            <h1>Upload</h1>

            <form onSubmit={submitUpload} id="uploadForm">
                <label>Enter Title:
                    <input
                        type="text"
                        name="title"
                        value={inputs.title || ""}
                        onChange={handleChange}
                        placeholder="Title"
                    />
                </label>
                <label>Enter Description:
                    <input
                        type="text"
                        name="description"
                        value={inputs.description || ""}
                        onChange={handleChange}
                        placeholder="Description"
                    />
                </label>

                <label>Enter Source Link:
                    <input
                        type="text"
                        name="source"
                        value={inputs.source || ""}
                        onChange={handleChange}
                        placeholder="Source"
                    />
                </label>
                <label>Enter Category:
                    <select
                        name="category"
                        value={inputs.category || ""}
                        onChange={handleChange}
                        placeholder="Source"
                    >
                        <option value="">None</option>
                        <option value="music">Music</option>
                        <option value="coding">Coding</option>
                    </select>
                </label>
                <label>Enter tags:
                    <input
                        type="text"
                        name="keywords"
                        value={keywordString || ""}
                        onChange={handleKeywords}
                        placeholder="Keywords"
                    />
                </label>

                <input type="submit" />
            </form>
            {inputs.title}
            {inputs.description}
            {inputs.source}
            {
                keywordString
            }
        </>
    )
}

export default Upload

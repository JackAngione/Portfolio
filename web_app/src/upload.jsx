import { useState } from 'react'
import './upload.css'
import axios from 'axios'

function Upload() {
    const serverAddress = "http://127.0.0.1:3000"
    let [inputs, setInputs] = useState({
        title: "",
        description: "",
        source: "",
        category: "",
        keywords: []
    })

    const handleChange = (event) =>
    {
        const name = event.target.name;
        const value = event.target.value;
        setInputs(values => ({...values, [name]: value}))
    }
    function submitUpload(e)
    {
        e.preventDefault()
        console.log(inputs)
        axios.post(serverAddress + "/api/upload", inputs)
            .then(({response}) => {
            //console.log(response.data)

    })
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
                        value={inputs.keywords || ""}
                        onChange={handleChange}
                        placeholder="Keywords"
                    />
                </label>

                <input type="submit" />
            </form>
            {inputs.title}
            {inputs.description}
            {inputs.source}
        </>
    )
}

export default Upload

import {useEffect, useState} from 'react'
import './upload.css'
import axios from 'axios'
import CreatableSelect from "react-select/creatable";
import {serverAddress} from "./serverInfo.jsx";
import Select from "react-select";

function Upload() {
    //LIST OF ALL CATEGORIES DERIVED FROM DATABASE (in json format)
    const [categories, setCategories] = useState([])
    //LIST OF ALL CATEGORIES DERIVED FROM DATABASE (just the titles)
    const [categoryTitles, setCategoryTitles] = useState([])

    let [submitFlag, setSubmitFlag]= useState(false)

    //REACT SELECT KEYWORDS
    const [inputValue, setInputValue] = useState("")
    const [reactKeywords, setReactKeywords] = useState([])
    const components = {
        DropdownIndicator: null,
    };
    //
    //the JSON to be uploaded to database
    let [inputs, setInputs] = useState({
        title: "",
        description: "",
        source: "",
        category: "",
        keywords: []
    })

    //GET CATEGORIES LIST FROM DATABASE
    useEffect(() =>{
        console.log("get categories use effect running!!!")
        axios.get(serverAddress+"/api/categories")
            .then(function (response) {
                setCategories(response.data)
                let tempCategoryTitle = []
                for(let i =0; i<response.data.length; i++)
                {
                    tempCategoryTitle[i] =
                        {value: response.data[i].title, label: response.data[i].title, selected: false}
                }
                setCategoryTitles([{label: "None", value: "None"}, ...tempCategoryTitle])
            })
    }, [])
    //Set the title, desc, source to what the user types in
    const handleChange = (event) =>
    {
        const name = event.target.name;
        const value = event.target.value;
        setInputs(values => ({...values, [name]: value}))
    }

    //SHOULD ONLY RUN ON SUBMIT
    useEffect(() => {

        if(submitFlag === true)
        {
            axios.post(serverAddress + "/api/upload", inputs)
                .then(({response}) => {
                    //console.log(response.data)
                })
        }
    }, [inputs.keywords, submitFlag])


    const createOption = (label) => ({
        label,
        value: label,
    });
    const handleKeyDown = (event) => {
        if (!inputValue) return;
        switch (event.key) {
            case 'Enter':
            case 'Tab':
                setReactKeywords((prev) => [...prev, createOption(inputValue)]);
                setInputValue('');
                event.preventDefault();
        }
    };
    //

    //SEND the form to database
    function submitUpload(e) {
        let finalArray = []
        for(let i=0;i<reactKeywords.length;i++)
        {
            finalArray.push(reactKeywords[i].value)
        }
        setInputs(prevState => ({...prevState, keywords: finalArray}))
        setSubmitFlag(true)
    }

    //DEBUGGING---DISPLAY REACT SELECT KEYWORDS
    function DisplayKeywords()
    {
        return (
            <>
                <ul id="">
                    {
                        reactKeywords.map((result, index) =>
                            <li key={index}>
                                {JSON.stringify(result)}
                            </li>
                        )
                    }
                </ul>
                </>
                )
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
                    <Select
                        defaultValue={categoryTitles[0]}
                        isSearchable={true}
                        name="color"
                        options={categoryTitles}
                        onChange={(event) => {
                            setInputs(values => ({...values, ["category"]: event.label}))
                        }}
                    />
                </label>

                <CreatableSelect
                    components={components}
                    inputValue={inputValue}
                    isClearable
                    isMulti
                    menuIsOpen={false}
                    onChange={(newValue) => setReactKeywords(newValue)}
                    onInputChange={(newValue) => setInputValue(newValue)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter Keywords Here"
                    value={reactKeywords}
                />
                <input type="submit" />
            </form>
        </>
    )
}
export default Upload
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
    const [subCategoryTitles, setSubCategoryTitles] = useState([])
    let [submitFlag, setSubmitFlag]= useState(false)

    //REACT SELECT KEYWORDS
    const [inputValue, setInputValue] = useState("")
    const [reactKeywords, setReactKeywords] = useState([])
    const components = {
        DropdownIndicator: null,
    };
    //
    //the JSON to be uploaded to database
    let [inputKeywords, setInputKeywords] = useState([])
    let [inputTitle, setInputTitle] = useState("")
    let [inputDesc, setInputDesc] = useState("")
    let [inputSource, setInputSource] = useState("")
    let [inputCategory, setInputCategory] = useState("")
    let [inputSubCategories, setInputSubCategories] = useState([])


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
    //update subcategory options when a category is selected
    useEffect(() => {
        let tempSubCategoryTitle = []
        for(let i = 0; i < categories.length; i++)
        {
            console.log("FINDINGSUBCAT: " + categories[i].title)
            if(categories[i].title == inputCategory)
            {
                for(let j=0; j < categories[i].subCategories.length; j++)
                {
                    tempSubCategoryTitle[j] =
                        {value: categories[i].subCategories[j], label: categories[i].subCategories[j], selected: false}
                }
                console.log("SUBCAT FOUND: " + categories[i].subCategories)
                setSubCategoryTitles(tempSubCategoryTitle)
            }
        }
    }, [inputCategory])
    //Set the title, desc, source to what the user types in


    //SHOULD ONLY RUN ON SUBMIT
    useEffect(() => {

        if(submitFlag === true)
        {
            let inputs = {"title": inputTitle, "description": inputDesc, "source": inputSource, "category": inputCategory, "subCategories": inputSubCategories, "keywords": inputKeywords}
            axios.post(serverAddress + "/api/upload", inputs)
                .then(({response}) => {
                    //console.log(response.data)
                })
        }
    }, [inputKeywords, submitFlag])


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
        setInputKeywords(finalArray)
        setSubmitFlag(true)
    }

    //DEBUGGING---DISPLAY REACT SELECT KEYWORDS
    function DisplayKeywords()
    {
        return (
            <>
                <ul id="">

                    {inputTitle}
                    {inputDesc}
                    {inputSubCategories}
                    {subCategoryTitles}
                    {inputCategory}
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
                        value={inputTitle || ""}
                        onChange={(e) => {setInputTitle(e.target.value)}}
                        placeholder="Title"
                    />
                </label>

                <label>Enter Description:
                    <input
                        type="text"
                        name="description"
                        value={inputDesc || ""}
                        onChange={(e) => {setInputDesc(e.target.value)}}
                        placeholder="Description"
                    />
                </label>

                <label>Enter Source Link:
                    <input
                        type="text"
                        name="source"
                        value={inputSource || ""}
                        onChange={(e) => {setInputSource(e.target.value)}}
                        placeholder="Source"
                    />
                </label>

                <label>Select Category:
                    <Select
                        defaultValue={categoryTitles[0]}
                        isSearchable={true}
                        name="color"
                        options={categoryTitles}
                        onChange={(e) => {
                            setInputCategory(e.label)
                        }}
                    />
                </label>

                <label>Select Sub-Category(optional):
                    <Select
                        defaultValue={subCategoryTitles[0]}
                        isMulti
                        isSearchable={false}
                        name="color"
                        options={subCategoryTitles}
                        onChange={(event) => {
                            let tempInputSubCats =[]
                            for(let i= 0; i<event.length; i++)
                            {
                                tempInputSubCats[i] = event[i].label
                            }
                            setInputSubCategories(tempInputSubCats)

                        }}
                    />
                </label>

                <CreatableSelect
                    components={components}
                    inputValue={inputValue}
                    isClearable
                    isMulti
                    menuIsOpen={false}
                    onChange={(newValue) => setInputKeywords(newValue)}
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
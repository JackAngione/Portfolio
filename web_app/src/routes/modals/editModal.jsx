import {useEffect, useState} from 'react'
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import axios from "axios";
import {serverAddress} from "../serverInfo.jsx";
import "../editTutorial.css"
function EditModal(props) {
    //KEEP THE OLD TITLE AND SOURCE
    const [oldTitle, setOldTitle] = useState("")
    const [oldSource, setOldSource] = useState("")
    //the JSON to be uploaded to database
    const [inputTitle, setInputTitle] = useState("")
    const [inputDesc, setInputDesc] = useState("")
    const [inputSource, setInputSource] = useState("")
    const [inputKeywords, setInputKeywords] = useState([])
    //REACT SELECT KEYWORDS
    const [inputValue, setInputValue] = useState("")
    const [reactKeywords, setReactKeywords] = useState([])
    const components = { DropdownIndicator: null, };
    //

    const [inputCategory, setInputCategory] = useState("")
    const [inputSubCategories, setInputSubCategories] = useState([])
    const [subCategoriesValue, setSubCategoriesValue] = useState([])
    //LIST OF ALL CATEGORIES DERIVED FROM DATABASE (just the titles)
    const [categoryTitles, setCategoryTitles] = useState([])
    const [subCategoryTitles, setSubCategoryTitles] = useState([])

    const [submitFlag, setSubmitFlag]= useState(false)

    //SHOULD ONLY RUN ON SUBMIT
    useEffect(() => {

        if(submitFlag === true)
        {
            let inputs = {
                "oldTitle": oldTitle,
                "oldSource": oldSource,
                "title": inputTitle,
                "description": inputDesc,
                "source": inputSource,
                "category": inputCategory,
                "subCategories": inputSubCategories,
                "keywords": inputKeywords}
            axios.post(serverAddress + "/editTutorial", inputs)
                .then(({response}) => {
                    //console.log(response.data)
                })
            props.onClose()
        }
    }, [inputKeywords, inputSubCategories, submitFlag])


    useEffect(() =>
    {
        if(props.tutorialData != null)
        {
            setOldTitle(props.tutorialData.title)
            setOldSource(props.tutorialData.source)
            setInputTitle(props.tutorialData.title)
            setInputDesc(props.tutorialData.description)
            setInputSource(props.tutorialData.source)
            setInputKeywords(props.tutorialData.keywords)
            setInputCategory(props.tutorialData.category)
            //init subcategories
            let tempSubCategories = []
            if(props.tutorialData.subCategories != null && props.tutorialData.subCategories.length > 0)
            {
                for(let i = 0; i< props.tutorialData.subCategories.length; i++)
                {
                    tempSubCategories[i] = {value: props.tutorialData.subCategories[i], label: props.tutorialData.subCategories[i], selected: true}
                }

                setSubCategoriesValue(tempSubCategories)
            }
            //initializes the existing keywords into the selectable
            if(props.tutorialData.keywords != null && props.tutorialData.keywords.length > 0 )
            {
                let tempKeywords = []
                for(let i = 0; i< props.tutorialData.keywords.length; i++)
                {
                    tempKeywords[i] = createOption(props.tutorialData.keywords[i])
                }
                setReactKeywords(tempKeywords)
            }
        }
        let tempCategoryTitle = []

        for(let i =0; i< props.categories.length; i++)
        {
            tempCategoryTitle[i] =
                {value:  props.categories[i].title.toLowerCase(), label:  props.categories[i].title}
        }
        setCategoryTitles(tempCategoryTitle)
        console.log(categoryTitles)

    }, [props.tutorialData])

    useEffect(() => {
        let tempSubCategoryTitle = []
        for(let i = 0; i < props.categories.length; i++)
        {
            console.log("FINDINGSUBCAT: " + props.categories[i].title)
            if(props.categories[i].title === inputCategory)
            {
                for(let j=0; j < props.categories[i].subCategories.length; j++)
                {
                    tempSubCategoryTitle[j] =
                        {value: props.categories[i].subCategories[j], label: props.categories[i].subCategories[j]}
                }
                console.log("SUBCAT FOUND: " + props.categories[i].subCategories)
                setSubCategoryTitles(tempSubCategoryTitle)
                break;
            }
        }
    }, [inputCategory])
    const createOption = (label) => ({
        label,
        value: label,
    });

    //SEND the form to database
    function submitUpload(e) {

        //convert keywords from select to standard array format
        let finalEditKeywords = []
        for(let i=0;i<reactKeywords.length;i++)
        {
            finalEditKeywords.push(reactKeywords[i].value)
        }

        //convert subcategories from select to standard array format
        let finalEditSubCategories = []
        for(let i=0;i<subCategoriesValue.length;i++)
        {
            finalEditSubCategories.push(subCategoriesValue[i].value)
        }
        setInputSubCategories(finalEditSubCategories)
        setInputKeywords(finalEditKeywords)
        setSubmitFlag(true)

    }

    function DisplayEdited()
    {
        return (
            <>
                {/*<p> {inputTitle} </p>
                <p> {inputDesc} </p>
                <p> {inputSource} </p>
                <p> {inputCategory} </p>*/}

                {
                    inputSubCategories.map((result, index) =>
                        <li key={index}>
                            {JSON.stringify(result)}
                        </li>
                    )
                }
                {
                    reactKeywords.map((result, index) =>
                        <li key={index}>
                            {JSON.stringify(result)}
                        </li>
                    )
                }
            </>
        )
    }
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
if(!props.open)
{
    return null
}

    return (
        <>
            <div className="overlay">
                <div className="modalContent">
                    <h1 id="editingTitle"> Editing Tutorial </h1>

                    {props.tutorialData.title}
                    <form onSubmit={submitUpload} id="editForm">
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
                            <textarea
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
                            <Select className="selectCategory"
                                    defaultValue={createOption(props.tutorialData.category)}
                                    onChange={(e) => {
                                        setInputCategory(e.label)
                                        setSubCategoriesValue([])
                                        }
                                    }
                                    options={categoryTitles}
                            />
                        </label>

                        <label>Select Sub-Category:
                            <Select
                                isMulti
                                isSearchable={false}
                                name="sub-categories"
                                options={subCategoryTitles}
                                onChange={(event) => {

                                    setSubCategoriesValue(event)

                                }}
                                value={subCategoriesValue}
                            />
                        </label>

                        <label>Keywords:
                            <CreatableSelect
                                components={{ DropdownIndicator: null, }}
                               /* defaultValue={
                                    //have to set default in here so that it loads in time, otherwise data loads after modal, and you need to reopen
                                    () => {

                                    }
                                }*/
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
                        </label>
                        <div className="modalButtons">
                            <button type="submit" onClick={submitUpload}>Update Tutorial</button>

                            <button onClick={props.onClose}>Cancel</button>
                        </div>
                    </form>






                </div>

            </div>

        </>
    )



}
export default EditModal
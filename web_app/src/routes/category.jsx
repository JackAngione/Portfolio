import {useEffect, useState} from 'react'
import "./category.css"
import axios from 'axios'
import CreatableSelect from "react-select/creatable";
import {serverAddress} from "./serverInfo.jsx";
import Select from "react-select";

function Category() {
    //LIST OF ALL CATEGORIES DERIVED FROM DATABASE (in json format)
    const [categories, setCategories] = useState([])
    //LIST OF ALL CATEGORIES DERIVED FROM DATABASE (just the titles)
    const [categoryTitles, setCategoryTitles] = useState([])

    //NEW CATEGORY---------------------
        const [categoryTitle, setCategoryTitle] = useState("")
        const [submitCreateCategory, setSubmitCreateCategory] = useState(false)
        //REACT SELECT KEYWORDS
        const [inputValue, setInputValue] = useState("")
        const [subCategories, setSubCategories] = useState([])

    //EDIT CATEGORY---------------------------
        //WHICH CATEGORY IS BEING EDITED
        const [categoryToEdit, setCategoryToEdit] = useState()
        //EDITED CATEGORY TITLE
        const [categoryTitleEdit, setCategoryTitleEdit] = useState("")
        //edited subcategories
        const [editSubCategories, setEditSubCategories] = useState([])
        const [editInputValue, setEditInputValue] = useState("")
        const [finalEditSubCategories, setFinalEditSubCategories] = useState([])
        //ready to submit?
        const [submitEditCategory, setSubmitEditCategory] = useState(false)

    const components = {DropdownIndicator: null,};
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
                        {value: response.data[i].title.toLowerCase(), label: response.data[i].title, selected: false}
                }
                setCategoryTitles([{label: "None", value: "None"}, ...tempCategoryTitle])
            })
    }, [])

    const createOption = (label) => ({
        label,
        value: label,
    });
    const createHandleKeyDown = (event) => {
        if (!inputValue) return;
        switch (event.key) {
            case 'Enter':
            case 'Tab':
                setSubCategories((prev) => [...prev, createOption(inputValue)]);
                setInputValue('');
                event.preventDefault();
        }
    };
    const editHandleKeyDown = (event) => {
        if (!editInputValue) return;
        switch (event.key) {
            case 'Enter':
            case 'Tab':
                setEditSubCategories((prev) => [...prev, createOption(editInputValue)]);
                setEditInputValue('');
                event.preventDefault();
        }
    };

    //SUBMIT NEW CATEGORY TO DATABASE
    useEffect(() => {
        if(submitCreateCategory === true)
        {
            const categoryFinal = {"title": categoryTitle, "subCategories": subCategories}
            axios.post(serverAddress + "/api/createCategory", categoryFinal)
                .then(({response}) => {
                    //console.log(response.data)
                })
            setSubmitCreateCategory(false)
        }
    }, [subCategories, submitCreateCategory])
    //
    //SUBMIT CATEGORY EDIT TO DATABASE
    useEffect(() => {
        if(submitEditCategory === true)
        {
            const editCategoryFinal = {"oldTitle": categoryToEdit, "title": categoryTitleEdit, "subCategories": finalEditSubCategories}
            console.log("EDITING CATEGORIES" + JSON.stringify(editCategoryFinal.subCategories))
            axios.post(serverAddress + "/api/editCategory", editCategoryFinal)
                .then(({response}) => {
                    //console.log(response.data)
                })
            setSubmitEditCategory(false)
        }
    }, [finalEditSubCategories, submitEditCategory])
    //
    //WHEN CATEGORY TO EDIT IS CHANGED, UPDATE THE SUBCATEGORIES TO EDIT
    useEffect(() => {
        console.log("EDITSUBCATEGORIES")
        console.log(categories)
        let subCategoryList = [{}]
        for(let i =0;i<categories.length;i++)
        {
            if(categories[i].title === categoryToEdit)
            {
                for(let j= 0;j< categories[i].subCategories.length; j++)
                {
                    subCategoryList[j]= {"label": categories[i].subCategories[j], "value": categories[i].subCategories[j]}
                }
                break;
            }
        }
        setEditSubCategories(subCategoryList)

    }, [categoryToEdit])
    //FINALIZE CREATE CATEGORY and trigger http push
    function submitCreateForm(e)
    {

        let finalSubCategories = []
        for(let i=0;i<subCategories.length;i++)
        {
            finalSubCategories.push(subCategories[i].value)
        }
        setSubCategories(finalSubCategories)
        setSubmitCreateCategory(true)
    }

    //SUBMIT CATEGORY EDIT TO DATABASE
    function submitEditForm(e) {
     
        let finalEditSubCategories = []
        for(let i=0;i<editSubCategories.length;i++)
        {
            finalEditSubCategories.push(editSubCategories[i].value)
        }
        setFinalEditSubCategories(finalEditSubCategories)
        setSubmitEditCategory(true)

    }
    //DEBUGGING---DISPLAY REACT SELECT KEYWORDS
    function DisplayKeywords()
    {
        return (
            <>
                <ul id="">
                    {
                        subCategories.map((result, index) =>
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
            <form onSubmit={submitCreateForm} id="categoryForm">
                <h2>Create Category</h2>
                <label>New Category Title:
                    <input
                        type="text"
                        name="title"
                        value={categoryTitle|| ""}
                        onChange={(newValue) => setCategoryTitle(newValue.target.value)}
                        placeholder="Enter Category Title"
                    />
                </label>

                <label>Sub-Categories:</label>
                <CreatableSelect
                    components={components}
                    inputValue={inputValue}
                    isClearable
                    isMulti
                    menuIsOpen={false}
                    onChange={(newValue) => setSubCategories(newValue)}
                    onInputChange={(newValue) => setInputValue(newValue)}
                    onKeyDown={createHandleKeyDown}
                    placeholder="Enter sub-categories here"
                    value={subCategories}
                />
                <button type="submit">Create Category</button>
            </form>

            <p id="spacer"></p>

            <form onSubmit={submitEditForm} id="editForm">
                <h2>Edit Existing Category</h2>
                <Select
                    defaultValue={categoryTitles[0]}
                    isSearchable={true}
                    name="color"
                    options={categoryTitles}
                    onChange={(event) => {
                        setCategoryToEdit(event.label)
                        setCategoryTitleEdit(event.label)
                    }}
                />
                <label>Edit Category Title:
                    <input
                        type="text"
                        name="title"
                        value={categoryTitleEdit|| ""}
                        onChange={(newValue) => setCategoryTitleEdit(newValue.target.value)}
                        placeholder="edit category title"
                    />
                </label>
                <label>Sub-Categories:</label>
                <CreatableSelect
                    components={components}
                    inputValue={editInputValue}
                    isClearable
                    isMulti
                    menuIsOpen={false}
                    onChange={(newValue) => setEditSubCategories(newValue)}
                    onInputChange={(newValue) => setEditInputValue(newValue)}
                    onKeyDown={editHandleKeyDown}
                    placeholder="Enter sub-categories here"
                    value={editSubCategories}
                />
                <button type="submit">Edit Category</button>
            </form>
        </>
    )
}

export default Category

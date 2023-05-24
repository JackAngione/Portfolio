import {useEffect, useState} from 'react'
import "./category.css"
import axios from 'axios'
import Select from 'react-select'
import CreatableSelect from "react-select/creatable";
function Category() {

    let [categoryName, setCategoryName] = useState("")
    //REACT SELECT KEYWORDS
    const [inputValue, setInputValue] = useState("")
    const [reactKeywords, setReactKeywords] = useState([])
    const components = {
        DropdownIndicator: null,
    };
    const handleChange = (event) =>
    {
        setCategoryName(event.target.value)
    }
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
            <h1>Category</h1>
            <form id="categoryForm">
                <label>Enter name for new category:
                    <input
                        type="text"
                        name="source"
                        value={categoryName || ""}
                        onChange={handleChange}
                        placeholder="Category Name"
                    />
                </label>
                <label>Sub-Categories:</label>
                <CreatableSelect
                    components={components}
                    inputValue={inputValue}
                    isClearable
                    isMulti
                    menuIsOpen={false}
                    onChange={(newValue) => setReactKeywords(newValue)}
                    onInputChange={(newValue) => setInputValue(newValue)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter sub-categories here"
                    value={reactKeywords}
                />
            </form>
        </>
    )
}

export default Category

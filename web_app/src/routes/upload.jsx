import { useContext, useEffect, useState } from "react";
import "./upload.css";
import axios from "axios";
import CreatableSelect from "react-select/creatable";
import { serverAddress } from "./serverInfo.jsx";
import Select from "react-select";
import { AuthContext } from "../useAuth.jsx";

function Upload() {
  //LIST OF ALL CATEGORIES DERIVED FROM DATABASE (in json format)
  const [categories, setCategories] = useState([]);
  //LIST OF ALL CATEGORIES DERIVED FROM DATABASE (just the titles)
  const [categoryTitles, setCategoryTitles] = useState([]);
  const [subCategoryTitles, setSubCategoryTitles] = useState([]);
  const [submitFlag, setSubmitFlag] = useState(false);

  //REACT SELECT KEYWORDS
  const [inputValue, setInputValue] = useState("");
  const [reactKeywords, setReactKeywords] = useState([]);
  const components = { DropdownIndicator: null };
  //
  //the JSON to be uploaded to database
  const [inputKeywords, setInputKeywords] = useState([]);
  const [inputTitle, setInputTitle] = useState("");
  const [inputDesc, setInputDesc] = useState("");
  const [inputSource, setInputSource] = useState("");
  const [inputCategory, setInputCategory] = useState("");
  const [inputSubCategories, setInputSubCategories] = useState([]);

  //CCOOOOOKKIEEEEE
  const { token } = useContext(AuthContext);
  //GET CATEGORIES LIST FROM DATABASE
  useEffect(() => {
    console.log("get categories use effect running!!!");
    axios.get(serverAddress + "/categories").then(function (response) {
      setCategories(response.data);
      let tempCategoryTitle = [];
      for (let i = 0; i < response.data.length; i++) {
        tempCategoryTitle[i] = {
          value: response.data[i].title,
          label: response.data[i].title,
          selected: false,
        };
      }
      setCategoryTitles([
        { label: "None", value: "None" },
        ...tempCategoryTitle,
      ]);
    });
  }, []);
  //update subcategory options when a category is selected
  useEffect(() => {
    let tempSubCategoryTitle = [];
    for (let i = 0; i < categories.length; i++) {
      console.log("FINDINGSUBCAT: " + categories[i].title);
      if (categories[i].title === inputCategory) {
        for (let j = 0; j < categories[i].subCategories.length; j++) {
          tempSubCategoryTitle[j] = {
            value: categories[i].subCategories[j],
            label: categories[i].subCategories[j],
            selected: false,
          };
        }
        console.log("SUBCAT FOUND: " + categories[i].subCategories);
        setSubCategoryTitles(tempSubCategoryTitle);
        break;
      }
    }
  }, [inputCategory]);
  //Set the title, desc, source to what the user types in

  //SHOULD ONLY RUN ON SUBMIT
  useEffect(() => {
    if (submitFlag === true) {
      let inputs = {
        title: inputTitle,
        description: inputDesc,
        source: inputSource,
        category: inputCategory,
        subCategories: inputSubCategories,
        keywords: inputKeywords,
      };
      //const token = Cookies.get("LoginToken"); // Get JWT from cookies

      axios
        .post(serverAddress + "/upload", inputs, {
          headers: {
            authorization: `Bearer ${token}`, // Pass JWT in Authorization header
          },
        })
        .then(({ response }) => {
          alert("New Resource created successfully!");
        })
        .catch((error) => {
          alert("Error creating new Resource!");
        });
    }
  }, [inputKeywords, submitFlag]);

  const createOption = (label) => ({
    label,
    value: label,
  });
  const handleKeyDown = (event) => {
    if (!inputValue) return;
    switch (event.key) {
      case "Enter":
      case "Tab":
        setReactKeywords((prev) => [...prev, createOption(inputValue)]);
        setInputValue("");
        event.preventDefault();
    }
  };
  //

  //SEND the form to database
  function submitUpload(e) {
    e.preventDefault();
    let finalArray = [];
    for (let i = 0; i < reactKeywords.length; i++) {
      finalArray.push(reactKeywords[i].value);
    }
    setInputKeywords(finalArray);
    setSubmitFlag(true);
  }

  //DEBUGGING---DISPLAY REACT SELECT KEYWORDS
  function DisplayKeywords() {
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
    );
  }

  return (
    <div className="my-14 flex flex-col items-center">
      <h1>Upload</h1>

      <form onSubmit={submitUpload} id="uploadForm">
        <label>
          Enter Title:
          <input
            className="border-secondary rounded-[2px] border-1"
            type="text"
            name="title"
            value={inputTitle || ""}
            onChange={(e) => {
              setInputTitle(e.target.value);
            }}
            placeholder="Title"
          />
        </label>
        <label>
          Enter Description:
          <textarea
            className="border-secondary rounded-[2px] border-1"
            type="text"
            name="description"
            value={inputDesc || ""}
            onChange={(e) => {
              setInputDesc(e.target.value);
            }}
            placeholder="Description"
          />
        </label>
        <label>
          Enter Source Link:
          <input
            className="border-secondary rounded-[2px] border-1 focus:border-white"
            type="text"
            name="source"
            value={inputSource || ""}
            onChange={(e) => {
              setInputSource(e.target.value);
            }}
            placeholder="Source"
          />
        </label>
        <label>
          Select Category:
          <Select
            className="react-select-container"
            defaultValue={categoryTitles[0]}
            isSearchable={true}
            name="color"
            options={categoryTitles}
            onChange={(e) => {
              setInputCategory(e.label);
            }}
          />
        </label>
        <label>
          Select Sub-Category(optional):
          <Select
            className="react-select-container"
            defaultValue={subCategoryTitles[0]}
            isMulti
            isSearchable={false}
            name="color"
            options={subCategoryTitles}
            onChange={(event) => {
              let tempInputSubCats = [];
              for (let i = 0; i < event.length; i++) {
                tempInputSubCats[i] = event[i].label;
              }
              setInputSubCategories(tempInputSubCats);
            }}
          />
        </label>
        Keywords
        <CreatableSelect
          className="react-select-container"
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
        <button className="m-4" type="submit" onClick={submitUpload}>
          Upload
        </button>
      </form>
    </div>
  );
}
export default Upload;

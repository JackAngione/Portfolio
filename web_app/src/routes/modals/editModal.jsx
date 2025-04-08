import { useContext, useEffect, useState } from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import axios from "axios";
import { serverAddress } from "../serverInfo.jsx";
import "./editModal.css";
import { AuthContext } from "../../useAuth.jsx";

function EditModal({ open, tutorialData, onClose }) {
  const [categories, setCategories] = useState([]);
  //KEEP THE OLD TITLE AND SOURCE
  const [oldTitle, setOldTitle] = useState("");
  const [oldSource, setOldSource] = useState("");
  //the JSON to be uploaded to database
  const [inputTitle, setInputTitle] = useState("");
  const [inputDesc, setInputDesc] = useState("");
  const [inputSource, setInputSource] = useState("");
  const [inputKeywords, setInputKeywords] = useState([]);
  const [resource_id, setResource_id] = useState("");
  //REACT SELECT KEYWORDS
  const [inputValue, setInputValue] = useState("");
  const [reactKeywords, setReactKeywords] = useState([]);
  //

  const [inputCategory, setInputCategory] = useState("");
  const [inputSubCategories, setInputSubCategories] = useState([]);
  const [subCategoriesValue, setSubCategoriesValue] = useState([]);
  //LIST OF ALL CATEGORIES DERIVED FROM DATABASE (just the titles)
  const [categoryTitles, setCategoryTitles] = useState([]);
  const [subCategoryTitles, setSubCategoryTitles] = useState([]);

  const [submitFlag, setSubmitFlag] = useState(false);

  const { token } = useContext(AuthContext); //get token from auth
  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch(serverAddress + "/categories");
      const result = await response.json();
      let tempCategoryTitle = [];
      setCategories(result);
      for (let i = 0; i < result.length; i++) {
        tempCategoryTitle[i] = {
          value: result[i].title.toLowerCase(),
          label: result[i].title,
          selected: false,
        };
      }
      setCategoryTitles(tempCategoryTitle);
    };

    fetchData().then((r) => {});
  }, []);
  //SHOULD ONLY RUN ON SUBMIT
  useEffect(() => {
    if (submitFlag === true) {
      let inputs = {
        oldTitle: oldTitle,
        oldSource: oldSource,
        title: inputTitle,
        description: inputDesc,
        source: inputSource,
        category: inputCategory,
        subCategories: inputSubCategories,
        keywords: inputKeywords,
        resource_id: resource_id,
      };

      axios
        .post(serverAddress + "/editTutorial", inputs, {
          headers: {
            authorization: `Bearer ${token}`, // Pass JWT in Authorization header
          },
        })
        .then(({ response }) => {
          //console.log(response.data)
        });
      onClose();
    }
  }, [inputKeywords, inputSubCategories, submitFlag]);

  useEffect(() => {
    if (tutorialData != null) {
      setOldTitle(tutorialData.title);
      setOldSource(tutorialData.source);
      setInputTitle(tutorialData.title);
      setInputDesc(tutorialData.description);
      setInputSource(tutorialData.source);
      setInputKeywords(tutorialData.keywords);
      setInputCategory(tutorialData.category);
      setResource_id(tutorialData.resource_id);
      //init subcategories
      let tempSubCategories = [];
      if (
        tutorialData.subCategories != null &&
        tutorialData.subCategories.length > 0
      ) {
        for (let i = 0; i < tutorialData.subCategories.length; i++) {
          tempSubCategories[i] = {
            value: tutorialData.subCategories[i],
            label: tutorialData.subCategories[i],
            selected: true,
          };
        }
        setSubCategoriesValue(tempSubCategories);
      }
      //initializes the existing keywords into the selectable
      if (tutorialData.keywords != null && tutorialData.keywords.length > 0) {
        let tempKeywords = [];
        for (let i = 0; i < tutorialData.keywords.length; i++) {
          tempKeywords[i] = createOption(tutorialData.keywords[i]);
        }
        setReactKeywords(tempKeywords);
      }
    }
    let tempCategoryTitle = [];

    for (let i = 0; i < categories.length; i++) {
      tempCategoryTitle[i] = {
        value: categories[i].title.toLowerCase(),
        label: categories[i].title,
      };
    }
    setCategoryTitles(tempCategoryTitle);
  }, [tutorialData]);

  useEffect(() => {
    let tempSubCategoryTitle = [];
    for (let i = 0; i < categories.length; i++) {
      console.log("FINDINGSUBCAT: " + categories[i].title);
      if (categories[i].title === inputCategory) {
        for (let j = 0; j < categories[i].subCategories.length; j++) {
          tempSubCategoryTitle[j] = {
            value: categories[i].subCategories[j],
            label: categories[i].subCategories[j],
          };
        }
        setSubCategoryTitles(tempSubCategoryTitle);
        break;
      }
    }
  }, [inputCategory]);
  const createOption = (label) => ({
    label,
    value: label,
  });

  //SEND the form to database
  function submitUpload(e) {
    e.preventDefault();
    //convert keywords from select to standard array format
    let finalEditKeywords = [];
    for (let i = 0; i < reactKeywords.length; i++) {
      finalEditKeywords.push(reactKeywords[i].value);
    }

    //convert subcategories from select to standard array format
    let finalEditSubCategories = [];
    for (let i = 0; i < subCategoriesValue.length; i++) {
      finalEditSubCategories.push(subCategoriesValue[i].value);
    }
    setInputSubCategories(finalEditSubCategories);
    setInputKeywords(finalEditKeywords);
    setSubmitFlag(true);
  }

  function DisplayEdited() {
    return (
      <>
        {/*<p> {inputTitle} </p>
                <p> {inputDesc} </p>
                <p> {inputSource} </p>
                <p> {inputCategory} </p>*/}

        {inputSubCategories.map((result, index) => (
          <li key={index}>{JSON.stringify(result)}</li>
        ))}
        {reactKeywords.map((result, index) => (
          <li key={index}>{JSON.stringify(result)}</li>
        ))}
      </>
    );
  }
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
  if (!open) {
    return null;
  }

  return (
    <>
      <div className="overlay">
        <div className="modalContent">
          <h1 id="editingTitle"> Edit Resource </h1>
          <p>Resource_ID: {tutorialData.resource_id}</p>
          <form onSubmit={submitUpload} className="editForm">
            <label>
              Enter Title:
              <input
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
                classNamePrefix="react-select"
                /*className="react-select-container"*/
                defaultValue={createOption(tutorialData.category)}
                onChange={(e) => {
                  setInputCategory(e.label);
                  setSubCategoriesValue([]);
                }}
                options={categoryTitles}
              />
            </label>

            <label>
              Select Sub-Category:
              <Select
                className="react-select-container"
                classNamePrefix="react-select"
                isMulti
                isSearchable={false}
                name="sub-categories"
                options={subCategoryTitles}
                onChange={(event) => {
                  setSubCategoriesValue(event);
                }}
                value={subCategoriesValue}
              />
            </label>

            <label>
              Keywords:
              <CreatableSelect
                className="react-select-container"
                classNamePrefix="react-select"
                components={{ DropdownIndicator: null }}
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
              <button className="m-4" type="submit" onClick={submitUpload}>
                Update Tutorial{" "}
              </button>

              <button onClick={onClose}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
export default EditModal;

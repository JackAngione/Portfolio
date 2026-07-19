import { useContext, useEffect, useMemo, useState } from "react";
import "./upload.css";
import CreatableSelect from "react-select/creatable";
import { backend_address } from "../serverInfo.jsx";
import { AuthContext } from "../useAuth.jsx";
import { Link } from "react-router";

function Upload() {
  //LIST OF ALL CATEGORIES DERIVED FROM DATABASE (in json format)
  const [categories, setCategories] = useState([]);

  //the JSON to be uploaded to database
  const [inputTitle, setInputTitle] = useState("");
  const [inputDesc, setInputDesc] = useState("");
  const [inputSource, setInputSource] = useState("");
  //react-select option objects ({label, value})
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubCategories, setSelectedSubCategories] = useState([]);

  //REACT SELECT KEYWORDS
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState([]);
  const components = { DropdownIndicator: null };

  //inline feedback instead of alert() popups: {ok: bool, message: string}
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  //CCOOOOOKKIEEEEE
  const { token } = useContext(AuthContext);
  const authHeaders = {
    "Content-Type": "application/json",
    authorization: `Bearer ${token}`, // Pass JWT in Authorization header
  };

  //GET CATEGORIES LIST FROM DATABASE
  function fetchCategories() {
    return fetch(backend_address + "/categories")
      .then((response) => response.json())
      .then(setCategories);
  }
  useEffect(() => {
    fetchCategories();
  }, []);

  const categoryOptions = useMemo(
    () => [
      { label: "None", value: "None" },
      ...categories.map((category) => ({
        label: category.title,
        value: category.title,
      })),
    ],
    [categories],
  );

  //sub-category options always derive from the currently selected category,
  //so they can never go stale when the category changes
  const subCategoryOptions = useMemo(() => {
    const category = categories.find(
      (c) => c.title === selectedCategory?.value,
    );
    return (category?.subCategories ?? []).map((subCategory) => ({
      label: subCategory,
      value: subCategory,
    }));
  }, [categories, selectedCategory]);

  //create a brand-new category without leaving the upload page
  function handleCreateCategory(title) {
    setStatus(null);
    fetch(backend_address + "/createCategory", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ title, subCategories: [] }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("create category failed");
        return fetchCategories();
      })
      .then(() => {
        setSelectedCategory({ label: title, value: title });
        setSelectedSubCategories([]);
        setStatus({ ok: true, message: `Category "${title}" created.` });
      })
      .catch(() => {
        setStatus({
          ok: false,
          message: `Could not create category "${title}".`,
        });
      });
  }

  //create a new sub-category on the selected category without leaving the page
  function handleCreateSubCategory(subTitle) {
    const category = categories.find(
      (c) => c.title === selectedCategory?.value,
    );
    if (!category) return;
    setStatus(null);
    fetch(backend_address + "/editCategory", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        oldTitle: category.title,
        title: category.title,
        subCategories: [...category.subCategories, subTitle],
      }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("edit category failed");
        return fetchCategories();
      })
      .then(() => {
        setSelectedSubCategories((prev) => [
          ...prev,
          { label: subTitle, value: subTitle },
        ]);
        setStatus({
          ok: true,
          message: `Sub-category "${subTitle}" added to "${category.title}".`,
        });
      })
      .catch(() => {
        setStatus({
          ok: false,
          message: `Could not add sub-category "${subTitle}".`,
        });
      });
  }

  const handleKeywordKeyDown = (event) => {
    if (!keywordInput) return;
    switch (event.key) {
      case "Enter":
      case "Tab":
        setKeywords((prev) => [
          ...prev,
          { label: keywordInput, value: keywordInput },
        ]);
        setKeywordInput("");
        event.preventDefault();
    }
  };

  //SEND the form to database
  function submitUpload(e) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    const inputs = {
      title: inputTitle,
      description: inputDesc,
      source: inputSource,
      category: selectedCategory?.value ?? "None",
      subCategories: selectedSubCategories.map(
        (subCategory) => subCategory.value,
      ),
      keywords: keywords.map((keyword) => keyword.value),
    };
    fetch(backend_address + "/upload", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(inputs),
    })
      .then((response) => {
        if (!response.ok) throw new Error("upload failed");
        //keep the category selected so batch uploads into it are quick,
        //but clear everything specific to the uploaded resource
        setInputTitle("");
        setInputDesc("");
        setInputSource("");
        setSelectedSubCategories([]);
        setKeywords([]);
        setStatus({ ok: true, message: `"${inputs.title}" uploaded.` });
      })
      .catch(() => {
        setStatus({ ok: false, message: `Upload of "${inputs.title}" failed.` });
      })
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="mb-14 flex flex-col items-center">
      <h1>Upload Resource</h1>

      <form onSubmit={submitUpload} id="uploadForm">
        <label>
          Enter Title:
          <input
            className="border-secondary rounded-[2px] border-1"
            type="text"
            name="title"
            required
            value={inputTitle}
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
            name="description"
            value={inputDesc}
            onChange={(e) => {
              setInputDesc(e.target.value);
            }}
            placeholder="Description"
          />
        </label>
        <label>
          Enter Source Link:
          <input
            className="border-secondary rounded-[2px] border-1 focus:border-ink"
            type="text"
            name="source"
            value={inputSource}
            onChange={(e) => {
              setInputSource(e.target.value);
            }}
            placeholder="Source"
          />
        </label>
        <label>
          Category (type to create a new one):
          <CreatableSelect
            className="react-select-container"
          classNamePrefix="react-select"
            isSearchable={true}
            name="category"
            options={categoryOptions}
            value={selectedCategory}
            placeholder="Select or create a category"
            onChange={(option) => {
              setSelectedCategory(option);
              setSelectedSubCategories([]);
            }}
            onCreateOption={handleCreateCategory}
          />
        </label>
        <label>
          Sub-Categories (optional, type to create new ones):
          <CreatableSelect
            className="react-select-container"
          classNamePrefix="react-select"
            isMulti
            isSearchable={true}
            name="subCategories"
            options={subCategoryOptions}
            value={selectedSubCategories}
            placeholder="Select or create sub-categories"
            isDisabled={
              !selectedCategory || selectedCategory.value === "None"
            }
            onChange={(options) => {
              setSelectedSubCategories(options ?? []);
            }}
            onCreateOption={handleCreateSubCategory}
          />
        </label>
        Keywords
        <CreatableSelect
          className="react-select-container"
          classNamePrefix="react-select"
          components={components}
          inputValue={keywordInput}
          isClearable
          isMulti
          menuIsOpen={false}
          onChange={(newValue) => setKeywords(newValue ?? [])}
          onInputChange={(newValue) => setKeywordInput(newValue)}
          onKeyDown={handleKeywordKeyDown}
          placeholder="Enter Keywords Here"
          value={keywords}
        />
        <button className="m-4" type="submit" disabled={submitting}>
          {submitting ? "Uploading..." : "Upload"}
        </button>
        {status && (
          <p role="status">
            {status.ok ? "✓" : "✗"} {status.message}
          </p>
        )}
      </form>

      <Link className="mt-8 underline" to="/resources/category">
        Rename or delete categories →
      </Link>
    </div>
  );
}

export default Upload;

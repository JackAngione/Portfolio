import { resourceUrl } from "../../security.js";
import { useContext, useEffect, useState } from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import { backend_address } from "../../serverInfo.jsx";
import "./editModal.css";
import { AuthContext } from "../../useAuth.jsx";

const createOption = (label) => ({ label, value: label });

// Keep category data while the dialog is closed. The form below mounts for each
// opening so an abandoned draft cannot leak into another resource.
function EditModal({ open, tutorialData, onClose, onEdited }) {
  const [categories, setCategories] = useState(null);
  const { token } = useContext(AuthContext);

  useEffect(() => {
    if (!open || categories !== null) return;
    let active = true;
    const controller = new AbortController();
    async function fetchCategories() {
      try {
        const response = await fetch(backend_address + "/categories", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("categories request failed");
        const result = await response.json();
        if (active) setCategories(result);
      } catch (error) {
        if (active) console.error("failed to load categories:", error);
      }
    }
    fetchCategories();
    return () => {
      active = false;
      controller.abort();
    };
  }, [open, categories]);

  if (!open) return null;
  return (
    <EditForm
      key={
        tutorialData.resource_id ||
        `${tutorialData.title}:${tutorialData.source}`
      }
      tutorialData={tutorialData}
      categories={categories ?? []}
      token={token}
      onClose={onClose}
      onEdited={onEdited}
    />
  );
}

function EditForm({ tutorialData, categories, token, onClose, onEdited }) {
  const [inputTitle, setInputTitle] = useState(tutorialData.title ?? "");
  const [inputDesc, setInputDesc] = useState(tutorialData.description ?? "");
  const [inputSource, setInputSource] = useState(tutorialData.source ?? "");
  const [inputCategory, setInputCategory] = useState(
    tutorialData.category ?? "",
  );
  const [subCategoriesValue, setSubCategoriesValue] = useState(() =>
    (tutorialData.subCategories ?? []).map(createOption),
  );
  const [reactKeywords, setReactKeywords] = useState(() => {
    const keywords = tutorialData.keywords ?? [];
    return (
      Array.isArray(keywords) ? keywords : keywords.split(" ").filter(Boolean)
    ).map(createOption);
  });
  const [inputValue, setInputValue] = useState("");
  const categoryTitles = categories.map(({ title }) => ({
    value: title.toLowerCase(),
    label: title,
  }));
  const subCategoryTitles =
    categories
      .find(({ title }) => title === inputCategory)
      ?.subCategories?.map(createOption) ?? [];

  function submitUpload(event) {
    event.preventDefault();
    if (!resourceUrl(inputSource)) {
      window.alert("Enter an absolute HTTP or HTTPS resource URL.");
      return;
    }
    const resourceId = tutorialData.resource_id ?? "";
    const inputs = {
      title: inputTitle,
      description: inputDesc,
      source: inputSource,
      category: inputCategory,
      subCategories: subCategoriesValue.map(({ value }) => value),
      keywords: reactKeywords.map(({ value }) => value),
      resource_id: resourceId,
    };
    fetch(backend_address + "/tutorials/" + encodeURIComponent(resourceId), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(inputs),
    })
      .then((response) => {
        if (!response.ok) throw new Error("edit failed");
        alert("Resource edited successfully!");
        onEdited?.();
      })
      .catch((error) => {
        console.log(error);
        alert("Error editing Resource!");
      });
    onClose();
  }

  function handleKeywordKeyDown(event) {
    if (!inputValue) return;
    if (event.key === "Enter" || event.key === "Tab") {
      setReactKeywords((previous) => [...previous, createOption(inputValue)]);
      setInputValue("");
      event.preventDefault();
    }
  }

  return (
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
              value={inputTitle}
              onChange={(event) => setInputTitle(event.target.value)}
              placeholder="Title"
            />
          </label>
          <label>
            Enter Description:
            <textarea
              type="text"
              name="description"
              value={inputDesc}
              onChange={(event) => setInputDesc(event.target.value)}
              placeholder="Description"
            />
          </label>
          <label>
            Enter Source Link:
            <input
              type="text"
              name="source"
              value={inputSource}
              onChange={(event) => setInputSource(event.target.value)}
              placeholder="Source"
            />
          </label>
          <label>
            Select Category:
            <Select
              className="react-select-container"
              classNamePrefix="react-select"
              value={inputCategory ? createOption(inputCategory) : null}
              onChange={(option) => {
                setInputCategory(option?.label ?? "");
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
              onChange={(values) => setSubCategoriesValue(values ?? [])}
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
              onChange={(values) => setReactKeywords(values ?? [])}
              onInputChange={(value) => setInputValue(value)}
              onKeyDown={handleKeywordKeyDown}
              placeholder="Enter Keywords Here"
              value={reactKeywords}
            />
          </label>
          <div className="modalButtons">
            <button className="m-4" type="submit">
              Update Tutorial{" "}
            </button>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditModal;

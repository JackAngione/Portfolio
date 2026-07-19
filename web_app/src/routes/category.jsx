import { useContext, useEffect, useMemo, useState } from "react";
import "./category.css";
import CreatableSelect from "react-select/creatable";
import { backend_address } from "../serverInfo.jsx";
import Select from "react-select";
import DeleteCategoryModal from "./modals/deleteCategoryModal.jsx";
import { AuthContext } from "../useAuth.jsx";
import { Link } from "react-router";

function Category() {
  //LIST OF ALL CATEGORIES DERIVED FROM DATABASE (in json format)
  const [categories, setCategories] = useState([]);

  //WHICH CATEGORY IS BEING EDITED (react-select option {label, value})
  const [categoryToEdit, setCategoryToEdit] = useState(null);
  //EDITED CATEGORY TITLE
  const [categoryTitleEdit, setCategoryTitleEdit] = useState("");
  //edited subcategories
  const [editSubCategories, setEditSubCategories] = useState([]);
  const [editInputValue, setEditInputValue] = useState("");

  //inline feedback instead of alert() popups: {ok: bool, message: string}
  const [status, setStatus] = useState(null);

  const components = { DropdownIndicator: null };

  //CCOOOOOKKIEEEEE
  const { token } = useContext(AuthContext);

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
    () =>
      categories.map((category) => ({
        label: category.title,
        value: category.title,
      })),
    [categories],
  );

  const editHandleKeyDown = (event) => {
    if (!editInputValue) return;
    switch (event.key) {
      case "Enter":
      case "Tab":
        setEditSubCategories((prev) => [
          ...prev,
          { label: editInputValue, value: editInputValue },
        ]);
        setEditInputValue("");
        event.preventDefault();
    }
  };

  //load a category's current title + subcategories into the edit form
  function selectCategoryToEdit(option) {
    setCategoryToEdit(option);
    setCategoryTitleEdit(option?.label ?? "");
    const category = categories.find((c) => c.title === option?.value);
    setEditSubCategories(
      (category?.subCategories ?? []).map((subCategory) => ({
        label: subCategory,
        value: subCategory,
      })),
    );
    setStatus(null);
  }

  //SUBMIT CATEGORY EDIT TO DATABASE
  function submitEditForm(e) {
    e.preventDefault();
    if (!categoryToEdit) return;
    const editCategoryFinal = {
      oldTitle: categoryToEdit.value,
      title: categoryTitleEdit,
      subCategories: editSubCategories.map((subCategory) => subCategory.value),
    };
    fetch(backend_address + "/editCategory", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`, // Pass JWT in Authorization header
      },
      body: JSON.stringify(editCategoryFinal),
    })
      .then((response) => {
        if (!response.ok) throw new Error("edit category failed");
        return fetchCategories();
      })
      .then(() => {
        setCategoryToEdit({
          label: editCategoryFinal.title,
          value: editCategoryFinal.title,
        });
        setStatus({
          ok: true,
          message: `Category "${editCategoryFinal.title}" saved.`,
        });
      })
      .catch(() => {
        setStatus({ ok: false, message: "Error editing Category!" });
      });
  }

  //called by the delete modal after a successful delete
  function handleDeleted(deletedTitle) {
    setCategoryToEdit(null);
    setCategoryTitleEdit("");
    setEditSubCategories([]);
    fetchCategories();
    setStatus({ ok: true, message: `Category "${deletedTitle}" deleted.` });
  }

  return (
    <div className={"mb-14 flex flex-col items-center"}>
      <form
        onSubmit={submitEditForm}
        className="flex flex-col items-center gap-4"
      >
        <h1>Manage Categories</h1>
        <Select
          className="react-select-container"
          classNamePrefix="react-select"
          isSearchable={true}
          name="category"
          options={categoryOptions}
          value={categoryToEdit}
          placeholder="Select a category to edit"
          onChange={selectCategoryToEdit}
        />
        <label className="flex flex-col">
          Edit Category Title:
          <input
            className="border-secondary border-1"
            type="text"
            name="title"
            value={categoryTitleEdit}
            onChange={(e) => setCategoryTitleEdit(e.target.value)}
            placeholder="edit category title"
            disabled={!categoryToEdit}
          />
        </label>
        <label className="flex flex-col">
          Sub-Categories:
          <CreatableSelect
            className="react-select-container"
          classNamePrefix="react-select"
            components={components}
            inputValue={editInputValue}
            isClearable
            isMulti
            menuIsOpen={false}
            onChange={(newValue) => setEditSubCategories(newValue ?? [])}
            onInputChange={(newValue) => setEditInputValue(newValue)}
            onKeyDown={editHandleKeyDown}
            placeholder="Enter sub-categories here"
            value={editSubCategories}
            isDisabled={!categoryToEdit}
          />
        </label>

        <button className={"m-4"} type="submit" disabled={!categoryToEdit}>
          Save Changes
        </button>
        {status && (
          <p role="status">
            {status.ok ? "✓" : "✗"} {status.message}
          </p>
        )}
      </form>
      {categoryToEdit && (
        <DeleteCategoryModal
          categoryData={categoryToEdit.value}
          onDeleted={handleDeleted}
        />
      )}

      <Link className="mt-8 underline" to="/resources/upload">
        ← Upload a resource (new categories can be created there)
      </Link>
    </div>
  );
}

export default Category;

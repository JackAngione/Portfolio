import { useContext, useEffect, useState } from "react";
import "./resourcePage.css";
import EditModal from "./modals/editModal.jsx";
import DeleteModal from "./modals/deleteModal.jsx";
import trashIcon from "../svgIcons/trashIcon.svg";
import { meiliSearch_Search_Key } from "../API_Keys";
import { searchServer } from "./serverInfo.jsx";
import {
  InstantSearch,
  ClearRefinements,
  SearchBox,
  Hits,
  Highlight,
  RefinementList,
  HierarchicalMenu,
} from "react-instantsearch";
import { instantMeiliSearch } from "@meilisearch/instant-meilisearch";
import { Outlet } from "react-router";
import { AuthContext } from "../useAuth.jsx";
import editModal from "./modals/editModal.jsx";
import deleteModal from "./modals/deleteModal.jsx";

function ResourcesPage() {
  const authenticated = useContext(AuthContext).loggedIn;
  const { searchClient } = instantMeiliSearch(
    searchServer,
    meiliSearch_Search_Key,
    { placeholderSearch: false },
  );
  //THE USER'S SEARCH QUERY
  const [searchText, updateSearchText] = useState("");
  //LIST OF ALL CATEGORIES DERIVED FROM DATABASE (in json format)
  const [categories, setCategories] = useState();
  const [loadingCategories, setLoadingCategories] = useState(true);
  //LIST OF ALL CATEGORIES DERIVED FROM DATABASE (just the titles)
  //WHICH CATEGORIES THE USER IS FILTERING BY
  const [chosenCategories, setChosenCategory] = useState([]);
  //SEARCH RESULTS ARE AN ARRAY OF MONGODB DOCUMENTS IN JSON FORMAT

  //EDITOR MODAL
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [tutorialToEdit, setTutorialToEdit] = useState({});

  function runEditModal() {
    return (
      <EditModal
        open={openEditModal}
        tutorialData={tutorialToEdit}
        onClose={() => setOpenEditModal(!openEditModal)}
      />
    );
  }
  function runDeleteModal() {
    {
      //TODO only run on authentication
      return (
        <DeleteModal
          open={openDeleteModal}
          tutorialData={tutorialToEdit}
          onClose={() => setOpenDeleteModal(!openDeleteModal)}
        />
      );
    }
  }

  const Hit = ({ hit }) => {
    //hit is basically a json object of the meilisearch document
    return (
      <div className="m-8 flex flex-col items-center outline-2">
        <button
          onClick={() => {
            window.open(`${hit.source}`);
          }}
        >
          <h3>
            {" "}
            <Highlight attribute="title" hit={hit} />{" "}
          </h3>
          <p className="text-sm">{`${hit.description}`}</p>
        </button>
        {
          //EDIT and DELETE TUTORIAL BUTTON
        }
        {authenticated ? (
          <div className="flex scale-75 justify-center gap-2">
            <button
              onClick={() => {
                console.log("hit: " + hit);

                setOpenEditModal(!openEditModal);
                setTutorialToEdit(hit);
              }}
            >
              EDIT
            </button>
            <button
              onClick={() => {
                console.log("hitme!baby one more time");
                setTutorialToEdit(hit);
                setOpenDeleteModal(!openDeleteModal);
              }}
            >
              <img className="SVG_icon" src={trashIcon} alt="removeIcon" />
            </button>{" "}
          </div>
        ) : (
          <></>
        )}
      </div>
    );
  };

  return (
    <>
      <h1 className="my-14 text-center font-bold">RESOURCES</h1>
      {/*{!loadingCategories ? (
        <EditModal
          open={true}
          categories={categories}
          tutorialData={tutorialToEdit}
          onClose={() => setOpenEditModal(!openEditModal)}
        />
      ) : null}*/}
      {runEditModal()}
      {runDeleteModal()}
      <div className="lg:mr-44 lg:flex lg:justify-center">
        <InstantSearch indexName="resources" searchClient={searchClient}>
          <div className="text-primary block justify-center sm:flex lg:block">
            <div className="sm:text-left">
              <h3 className="pb-2 font-bold">Categories</h3>
              <RefinementList
                className=""
                title="Category"
                attribute="category"
                sortBy={["name"]}
              />

              <h3 className="pb-2 font-bold">SubCategories</h3>
              <RefinementList
                className=""
                title="SubCategories"
                attribute="subCategories"
                sortBy={["name"]}
              />
            </div>

            <ClearRefinements className="text-primary mt-4 content-center font-bold sm:ml-4 lg:m-0 lg:mt-4" />
          </div>
          <div className="searchResults">
            <SearchBox autoFocus={true} className="text-primary py-4" />
            <Hits hitComponent={Hit} />
          </div>
        </InstantSearch>
      </div>
    </>
  );
}

export default ResourcesPage;

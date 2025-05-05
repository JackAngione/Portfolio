import { useContext, useState } from "react";
import "./resourcePage.css";
import EditModal from "./modals/editModal.jsx";
import DeleteModal from "./modals/deleteModal.jsx";
import trashIcon from "../svgIcons/trashIcon.svg";
import { meiliSearch_Search_Key } from "../API_Keys";
import { searchServer } from "./serverInfo.jsx";
import {
  ClearRefinements,
  Highlight,
  Hits,
  InstantSearch,
  RefinementList,
  SearchBox,
} from "react-instantsearch";
import { instantMeiliSearch } from "@meilisearch/instant-meilisearch";
import { AuthContext } from "../useAuth.jsx";

function ResourcesPage() {
  const authenticated = useContext(AuthContext).loggedIn;
  const { searchClient } = instantMeiliSearch(
    searchServer,
    meiliSearch_Search_Key,
    { placeholderSearch: false },
  );

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
      <div className="m-8 flex flex-col items-center">
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
          <div className="text-primary justify-center sm:flex lg:block">
            <div className="sm:flex sm:gap-6 sm:text-left lg:flex-col">
              <div>
                <h3 className="pb-2 font-bold">Categories</h3>
                <RefinementList
                  className=""
                  title="Category"
                  attribute="category"
                  sortBy={["name"]}
                />
              </div>
              <div>
                <h3 className="pb-2 font-bold">SubCategories</h3>
                <RefinementList
                  className=""
                  title="SubCategories"
                  attribute="subCategories"
                  sortBy={["name"]}
                />
              </div>
            </div>

            <ClearRefinements className="text-primary mt-4 content-center font-bold sm:ml-6 lg:m-0 lg:mt-4" />
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

import { useContext, useEffect, useState } from "react";
import "./resourcePage.css";
import EditModal from "./modals/editModal.jsx";
import DeleteModal from "./modals/deleteModal.jsx";
import trashIcon from "../svgIcons/trashIcon.svg";
import { meiliSearch_Search_Key } from "../API_Keys";
import { search_server } from "../serverInfo.jsx";
import {
  ClearRefinements,
  Highlight,
  Hits,
  InstantSearch,
  RefinementList,
  SearchBox,
  useInstantSearch,
} from "react-instantsearch";
import { instantMeiliSearch } from "@meilisearch/instant-meilisearch";
import { AuthContext } from "../useAuth.jsx";

//created once at module scope: rebuilding the client on every render would
//reset InstantSearch's cache and connection state each time a modal toggles
const { searchClient } = instantMeiliSearch(
  search_server,
  meiliSearch_Search_Key,
  { placeholderSearch: false },
);

function ResourcesPage() {
  const authenticated = useContext(AuthContext).loggedIn;

  //EDITOR MODAL
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [tutorialToEdit, setTutorialToEdit] = useState({});

  //typing anywhere on the page lands in the search bar: focus it before the
  //keystroke's default action so the character is inserted there
  useEffect(() => {
    function redirectTypingToSearch(e) {
      if (openEditModal || openDeleteModal) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length !== 1 && e.key !== "Backspace") return;
      const el = document.activeElement;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable)
      )
        return;
      //Backspace only claims focus; without this some browsers treat it as
      //history-back when nothing is focused
      if (e.key === "Backspace") e.preventDefault();
      document.querySelector(".ais-SearchBox-input")?.focus();
    }
    document.addEventListener("keydown", redirectTypingToSearch);
    return () =>
      document.removeEventListener("keydown", redirectTypingToSearch);
  }, [openEditModal, openDeleteModal]);

  //must render inside <InstantSearch> so useInstantSearch can refresh the hits
  function Modals() {
    const { refresh } = useInstantSearch();
    return (
      <>
        <EditModal
          open={openEditModal}
          tutorialData={tutorialToEdit}
          onClose={() => setOpenEditModal(!openEditModal)}
        />
        <DeleteModal
          open={openDeleteModal}
          tutorialData={tutorialToEdit}
          onClose={() => setOpenDeleteModal(!openDeleteModal)}
          onDeleted={() => {
            //meilisearch applies deletes as an async task; give it a moment
            //before re-querying so the removed hit doesn't come back stale
            setTimeout(refresh, 300);
          }}
        />
      </>
    );
  }

  const Hit = ({ hit }) => {
    //hit is basically a json object of the meilisearch document
    return (
      <div className="mx-2 my-6 flex flex-col items-center">
        <button
          className="w-full max-w-[520px]"
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
      <h1 className="mb-14 text-center font-bold">RESOURCES</h1>
      {/*{!loadingCategories ? (
        <EditModal
          open={true}
          categories={categories}
          tutorialData={tutorialToEdit}
          onClose={() => setOpenEditModal(!openEditModal)}
        />
      ) : null}*/}
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 lg:flex-row lg:items-start lg:justify-center">
        <InstantSearch indexName="resources" searchClient={searchClient}>
          <Modals />
          <aside className="text-primary mx-auto w-full max-w-[600px] text-left lg:mx-0 lg:w-56 lg:shrink-0">
            <div className="flex flex-wrap gap-x-12 gap-y-6 lg:flex-col">
              <div>
                <h3 className="pb-2 text-2xl! font-bold">Categories</h3>
                <RefinementList
                  title="Category"
                  attribute="category"
                  sortBy={["name"]}
                />
              </div>
              <div>
                <h3 className="pb-2 text-2xl! font-bold">SubCategories</h3>
                <RefinementList
                  title="SubCategories"
                  attribute="subCategories"
                  sortBy={["name"]}
                />
              </div>
            </div>

            <ClearRefinements className="mt-6" />
          </aside>
          <div className="searchResults mx-auto w-full max-w-[600px]">
            <SearchBox autoFocus={true} className="text-primary pb-4" />
            <Hits hitComponent={Hit} />
          </div>
          {/* mirrors the sidebar's width so the results column (and the
              search bar) stays horizontally centered in the viewport */}
          <div aria-hidden className="hidden lg:block lg:w-56 lg:shrink-0" />
        </InstantSearch>
      </div>
    </>
  );
}

export default ResourcesPage;

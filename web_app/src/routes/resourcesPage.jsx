import {useEffect, useState} from 'react'
import './resourcePage.css'
import axios from 'axios'
import {serverAddress} from "./serverInfo.jsx";
import EditModal from "./modals/editModal.jsx";
import DeleteModal from "./modals/deleteModal.jsx";
import trashIcon from "../svgIcons/trashIcon.svg";
import Cookies from "js-cookie";
import {meiliSearch_Search_Key} from "../API_Keys"
import {searchServer} from "./serverInfo.jsx";
import {InstantSearch, ClearRefinements, SearchBox, Hits, Highlight, RefinementList, HierarchicalMenu} from 'react-instantsearch';

const searchClient = instantMeiliSearch(
    searchServer,
    meiliSearch_Search_Key,
    {placeholderSearch: false}
);
import { instantMeiliSearch } from '@meilisearch/instant-meilisearch';
function ResourcesPage() {
    const token = Cookies.get("LoginToken")

    //THE USER'S SEARCH QUERY
    const [searchText, updateSearchText] = useState("")
    //LIST OF ALL CATEGORIES DERIVED FROM DATABASE (in json format)
    const [categories, setCategories] = useState([])
    //LIST OF ALL CATEGORIES DERIVED FROM DATABASE (just the titles)
    const [categoryTitles, setCategoryTitles] = useState([])
    //WHICH CATEGORIES THE USER IS FILTERING BY
    const [chosenCategories, setChosenCategory] = useState([])
    //SEARCH RESULTS ARE AN ARRAY OF MONGODB DOCUMENTS IN JSON FORMAT

    //EDITOR MODAL
    const [openEditModal, setOpenEditModal] = useState(false)
    const [openDeleteModal, setOpenDeleteModal] = useState(false)
    const [tutorialToEdit, setTutorialToEdit] = useState()


    const Hit = ({ hit }) => {
        //hit is basically a json object of the meilisearch document
        //when clicking on a resource, go to it's source page
        return(
            <div className="searchResults">
                <button
                    onClick={()=>{window.open(`${hit.source}`)}}>

                   <h2 className=" text-black font-bold text-2xl"> <Highlight attribute="title" hit={hit}/> </h2>
                    <p className="text-sm text-black">{`${hit.description}`}</p>
                </button>
                {
                    //EDIT and DELETE TUTORIAL BUTTON
                }
                {token ? ( <><button onClick={() =>{
                    console.log(hit)
                    setTutorialToEdit(hit)
                    setOpenEditModal(!openEditModal)
                }}>
                    EDIT
                </button>
                    <button onClick={() =>{
                        console.log("hitme!baby one more time")
                        setTutorialToEdit(hit)
                        setOpenDeleteModal(!openDeleteModal)
                    }}>
                        <img className="SVG_icon" src={trashIcon} alt="removeIcon"/>
                    </button> </>) : (<></>)}
                <EditModal open = {openEditModal} categories = {categories} tutorialData = {tutorialToEdit} onClose={()=> setOpenEditModal(!openEditModal)}/>
                <DeleteModal open = {openDeleteModal} tutorialData = {tutorialToEdit} onClose={()=> setOpenDeleteModal(!openDeleteModal)}/>
            </div>
        )
    };
  return (
    <>
    <h1 className="text-center py-14  font-bold">RESOURCES</h1>
                <div className="lg:flex lg:mr-44 lg:justify-center">
                    <InstantSearch className=""
                        indexName="resources"
                        searchClient={searchClient}
                    >

                        <div className="lg:block sm:flex justify-center block text-center ">
                            <div className="sm:text-left  text-center pr-4">
                                <h3 className="pb-2 font-bold">Categories</h3>
                                <RefinementList
                                    className="ml-4 justify-center flex-row"
                                    title="Category"
                                    attribute="category"
                                    sortBy={['name']}
                                />
                            </div>

                            <div className="sm:text-left pr-4">
                                <h3 className="pb-2 font-bold">SubCategories</h3>
                                <RefinementList
                                    className="ml-4"
                                    title="SubCategories"
                                    attribute="subCategories"
                                    sortBy={['name']}
                                />
                            </div>


                            <ClearRefinements className="content-center font-bold"/>
                        </div>
                        <div className="searchResults">
                            <div >
                                <SearchBox className="text-black py-4"/>
                                <Hits hitComponent={Hit}/>
                            </div>
                        </div>

                    </InstantSearch>
                </div>

    </>
  )
}

export default ResourcesPage
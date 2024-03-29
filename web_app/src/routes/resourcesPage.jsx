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

    //GET ALL CATEGORIES ON PAGE LOAD
    useEffect(() =>{
        getCategories()
    }, [])
    const Hit = ({ hit }) => {
        //hit is basically a json object of the meilisearch document
        //when clicking on a resource, go to it's source page
        return(
            <div className="searchResults">
                <button
                    onClick={()=>{window.open(`${hit.source}`)}}>

                   <h2> <Highlight attribute="title" hit={hit}/> </h2>
                    <p>{`${hit.description}`}</p>
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

    const handleCategoryChoice = (event) => {
        //event is an array of all the categories chosen
        let tempChosen = []
        for(let i=0; i<event.length;i++)
        {
            tempChosen[i] = event[i].label
        }
        setChosenCategory(tempChosen)
        console.log("TEMPCHOSEN: " + tempChosen)
        console.log("chosen: " + chosenCategories)
    };

  function getCategories()
  {
    axios.get(serverAddress+"/categories")
        .then(function (response) {
            let tempCategoryTitle = []
            setCategories(response.data)
            for(let i =0; i<response.data.length; i++)
            {
                tempCategoryTitle[i] =
                    {value: response.data[i].title.toLowerCase(), label: response.data[i].title, selected: false}
            }
            setCategoryTitles(tempCategoryTitle)
            console.log(categoryTitles)
        })
  }
    function DisplaySearchResults()
    {
        return (
            <>
                <ul id="searchResultList">
                    {
                        searchresults.map((result, index) =>
                            <li key={index}>
                                <div id="singleSearchResult">
                                    <a href={result.source} target="_blank" rel="noopener noreferrer">
                                        <p id="searchResultTitle">{result.title}</p>
                                        <p id="searchResultDesc">{result.description}</p>
                                    </a>
                                    {
                                        //EDIT and DELETE TUTORIAL BUTTON
                                    }
                                    {token ? ( <><button onClick={() =>{
                                        setTutorialToEdit(result)
                                        setOpenEditModal(!openEditModal)
                                    }}>
                                        EDIT
                                    </button>
                                        <button onClick={() =>{
                                            setTutorialToEdit(result)
                                            setOpenDeleteModal(!openDeleteModal)
                                        }}>
                                            <img className="SVG_icon" src={trashIcon} alt="removeIcon"/>
                                        </button> </>) : (<></>)}
                                </div>
                            </li>
                        )
                    }
                </ul>

            </>
        )
    }

  return (
    <>
    <h1>RESOURCES</h1>

        <div className="instantSearch">
            <InstantSearch

                indexName="resources"
                searchClient={searchClient}
            >
                <div className="categoryRefinementList">
                    <p>Category</p>
                    <RefinementList
                        title="Category"
                        attribute="category"/>
                    <p>SubCategories</p>
                    <RefinementList
                        title="SubCategories"
                        attribute="subCategories"
                    />
                    <ClearRefinements title="CLEAR"/>
                </div>
                <div className="searchResults">
                    <SearchBox />
                    <Hits hitComponent= {Hit} />
                </div>
            </InstantSearch>
        </div>
    </>
  )
}
export default ResourcesPage
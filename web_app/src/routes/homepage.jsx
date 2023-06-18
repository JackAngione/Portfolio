import {useEffect, useState} from 'react'
import './homepage.css'
import axios from 'axios'
import Select from 'react-select'
import {serverAddress} from "./serverInfo.jsx";
import EditModal from "./modals/editModal.jsx";
import DeleteModal from "./modals/deleteModal.jsx";
import trashIcon from "../svgIcons/trashIcon.svg";
function Homepage() {
    //THE USER'S SEARCH QUERY
    const [searchText, updateSearchText] = useState("")
    //LIST OF ALL CATEGORIES DERIVED FROM DATABASE (in json format)
    const [categories, setCategories] = useState([])
    //LIST OF ALL CATEGORIES DERIVED FROM DATABASE (just the titles)
    const [categoryTitles, setCategoryTitles] = useState([])
    //WHICH CATEGORIES THE USER IS FILTERING BY
    const [chosenCategories, setChosenCategory] = useState([])
    //SEARCH RESULTS ARE AN ARRAY OF MONGODB DOCUMENTS IN JSON FORMAT
    const [searchresults, setSearchResults] = useState([])

    //EDITOR MODAL
    const [openEditModal, setOpenEditModal] = useState(false)
    const [openDeleteModal, setOpenDeleteModal] = useState(false)
    const [tutorialToEdit, setTutorialToEdit] = useState()


    //GET ALL CATEGORIES ON PAGE LOAD
    useEffect(() =>{
        getCategories()
    }, [])
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
  const handleSearchChange = (event) =>
  {
      updateSearchText(event.target.value);
  }
  const handleKeyPress = (event) => {

      if (event.key === 'Enter') {
          event.preventDefault();
      searchDatabase(searchText)
    }
      //
  };
  function getCategories()
  {
    axios.get(serverAddress+"/api/categories")
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
  //send search query to database and get results
    function searchDatabase(searchQuery)
    {
        //user is trying to make a search with no categories and no query
        if(searchQuery ==="" && chosenCategories.length===0)
        {
            console.log("INVALID SEARCH!!!yyyooouuuu")
        }
        else
        {
            let encodedSearch = encodeURIComponent(searchQuery)
            axios.get(serverAddress+"/api/search", {
                params: {
                    searchQuery: encodedSearch,
                    categories: chosenCategories
                }
            })
                .then(function (response) {
                    setSearchResults(response.data)
                    console.log(searchresults)
                })
        }

    }
    //TEST TO SHOW CATEGORIES
    function DisplayCategories()
    {
        return (
            <>
                <ul id="">
                    {
                        categories.map((result, index) =>
                            <li key={index}>
                                {JSON.stringify(result)}
                            </li>
                        )
                    }
                </ul>
                {<ul id="">
                    {
                        chosenCategories.map((result, index) =>
                            <li key={index}>
                                {result}
                            </li>
                        )
                    }
                </ul>}
            </>
        )
    }
    //SHOW THE SEARCH RESULTS
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
                          <button onClick={() =>{
                              setTutorialToEdit(result)
                              setOpenEditModal(!openEditModal)
                          }}>
                              EDIT
                          </button>

                          <button onClick={() =>{
                              setTutorialToEdit(result)
                              setOpenDeleteModal(!openDeleteModal)
                          }}>
                              <img className="SVG_icon" src={trashIcon}/>
                          </button>
                      </div>
                  </li>
                )
              }
            </ul>
            <EditModal open = {openEditModal} categories = {categories} tutorialData = {tutorialToEdit} onClose={()=> setOpenEditModal(!openEditModal)}/>
            <DeleteModal open = {openDeleteModal} tutorialData = {tutorialToEdit} onClose={()=> setOpenDeleteModal(!openDeleteModal)}/>

        </>
    )
  }
  return (
    <>
    <h1>HOME</h1>

        <Select
            isMulti
            onChange={(event) => handleCategoryChoice(event)}
            options={categoryTitles}
        />

    <input
        type= "text"
        value = {searchText}
        onChange = {handleSearchChange}
        onKeyDown={handleKeyPress}
    />
    {
        searchresults.length !== 0 &&
        <DisplaySearchResults/>
    }
    {/*
        //FORDEBUGGING
        <DisplayCategories/>
       */
    }

    </>
  )
}

export default Homepage

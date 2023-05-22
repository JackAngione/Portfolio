import {useEffect, useState} from 'react'
import './homepage.css'
import axios from 'axios'
import Select from 'react-select'
function Homepage() {
    const serverAddress = "http://127.0.0.1:3000"
    //THE USER'S SEARCH QUERY
    const [searchText, updateSearchText] = useState("")
    //LIST OF ALL CATEGORIES DERIVED FROM DATABASE (in json format)
    const [categories, setCategories] = useState([])
    //LIST OF ALL CATEGORIES DERIVED FROM DATABASE (just the titles)
    const [categoryTitles, setcategoryTitles] = useState([])
    //WHICH CATEGORIES THE USER IS FILTERING BY
    const [chosenCategories, setChosenCategory] = useState([])
    //SEARCH RESULTS ARE AN ARRAY OF MONGODB DOCUMENTS IN JSON FORMAT
    const [searchresults, setSearchResults] = useState([])


    //GET ALL CATEGORIES ON PAGE LOAD
    useEffect(() =>{
        getCategories()
    }, [])
    const handleCategoryChoice = (index, event) => {
        //event is an array of all the categories chosen
        let tempChosen = []
        for(let i=0; i<event.length;i++)
        {
            tempChosen[i] = event[i].value
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
      event.preventDefault();
      if (event.key === 'Enter') {
      searchDatabase(searchText)
    }
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
            setcategoryTitles(tempCategoryTitle)
            console.log(categoryTitles)
        })
  }
    function searchDatabase(searchQuery)
    {
      let encodedSearch = encodeURIComponent(searchQuery)

      axios.get(serverAddress+"/api/search", {
        params: {
          searchQuery: encodedSearch,
        }
      })
          .then(function (response) {
            setSearchResults(response.data)
            console.log(searchresults)
          })
    }
    //TEST TO SHOW CATEGORIES
    function DispalyCategories()
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
    return (<ul id="searchResultList">
          {
            searchresults.map((result, index) =>
              <li key={index}>
                <a href={result.source} target="_blank" rel="noopener noreferrer">
                  {result.title}
                  {result.description}
                </a>
              </li>
            )
          }
        </ul>
    )
  }
  return (
    <>
    <h1>HOME</h1>

        <Select
            isMulti
            onChange={(event) => handleCategoryChoice(1, event)}
            options={categoryTitles}/>
    <p></p>
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
    {
        //FORDEBUGGING
        <DispalyCategories/>
    }

    </>
  )
}

export default Homepage

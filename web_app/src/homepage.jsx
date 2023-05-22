import {useEffect, useState} from 'react'
import './homepage.css'
import axios from 'axios'

function Homepage() {
    const serverAddress = "http://127.0.0.1:3000"
    //THE USER'S SEARCH QUERY
    const [searchText, updateSearchText] = useState("")
    //LIST OF ALL CATEGORIES DERIVED FROM DATABASE
    const [categories, setCategories] = useState([])
    //WHICH CATEGORIES THE USER IS FILTERING BY
    const [chosenCategories, setChosenCategory] = useState("")
    //SEARCH RESULTS ARE AN ARRAY OF MONGODB DOCUMENTS IN JSON FORMAT
    const [searchresults, setSearchResults] = useState([])


    //GET ALL CATEGORIES ON PAGE LOAD
    useEffect(() =>{
        getCategories()
    }, [])
    const handleCategory = (event) => {
        setChosenCategory(event.target.value);
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
            setCategories(response.data)
            console.log(categories)
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
            <ul id="searchResultList">
                {
                    categories.map((result, index) =>
                        <li key={index}>
                            {JSON.stringify(result)}
                        </li>
                    )
                }
            </ul>
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
    {<label>Category:
    <select
        name="category"
        value={chosenCategories || ""}
        onChange={handleCategory}
        placeholder="Source"
    >
        {categories.map((result) =>
            <option
                key={JSON.stringify(result.title).replace(/\"/g, "")}
                value={JSON.stringify(result.title).replace(/\"/g, "")}
            >
                {/*actually displayed text*/}
                {JSON.stringify(result.title).replace(/\"/g, "")}
            </option>

        )}

    </select>
    </label>}
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

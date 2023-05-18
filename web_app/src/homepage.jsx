import { useState } from 'react'
import './homepage.css'
import axios from 'axios'

function Homepage() {
  const serverAddress = "http://127.0.0.1:3000"
  const [searchText, updatesearchText] = useState("")
  //SEARCH RESULTS ARE AN ARRAY OF MONGODB DOCUMENTS IN JSON FORMAT
  const [searchresults, setSearchResults] = useState([])
    const handleSearchChange = (event) =>
    {
        updatesearchText(event.target.value);
    }
  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      searchDatabase(searchText)

      event.preventDefault();  // Prevent form submission if your input is inside a form
    }
  };
    function searchDatabase(searchQuery)
    {
      let encodedSearch = encodeURIComponent(searchQuery)

      axios.get(serverAddress+"/search", {
        params: {
          searchQuery: encodedSearch,
        }
      })
          .then(function (response) {
            setSearchResults(response.data)
            console.log(searchresults)
          })
    }
  function DispalySearchResults()
  {
    return (<ul id="searchResultList">
          {
            searchresults.map((result, index) =>
              <li key={index}>
                <a href={result.link} target="_blank" rel="noopener noreferrer"> {result.title}
                  {
                    result.description
                  }</a>


              </li>
            )
          }
        </ul>
    )
  }


  return (
    <>
      <h1>HOME</h1>
        <input
            type= "text"
            value = {searchText}
            onChange = {handleSearchChange}
            onKeyDown={handleKeyPress}
        />
      {searchresults.length != 0 &&
        <DispalySearchResults/>
      }


    </>
  )
}

export default Homepage

import { useState } from 'react'
import './homepage.css'
import axios from 'axios'

function Homepage() {
  const serverAddress = "http://127.0.0.1:3000"
  const [searchText, updatesearchText] = useState("")
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
      console.log("searching database...")
      let encodedSearch = encodeURIComponent(searchQuery)

      axios.get(serverAddress+"/search", {
        params: {
          searchQuery: encodedSearch,
        }
      })
          .then(function (response) {
            console.log(response);
          })
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

    </>
  )
}

export default Homepage

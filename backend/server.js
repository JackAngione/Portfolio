const express = require('express')
const cors = require('cors');
const { searchTutorials } = require("./mongoDBaccess.js")

const port = 3000
const app = express()
app.use(cors());

app.get('/search', async (req, res) => {
    console.log("request made")

    const searchQuery = req.query.searchQuery;
    console.log(searchQuery);
    if (searchQuery) {
       // res.send(`You searched for: ${searchQuery}`);
        let searchResults = await searchTutorials(searchQuery);
        res.send(searchResults)
    } else {
        res.send('No search query provided');
    }
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
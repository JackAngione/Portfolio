const express = require('express')
const cors = require('cors');
const db = require("./mongoDBaccess.js")

const port = 3000
const app = express()
app.use(cors());
app.use(express.json());

app.get('/api/search', async (req, res) => {
    console.log("request made")

    const searchQuery = req.query.searchQuery;
    console.log(searchQuery);
    if (searchQuery) {
       // res.send(`You searched for: ${searchQuery}`);
        let searchResults = await db.searchTutorials(searchQuery);
        res.send(searchResults)
    } else {
        res.send('No search query provided');
    }
})

app.post("/api/upload", async(req, res) => {
    let tutorialData = JSON.stringify(req.body)
    console.log("received upload: " + JSON.stringify(req.body))
    let uploadTutorial = await db.uploadTutorial(req.body)
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
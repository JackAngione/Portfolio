const express = require('express')
const cors = require('cors');
const db = require("./mongoDBaccess.js")

const port = 3000
const app = express()
app.use(cors());
app.use(express.json());

//get a list of all categories
app.get('/api/categories', async (req, res) => {
    console.log("category request made")
    let allCategories = await db.getAllCategories()
    res.send(allCategories)
})

//search for a tutorial
app.get('/api/search', async (req, res) => {

    const chosenCategories = req.query.categories
    const searchQuery = req.query.searchQuery;
    console.log("search request made, query: "+ searchQuery)

   // res.send(`You searched for: ${searchQuery}`);
    let searchResults = await db.searchTutorials(searchQuery, chosenCategories);
    res.send(searchResults)

})

//upload a tutorial
app.post("/api/upload", async(req, res) => {
    let tutorialData = JSON.stringify(req.body)
    console.log("received upload: " + JSON.stringify(req.body))
    let uploadTutorial = await db.uploadTutorial(req.body)
})

//create Category
app.post("/api/createCategory", async(req, res) => {
    let categoryData = req.body
    console.log("received upload: " + JSON.stringify(categoryData))
    let createdCategory = await db.createCategory(categoryData)

})
//edit a  Category
app.post("/api/editCategory", async(req, res) => {
    let categoryData = req.body
    await db.editCategory(categoryData)
})
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
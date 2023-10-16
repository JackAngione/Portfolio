const express = require('express')
const cors = require('cors');
const db = require("./mongoDBaccess.js")
const jwt = require('jsonwebtoken');
const expressJwt = require('express-jwt');
const { JWT_Key } = require("./mongoDBconnection")

const port = 3000
const app = express()
app.use(cors());
app.use(express.json());

//get a list of all categories
app.get('/categories', async (req, res) => {
    console.log("category request made")
    let allCategories = await db.getAllCategories()
    res.send(allCategories)
})

//search for a tutorial
app.get('/search', async (req, res) => {

    const chosenCategories = req.query.categories
    const searchQuery = req.query.searchQuery;
    console.log("search request made, query: "+ searchQuery)

   // res.send(`You searched for: ${searchQuery}`);
    let searchResults = await db.searchTutorials(searchQuery, chosenCategories);
    res.send(searchResults)

})

//upload a tutorial
app.post("/upload", async(req, res) => {
    let tutorialData = JSON.stringify(req.body)
    console.log("received upload: " + JSON.stringify(req.body))
    let uploadTutorial = await db.uploadTutorial(req.body)
})
//delete a tutorial
app.post("/deleteTutorial", async(req, res) => {
    let tutorialData = JSON.stringify(req.body)

    let deleteTutorial = await db.deleteTutorial(req.body)
})
//edit a  tutorial
app.post("/editTutorial", async(req, res) => {
    let newTutorial = req.body
    await db.editTutorial(newTutorial)
})
//create Category
app.post("/createCategory", async(req, res) => {
    let categoryData = req.body
    console.log("received upload: " + JSON.stringify(categoryData))
    let createdCategory = await db.createCategory(categoryData)

})
//delete Category
app.post("/deleteCategory", async(req, res) => {
    let categoryData = req.body
    console.log("received category TO Delete: " + JSON.stringify(categoryData))
    let deleteCategory = await db.deleteCategory(categoryData)

})

//edit a  Category
app.post("/editCategory", async(req, res) => {
    let categoryData = req.body
    await db.editCategory(categoryData)
})
app.post("/login", async(req, res) => {
    let credentials = req.body
    console.log("hit login")
    const loginStatus = await db.login(credentials)
    if(loginStatus === 200)
    {
        const token = jwt.sign({ username: credentials.username }, JWT_Key, { expiresIn: '24h' });
        res.status(200).send
        res.send(token)
    }
    else
    {
        console.log("login failed")
    }
})
app.listen(port, 'localhost', () => {
    console.log(`Portfolio Server listening on port ${port}`)
})
const express = require('express')
const cors = require('cors');
const db = require("./mongoDBaccess.js")
const jwt = require('jsonwebtoken');
const expressJwt = require('express-jwt');
const { JWT_Key } = require("./secret_keys")

const port = 3000
const app = express()
app.use(cors({
    credentials: true
}));
app.use(express.json());


async function verifyToken(req) {
    //console.log("verifying jwt")
    // If expressJwt middleware does not throw an error, the token is valid
    const authHeader = req.headers['authorization'];
    const token = authHeader.split(' ')[1]; // Bearer <token>
    return await db.verify_token(token);
}

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
    if(await verifyToken(req))
    {
        let uploadTutorial = await db.uploadTutorial(req.body)
    }
    else
    {
        //send unauthorized if user not admin
        res.sendStatus(401)
    }


})
//delete a tutorial
app.post("/deleteTutorial", async(req, res) => {
    let tutorialData = JSON.stringify(req.body)
    if(await verifyToken(req))
    {
        await db.deleteTutorial(req.body);
    }
    else
    {
        //send unauthorized if user not admin
        res.sendStatus(401)
    }
})
//edit a  tutorial
app.post("/editTutorial", async(req, res) => {
    let newTutorial = req.body
    if(await verifyToken(req))
    {
        await db.editTutorial(newTutorial)
    }
    else
    {
        res.status(401).send()
    }
})
//create Category
app.post("/createCategory", async(req, res) => {
    let categoryData = req.body
    console.log("received upload: " + JSON.stringify(categoryData))
    if(await verifyToken(req))
    {
        let createdCategory = await db.createCategory(categoryData)
    }
    else
    {
        res.status(401).send()
    }

})
//delete Category
app.post("/deleteCategory", async(req, res) => {
    let categoryData = req.body
    console.log("received category TO Delete: " + JSON.stringify(categoryData))
    if(await verifyToken(req))
    {
        let deleteCategory = await db.deleteCategory(categoryData)
    }
    else
    {
        res.status(401).send()
    }

})

//edit a  Category
app.post("/editCategory", async(req, res) => {
    let categoryData = req.body
    if(await verifyToken(req))
    {
        await db.editCategory(categoryData)
    }
    else
    {
        res.status(401).send()
    }
})
app.post("/login", async(req, res) => {
    let credentials = req.body
    console.log("hit login")
    const loginStatus = await db.login(credentials)
    if(loginStatus === 200)
    {
        const token = jwt.sign({ username: credentials.username }, JWT_Key, { expiresIn: '24h' });
        res.status(200).send
        res.send({token})
    }
    else
    {
        console.log("login failed")
    }
})
app.post('/logout', async (req, res) => {
    console.log("logout request made")
    const tokenValid = await verifyToken(req)
    if(tokenValid)
    {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
        //returns 201 if successful, 500 if there was a server/database error blacklisting the token
        return await db.logout(token)
    }
    else
    {
        //token was not valid, so logout anyway
        res.status(401).send()
    }
})
app.listen(port, () => {
    console.log(`Portfolio Server listening on port ${port}`)
})
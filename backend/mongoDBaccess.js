const {connectionString} = require("./secret_keys")
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const client = new MongoClient(connectionString)
const {JWT_Key} = require("./secret_keys")
const crypto = require("crypto");
const moment = require('moment');
const meiliSearch = require("./searchServer")
//GENERATE resourceID for a new resource
async function generateResourceID() {
    const userCollection = client.db("KNOWLEDGE").collection("tutorials")
    let resource_id = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const charactersLength = characters.length;
    let repeatCheck = 1
    while(repeatCheck > 0)
    {
        resource_id = ""
        for (let i = 0; i < 7; i++) {
            resource_id += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        repeatCheck = await userCollection.countDocuments({resource_id: resource_id})
        console.log("repeat check" + repeatCheck)
    }
    return resource_id
}


//INSERT CATEGORY INTO DATABASE
async function createCategory(newCategory)
{
    const collection = client.db("KNOWLEDGE").collection("categories")
    await collection.insertOne(newCategory)
}
//edit category
async function editCategory(category)
{
    const categoryCollection = client.db("KNOWLEDGE").collection("categories")
    const updateJSON = { title: category.title, subCategories: category.subCategories}
    await categoryCollection.replaceOne({title: category.oldTitle}, updateJSON);
    // Update documents where category is edited
    const tutorialCollection = client.db("KNOWLEDGE").collection("tutorials")
    //update subcategories
    await tutorialCollection.updateMany(
        { category: category.title }, {$pull: {subCategories: {$nin: category.subCategories}}}
    )
    //change existing category names of tutorials
    await tutorialCollection.updateMany({category: category.oldTitle}, {$set: {category: category.title}})
}
//DELETE CATEGORY FROM DATABASE
async function deleteCategory(category)
{
    const collection = client.db("KNOWLEDGE").collection("categories")
    await collection.deleteOne({title: category.title})
    // Update documents where category is deleted
    const tutorialCollection = client.db("KNOWLEDGE").collection("tutorials")
    await tutorialCollection.updateMany({ category: category.title }, { $set: { category: "" }}, function(err, result) {
        if(err) throw err;
    })
}
//SEARCHES THE DATABASE BASED ON A USER'S QUERY
async function searchTutorials(searchQuery, categories) {
    const collection = client.db("KNOWLEDGE").collection("tutorials")
    const regex = new RegExp(decodeURIComponent(searchQuery), 'i')
    let findString
    //EMPTY SEARCH, JUST RETURN ALL MATCHING DOCUMENTS IN CATEGORIES
    //a search with no query or categories is blocked on the client side
    if(searchQuery === "")
    {
        console.log("NOSEARCH!!!")
        findString = {category: {$in: categories}}
    }
    else
    {
        //IF USER DIDNT FILTER BY CATEGORIES
        if(categories === undefined)
        {

            findString = {$or: [{title: regex}, {description: regex}, {keywords: regex}, {source: regex}]}
        }
        //SEARCH FILTERING BY CATEGORY
        else
        {
            console.log("Category: " + categories[0])
            findString = { $and: [{category: {$in: categories}}, {$or: [{title: regex}, {description: regex}, {keywords: regex}, {source: regex}]}]}
        }
    }
    const documents = await collection.find(findString).toArray()

    //PRINT RESULTING DOCUMENTS
    console.log(JSON.stringify(documents))
    return JSON.stringify(documents)
}
//retries a list of all categories from the database
async function getAllCategories()
{
    const collection = client.db("KNOWLEDGE").collection("categories")
    const categories = collection.find({}).toArray()
    console.log(categories)
    return categories
}
//uploads a tutorial to the database
async function uploadTutorial(tutorialInfo)
{
    const collection = client.db("KNOWLEDGE").collection("tutorials")

    const resource_id = await generateResourceID()
    tutorialInfo.resource_id = resource_id
    try{
        //ADD RESOURCE TO MONGODB
        await collection.insertOne(tutorialInfo)

        //ADD TO MEILISEARCH
        await meiliSearch.addResource(tutorialInfo)
    }
    catch (e) {
        //TODO REMOVE BOTH FROM THE DATABASES IF ONE FAILS
    }

    console.log("INSERTED!")
}
//edit a tutorial
async function editTutorial(newTutorial)
{
    console.log("TUTORIAL EDIT INFORMATION: " + newTutorial)
    const collection = client.db("KNOWLEDGE").collection("tutorials")
    const updateJSON = {
        title: newTutorial.title,
        description: newTutorial.description,
        source: newTutorial.source,
        category: newTutorial.category,
        subCategories: newTutorial.subCategories,
        keywords: newTutorial.keywords
    }
    await collection.replaceOne({title: newTutorial.oldTitle, source: newTutorial.oldSource}, updateJSON);
}
async function deleteTutorial(tutorialInfo)
{
    const collection = client.db("KNOWLEDGE").collection("tutorials")
    try{
        await collection.deleteOne({title: tutorialInfo.title, source: tutorialInfo.source})
        await meiliSearch.deleteResource(tutorialInfo.resource_id)
    }
    catch (e) {

    }

    console.log("deleted!")
}

async function login(loginInfo)
{
    const collection = client.db("KNOWLEDGE").collection("users")
    const hashed_password = sha256Hash(loginInfo.password)
    console.log(loginInfo.username)
    console.log(loginInfo.password)
    const user = await collection.findOne({username: loginInfo.username, password: hashed_password})
    if(user)
    { return 200 }
    else
    { return 401 }
}

function sha256Hash(input) {
    const hash = crypto.createHash('sha256');
    hash.update(input);
    return hash.digest('hex');
}
//checks if token is valid and not blacklisted
async function verify_token(token)
{
    //verifies the token against the secret key
    try {
        //console.log("JWT TOKEN IS: " + token)
        const verified = jwt.verify(token, JWT_Key)
        /*
        const currentTime = Math.floor(Date.now() / 1000); // Get current time in seconds

        //Calculate time left in seconds
        const timeLeft = verified.exp - currentTime;
        if (timeLeft > 0) {
            console.log("Token will expire in: ", timeLeft, " seconds.");
            console.log("Token will expire in: ", Math.floor(timeLeft / 60), " minutes.");
            console.log("Token will expire in: ", Math.floor(timeLeft / 60 / 60), " hours.");
        } else {
            console.log("Token has expired.");
        }

        */
        //console.log('JWT will expire at: ', new Date(verified.exp * 1000));

        //check if token is blacklisted
        const blt_collection = client.db("KNOWLEDGE").collection("BLACKLISTED_TOKENS")
        const blacklisted_token = await blt_collection.findOne({
            "token": token
        })
        //console.log("token is valid!")
        return !blacklisted_token && verified;
    }
    catch (e) {
        //console.log("token is not valid")
        return false
    }
}
async function logout(token)
{
    let decoded_token = jwt.decode(token)
    let expirationDate = moment.unix(decoded_token.exp).utc()
    // You can format the date however you like
    expirationDate = expirationDate.format('YYYY-MM-DD, HH:mm:ss');

    try {
        //BLACKLISTED TOKENS COLLECTION
        const blt_collection = client.db("mediaPlatform").collection("blacklisted_tokens")
        //blacklists the token by inserting it into the blacklisted database
        await blt_collection.insertOne({
            "token": token,
            "expiration": expirationDate
        })
        return 200
    } catch (e) {
        //there was a server/database error logging out
        return 500
    }
}
module.exports = {logout, verify_token, searchTutorials, uploadTutorial, deleteTutorial, editTutorial, getAllCategories, createCategory, editCategory, deleteCategory, login}
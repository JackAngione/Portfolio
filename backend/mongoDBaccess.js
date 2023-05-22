const {connectionString} = require("./mongoDBconnection")
const { MongoClient } = require('mongodb');



const client = new MongoClient(connectionString)


async function searchTutorials(searchQuery) {
    const collection = client.db("KNOWLEDGE").collection("tutorials")
    const regex = new RegExp(decodeURIComponent(searchQuery), 'i')
    const findString = { $or: [{title: regex}, {description: regex}, {keywords: regex}, {source: regex}]}
    const documents = await collection.find(findString).toArray()
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
    await collection.insertOne(tutorialInfo)
    console.log("INSERTED!")
}

module.exports = {searchTutorials, uploadTutorial, getAllCategories}
const {connectionString} = require("./mongoDBconnection")
const { MongoClient } = require('mongodb');



const client = new MongoClient(connectionString)


async function searchTutorials(searchQuery) {
    const collection = client.db("KNOWLEDGE").collection("tutorials")
    const regex = new RegExp(searchQuery, 'i')
    const findString = { $or: [{title: regex}, {description: regex}]}
    const documents = await collection.find(findString).toArray()
    console.log(JSON.stringify(documents))
    return JSON.stringify(documents)
}
module.exports = {searchTutorials}
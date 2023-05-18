
const { MongoClient } = require('mongodb');

const connectionString = "mongodb+srv://jackangione:Yf9LelaoJGtdYRLq@cluster0.a3bqwjr.mongodb.net/"

const client = new MongoClient(connectionString)


async function searchTutorials(searchQuery) {
    const collection = client.db("KNOWLEDGE").collection("tutorials")
    const regex = new RegExp(searchQuery, 'i')
    const findString = { $or: [{title: regex}, {description: regex}]}
    const documents = await collection.find(findString).toArray()
    console.log(JSON.stringify(documents))
    return ""
}
module.exports = {searchTutorials}
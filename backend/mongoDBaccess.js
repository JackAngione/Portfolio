const {connectionString} = require("./mongoDBconnection")
const { MongoClient } = require('mongodb');

const client = new MongoClient(connectionString)

//INSERT CATEGORY INTO DATABASE
async function createCategory(newCategory)
{
    const collection = client.db("KNOWLEDGE").collection("categories")
    await collection.insertOne(newCategory)
}
async function editCategory(category)
{
    const collection = client.db("KNOWLEDGE").collection("categories")
    const updateJSON = { title: category.title, subCategories: category.subCategories}
    await collection.replaceOne({title: category.oldTitle}, updateJSON);

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
    await collection.insertOne(tutorialInfo)
    console.log("INSERTED!")
}

module.exports = {searchTutorials, uploadTutorial, getAllCategories, createCategory, editCategory}
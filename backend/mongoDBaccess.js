const {connectionString} = require("./mongoDBconnection")
const { MongoClient } = require('mongodb');

const client = new MongoClient(connectionString)

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
    await tutorialCollection.updateMany(
        { category: category.title }, {$pull: {subCategories: {$nin: category.subCategories}}}
    )
    //UPDATE SUBCATEGORIES to new
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
    await collection.insertOne(tutorialInfo)
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
    await collection.deleteOne({title: tutorialInfo.title, source: tutorialInfo.source})
    console.log("deleted!")
}
module.exports = {searchTutorials, uploadTutorial, deleteTutorial, editTutorial, getAllCategories, createCategory, editCategory, deleteCategory}
const { MeiliSearch } = require('meilisearch')

const resources = require("./resources.json")
const newdata = require("./data.json")
const {meiliSearch_Master_Key} = require("./secret_keys.js")
const searchClient = new MeiliSearch({
    host: 'https://jackangione.com/search',
    apiKey: meiliSearch_Master_Key
})
async function addResource(resourceJSON) {
    await searchClient.index('resources').addDocuments(resourceJSON)
}
async function deleteResource(resource_id)
{
    await searchClient.index('resources').deleteDocument(resource_id)
}
async function updateResource(resource)
{
    await searchClient.index('resources').updateDocuments(resource)
}



/*
searchClient.index('resources').addDocuments(resources)
    .then((res) => console.log(res))

searchClient.index('resources').updateFilterableAttributes(['category','subCategories'])

searchClient.createIndex('resources', {primaryKey: 'resource_id'})
    .then((res) => console.log(res))

searchClient.getKeys()
    .then((res) => console.log(res))

searchClient.index('resources').deleteAllDocuments()
    .then((res) => console.log(res))

searchClient.index('resources').addDocuments(resources)
    .then((res) => console.log(res))

searchClient.deleteIndex("resources")
    .then((res) => console.log(res))

searchClient.createKey({
    description: "Search Key",
    actions:["search"],
    indexes: ["resources"],
    expiresAt: null
})
*/
module.exports = {addResource, deleteResource, updateResource}
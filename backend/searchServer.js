const { MeiliSearch } = require('meilisearch')

const resources = require("./resources.json")
const newdata = require("./data.json")
const {meiliSearch_Master_Key} = require("./secret_keys.js")
const searchClient = new MeiliSearch({
    host: 'http://192.168.1.159:7700',
    apiKey: meiliSearch_Master_Key
})
async function addResource(resourceJSON)
{
    searchClient.index('resources').addDocuments(resourceJSON)
        .then((res) => console.log(res))
}
async function deleteResource(resource_id)
{
    searchClient.index('resources').deleteDocument(resource_id)
        .then((res) => console.log(res))
}
async function updateResource(resource)
{
    searchClient.index('resources').updateDocuments(resource)
        .then((res) => console.log(res))
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
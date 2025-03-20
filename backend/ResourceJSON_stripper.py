#Script to remove the "_id" from json file exported from the mongoDB collection
#this allows a collection to be directly exported from mongoDB, then imported to MeiliSearch

import json

# Open and read the JSON file
with open('resources.json', 'r') as file:
    data = json.load(file)
    print(f"Total items: {len(data)}")
    for index, resource in enumerate(data):
        print(resource.get("_id"))
        resource.pop("_id")

modified_json_str = json.dumps(data, indent=4)
# Open a file in write mode and save the data as JSON
with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=4)  # indent=4 makes the file easier to read

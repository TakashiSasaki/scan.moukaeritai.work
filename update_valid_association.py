import json

files_to_update = [
    "contracts/fixtures/valid/submit-fact-command-request-association.json",
    "contracts/fixtures/valid/association-attach.json"
]

for file in files_to_update:
    try:
        with open(file, "r") as f:
            data = json.load(f)
        
        target = data["data"] if "data" in data else data
        target["operation"] = "attach"
        target["participants"] = [
            { "role": "object", "ref": { "entityType": "object", "id": "0190a2a4-f7a1-77ef-9021-d52eac3c7457" } },
            { "role": "marker", "ref": { "entityType": "marker", "id": "0190a2a4-f7a2-77ef-9021-d52eac3c7457" } }
        ]
        if "subjectAssociationId" in target:
            del target["subjectAssociationId"]
        
        with open(file, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print("error updating", file, e)


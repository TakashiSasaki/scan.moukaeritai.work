import json

with open("contracts/registry.json", "r") as f:
    data = json.load(f)

data["contracts"].append({
    "contractId": "callable-functions-api",
    "version": "1.1.3",
    "status": "active",
    "title": "Callable Functions API",
    "description": "API contract for the EFP-native backend fact creation pipeline with union type request bodies and strict valid fixtures",
    "contractType": "api-contract",
    "path": "packages/callable-functions-api/1.1.3/contract.json"
})

with open("contracts/registry.json", "w") as f:
    json.dump(data, f, indent=2)


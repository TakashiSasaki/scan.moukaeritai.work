import json

with open("contracts/packages/callable-functions-api/1.1.3/submit-fact-command-response.schema.json", "r") as f:
    data = json.load(f)

data["properties"]["projectionStatus"]["description"] = "Always 'pending' in current runtime. 'complete' is a reserved future state."

with open("contracts/packages/callable-functions-api/1.1.3/submit-fact-command-response.schema.json", "w") as f:
    json.dump(data, f, indent=2)


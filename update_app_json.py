import json

with open("contracts/profiles/current-application.json", "r") as f:
    data = json.load(f)

# Wait, previously we bumped it to 2.0.9 in sed, let's verify
if "activeContracts" in data:
    for c in data["activeContracts"]:
        if c["contractId"] == "callable-functions-api":
            c["version"] = "1.1.3"

with open("contracts/profiles/current-application.json", "w") as f:
    json.dump(data, f, indent=2)


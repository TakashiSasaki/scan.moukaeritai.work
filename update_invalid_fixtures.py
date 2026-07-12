import json
import uuid

# association invalid: attach but no marker participant
with open("contracts/fixtures/valid/submit-fact-command-request-association.json", "r") as f:
    assoc = json.load(f)

# we just copy valid but remove marker participant
assoc["data"]["participants"] = [p for p in assoc["data"]["participants"] if p["ref"]["entityType"] != "marker"]

with open("contracts/fixtures/invalid/submit-fact-command-request-association.json", "w") as f:
    json.dump(assoc, f, indent=2)

# observation invalid: observedAt invalid
with open("contracts/fixtures/valid/submit-fact-command-request-observation.json", "r") as f:
    obs = json.load(f)

obs["data"]["time"]["observedAt"] = "invalid-date"

with open("contracts/fixtures/invalid/submit-fact-command-request-observation.json", "w") as f:
    json.dump(obs, f, indent=2)

# measurement invalid: latitude out of range
with open("contracts/fixtures/valid/submit-fact-command-request-measurement.json", "r") as f:
    meas = json.load(f)

if "position" not in meas["data"]:
    meas["data"]["position"] = {"latitude": 200, "longitude": 0}
else:
    meas["data"]["position"]["latitude"] = 200

with open("contracts/fixtures/invalid/submit-fact-command-request-measurement.json", "w") as f:
    json.dump(meas, f, indent=2)

# event invalid: eventType missing
with open("contracts/fixtures/valid/submit-fact-command-request-event.json", "r") as f:
    evt = json.load(f)

if "eventType" in evt["data"]:
    del evt["data"]["eventType"]

with open("contracts/fixtures/invalid/submit-fact-command-request-event.json", "w") as f:
    json.dump(evt, f, indent=2)

# response invalid: invalid projectionStatus
with open("contracts/fixtures/valid/submit-fact-command-response.json", "r") as f:
    res = json.load(f)

res["projectionStatus"] = "invalid_status"

with open("contracts/fixtures/invalid/submit-fact-command-response.json", "w") as f:
    json.dump(res, f, indent=2)


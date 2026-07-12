import json
import re

with open("scripts/validate-contracts.mjs", "r") as f:
    content = f.read()

# Replace hardcoded 1.1.1 with active version for callable-functions-api
# Actually, the active version should be read from current-application.json
content = content.replace(
    "const fixtureManifest = [",
    "const activeContracts = profile.activeContracts || profile.contracts || {};\nconst apiVersion = activeContracts.find(c => c.contractId === 'callable-functions-api')?.version || activeContracts['callable-functions-api'];\nconst fixtureManifest = ["
)
content = content.replace(
    "'packages/callable-functions-api/1.1.1/submit-fact-command-request.schema.json'",
    "`packages/callable-functions-api/${apiVersion}/submit-fact-command-request.schema.json`"
)
content = content.replace(
    "'packages/callable-functions-api/1.1.1/submit-fact-command-response.schema.json'",
    "`packages/callable-functions-api/${apiVersion}/submit-fact-command-response.schema.json`"
)

with open("scripts/validate-contracts.mjs", "w") as f:
    f.write(content)


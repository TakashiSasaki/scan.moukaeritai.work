import re

with open("scripts/prepare-functions-artifact.mjs", "r") as f:
    content = f.read()

content = content.replace(
    "const activeVersion = profile.contracts['callable-functions-api'];",
    "const activeContracts = profile.activeContracts || profile.contracts || {};\nconst activeVersion = activeContracts.find ? activeContracts.find(c => c.contractId === 'callable-functions-api')?.version : activeContracts['callable-functions-api'];"
)

content = content.replace(
    "fs.writeFileSync(activeVersionPath, JSON.stringify({ activeVersion }, null, 2));",
    "fs.writeFileSync(activeVersionPath, JSON.stringify({ version: activeVersion }, null, 2));"
)

with open("scripts/prepare-functions-artifact.mjs", "w") as f:
    f.write(content)


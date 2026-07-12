import re

with open("scripts/validate-contracts.mjs", "r") as f:
    content = f.read()

# Add import if not present
if "validateAssociationSemantics" not in content:
    content = "import { validateAssociationSemantics } from '../packages/efp-model/dist/esm/validators/association-validator.js';\n" + content

content = content.replace(
    "semanticCheck: (data) => data.operation === 'attach' && data.participants.filter(p => p.ref.entityType === 'object').length === 1 && data.participants.filter(p => p.ref.entityType === 'marker').length === 1",
    "semanticCheck: validateAssociationSemantics"
)
content = content.replace(
    "semanticCheck: (data) => data.operation === 'detach'",
    "semanticCheck: validateAssociationSemantics"
)
content = content.replace(
    "semanticCheck: (data) => data.operation === 'replace'",
    "semanticCheck: validateAssociationSemantics"
)

with open("scripts/validate-contracts.mjs", "w") as f:
    f.write(content)


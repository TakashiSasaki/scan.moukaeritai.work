import re

with open("AGENTS.md", "r") as f:
    content = f.read()

# Remove firebase-blueprint.json reference
content = re.sub(r"- \*\*Blueprints\*\*: `firebase-blueprint.json` acts as the source of truth for the database schema\. Update this when adding fields/collections\.\n", "", content)

# Remove "Object/Marker workflow is currently incomplete"
content = content.replace(" (Legacy, Object/Marker workflow is currently incomplete)", "")
content = content.replace(" The Object/Marker workflow is incomplete.", "")

with open("AGENTS.md", "w") as f:
    f.write(content)

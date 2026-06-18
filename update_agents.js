const fs = require('fs');

const file = 'AGENTS.md';
let content = fs.readFileSync(file, 'utf8');

const targetLine = '- Route catalog must stay synchronized with developer routes in `src/lib/routeCatalog.ts`.';
const newLine = targetLine + '\n- When making architectural, routing, database, or UI/UX changes, the public developer documentation pages (`src/components/developerDocs/`) and route catalog (`src/lib/routeCatalog.ts`) MUST be reviewed and updated to reflect those changes.';

content = content.replace(targetLine, newLine);
fs.writeFileSync(file, content);

#!/bin/bash
sed -i 's/^  createdAt: Timestamp;/  \/\*\* TODO(Migration): Domain time conceptually belongs to Fact or Projection records, not Entity directly. \*\/\n  createdAt: Timestamp;/g' src/types.ts
sed -i 's/^  updatedAt: Timestamp;/  \/\*\* TODO(Migration): Domain time conceptually belongs to Fact or Projection records, not Entity directly. \*\/\n  updatedAt: Timestamp;/g' src/types.ts

# Remove duplicated comments if they exist
sed -i '/^\s*\/\*\* TODO(Migration): Domain time conceptually belongs to Fact or Projection records, not Entity directly. \*\//N;/\n\s*\/\*\* TODO(Migration): Domain time conceptually belongs to Fact or Projection records, not Entity directly. \*\//s/.*\n//' src/types.ts
sed -i '/^\s*\/\*\* TODO(Migration): Domain time conceptually belongs to Fact or Projection records, not Entity directly. \*\//N;/\n\s*\/\*\* TODO(Migration): Domain time conceptually belongs to Fact or Projection records, not Entity directly. \*\//s/.*\n//' src/types.ts

# scan.mw Contract Registry

This directory contains the machine-readable specifications, schemas, invariants, policies, and vocabulary definitions for **scan.mw v2**.

## Directory Structure

```
contracts/
├── README.md                      # This file
├── registry.json                  # Main contract index
├── governance/                    # Policy documentation
│   ├── versioning-policy.md
│   ├── compatibility-policy.md
│   ├── deprecation-policy.md
│   └── change-classification.md
├── packages/                      # Managed contract packages
│   ├── core-vocabulary/
│   │   └── 1.0.0/
│   ├── efp-model/
│   │   └── 2.0.0/
│   ├── efp-semantics/
│   │   └── 1.0.0/
│   ├── export-format/
│   │   └── 1.0.0/
│   └── import-protocol/
│       └── 1.0.0/
├── profiles/                      # Application profiles (current active contract versions)
│   └── current-application.json
└── tooling/                       # Scripts and validation tools
```

## Tooling

Verify the integrity of all contracts, schemas, and configurations by running:
```bash
npm run contracts:validate
```

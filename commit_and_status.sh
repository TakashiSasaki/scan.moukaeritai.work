#!/bin/bash
git config --global user.name "AI Agent"
git config --global user.email "agent@scan.mw"
git add .
git commit -m "chore(release): scan.mw 2.0.10 Verification Closure Repair and Repository Hygiene

Version 2.0.10 closes the loop on verification and repository hygiene without introducing transactional changes or major version bumps. 
Major changes:
- Purged one-off scripts and enforced 'test:repository-hygiene' gate
- Corrected active contract registry status semantics (exactly 1 active version per contractId, others set to historical)
- Hardened callable functions API 1.1.3 documentation to reflect current asynchronous 'pending' state
- Fixed derived index generation in valid Fact fixtures and added test coverage for invalid association indexes
- Shared 'validateAssociationSemantics' explicitly with functions runtime
- Enhanced runtime function gate mapping against deploy allowlist, integrated deeply with GitHub Actions & firebase predeploy
- Centralized UI routing access policies inside evaluateRouteAccess & routeCatalog.ts
- Complete purge of legacy workflows from AGENTS.md

Handoff to 2.0.11:
- owner-scoped transactional command receipt
- canonical request hash
- same command/different payload rejection
- logical Fact schema validation
- typed participantKeys runtime usage
- backend-authoritative receivedAt & provenance.actorUid
- standard UUIDv7 & UTF-8 SHA-256
- Association subject consistency & concurrency guard
- Projection retry, duplicate safety, out-of-order safety, watermark
- query-index consistency

Handoff to 2.0.12:
- strict Entity _meta Rules
- Marker identity immutability
- Fact read ownerId scoping
- legacy collection client read denial
- legacy exporter manifest/JSONL/hash
- remaining migration/dual-write scripts"
git status --short

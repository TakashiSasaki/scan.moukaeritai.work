# Application Interface Surface Convention

## Purpose

This document defines a shared taxonomy, vocabulary, naming convention, and optional namespace structure for interfaces associated with this application.

The convention distinguishes six interface surfaces:

| Surface | Primary purpose | Preferred web path | Preferred CLI namespace |
|---|---|---|---|
| `public` | Public introduction and entry | `/` | top level |
| `app` | Normal application use | `/app` | `app` |
| `admin` | Administration and operations | `/admin` | `admin` |
| `dev` | Internal application development | `/dev` | `dev` |
| `api` | External development and interface contracts | `/api` | `api` |
| `test` | Development verification and test harnesses | `/test` | `test` |

These names serve as a conceptual taxonomy, shared architectural vocabulary, preferred naming convention, preferred web path convention, optional CLI subcommand convention, and possible organizing principle for documentation, modules, permissions, and tests.

This is a preferred convention, not an absolute routing or command-line constraint.

## Surface definitions

### `public`: public and onboarding surface

The `public` surface introduces the application and provides public entry points, including landing pages, product explanations, sign-in and sign-up entry points, public help, policies, and initial navigation into the authenticated application.

The preferred web root is `/`. A CLI normally represents this surface through the top-level command, `--help`, `version`, initialization, and discovery-oriented commands rather than a literal `public` subcommand.

### `app`: normal application-use surface

The `app` surface contains functionality used to perform the application's primary user-facing work, including dashboards, object creation and editing, searches, lists, detail views, workflows, and user-facing settings.

The preferred web namespace is `/app`. Actual routes may also use domain-specific paths when that improves usability. A CLI may use an `app` namespace, although frequently used commands may remain at the CLI top level.

### `admin`: administration and operations surface

The `admin` surface supports privileged administration, operation, auditing, repair, and controlled maintenance. Typical responsibilities include user and role administration, system configuration, audit inspection, controlled imports and exports, repair operations, and restricted legacy-data browsing.

The preferred namespace is `/admin` on the web and `admin` in a CLI. The namespace itself is not a security boundary; every administrative operation must enforce authorization independently on the server side.

### `dev`: internal development surface

The `dev` surface is for people developing and maintaining this application itself. It includes architecture and implementation documentation, configuration inspection, internal diagnostics, developer-only utilities, code-generation tools, and implementation-specific troubleshooting.

The preferred namespace is `/dev` on the web and `dev` in a CLI. This surface is distinct from `api`: `dev` explains or operates how this application is built, whereas `api` explains how another application integrates with it.

### `api`: external development and contract surface

The `api` surface is for developers of other applications that consume this application's interfaces. It includes API documentation, authentication requirements, request and response schemas, OpenAPI or equivalent descriptions, event and webhook contracts, error definitions, compatibility policies, and developer playgrounds intended for external integration.

The preferred web namespace is `/api`. Actual machine-facing API endpoints must use a versioned subpath, normally by major version:

```text
/api/v1/...
/api/v2/...
```

Backward-compatible changes remain within the same major version. Breaking contract changes require a new major-version namespace unless an explicitly documented compatibility mechanism applies.

The `/api` root and documentation subpaths may return HTML, while `/api/v1/...` and later machine-facing endpoints normally return structured representations such as JSON. Routing, authentication, content types, and caching rules must distinguish these responsibilities explicitly.

### `test`: development verification and test-harness surface

The `test` surface supports controlled execution, observation, and verification of application behavior during development. Its central concept is the test harness rather than a generic collection of temporary test pages.

Typical responsibilities include vertical-slice exercise pages, scenario runners, fixture selection, mock dependency selection, fault injection, clock and identity control, event replay, state and trace inspection, and comparison with expected results.

The preferred namespace is `/test` on the web and `test` in a CLI.

A vertical slice is the implemented path through UI, API, domain logic, persistence, and read models. A test harness is the controlled mechanism used to execute and observe that slice. A test-harness page is the human-facing interface to that mechanism.

## Preferred namespaces

The preferred web structure is:

```text
/        public surface
/app     application-use surface
/admin   administration surface
/dev     internal-development surface
/api     external-development and contract surface
/test    development-verification and test-harness surface
```

The corresponding optional CLI structure is:

```text
tool
tool app
tool admin
tool dev
tool api
tool test
```

The correspondence is semantic rather than mechanically mandatory. Frequent application commands may remain at the CLI top level, a domain-specific web route may remain outside `/app`, and one implementation module may support more than one surface.

## Security and environment policy

Path names and subcommand names communicate purpose but do not provide security. Each operation must enforce the appropriate authentication and authorization policy independently.

| Surface | Typical access |
|---|---|
| `public` | anonymous or public |
| `app` | authenticated user |
| `admin` | explicitly authorized administrator or operator |
| `dev` | internal developer or restricted operator |
| `api` | public or authenticated integration client, according to contract |
| `test` | developer or tester, normally restricted to non-production environments |

The `dev` and `test` surfaces require special care. Arbitrary data insertion, identity impersonation, clock manipulation, fault injection, fixture loading, unrestricted internal-state display, cache clearing, and arbitrary job execution should normally be absent from production builds or disabled by server-side environment policy.

Where feasible, dangerous development and test routes should be excluded from production route registration rather than merely hidden in navigation.

## Adoption and migration policy

This convention is adopted as a direction for future development, not as a requirement for an immediate repository-wide rename.

1. Prefer the convention for new interfaces.
2. Align existing interfaces when they are already being materially modified.
3. Do not perform broad route or command renames solely for cosmetic conformance.
4. Before changing an existing URL or command, assess compatibility, bookmarks, external references, redirects, automation, authorization, and documentation.
5. Preserve existing routes through redirects or compatibility aliases when justified.
6. Record intentional exceptions when they materially affect architecture or external behavior.

## Repository application

For this repository:

- this document is the canonical statement of the interface-surface convention;
- `src/lib/routeCatalog.ts` remains the canonical statement of currently implemented routes and route access policy;
- this document describes preferred architecture, while the route catalog describes current implementation state;
- future development should move toward this convention incrementally, without treating conformance alone as sufficient reason for unrelated refactoring.

## Current adoption

- `/`, `/app`, `/admin`, and `/test` are currently adopted surface roots.
- `/dev` is the canonical namespace for internal-development interfaces.
- `/developer`, `/demo`, and `/library-demo` remain active as compatibility aliases redirecting to `/dev`.
- Domain-specific application routes such as `/settings` and `/object/*` belong to the `app` surface but maintain their distinct URLs.
- The `api` surface remains unimplemented until an actual external integration interface is designed.

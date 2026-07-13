# functions-artifact-verification

## Purpose
Compiles, prepares, installs dependencies, and runs rigorous integrity verification on the Firebase Cloud Functions deployment artifact.

## When to use
Whenever making changes to Cloud Functions, `@scan/efp-model` packages, or related schemas.

## Inputs
- `functions/package.json`
- `packages/efp-model/`
- Functions source code inside `functions/src/`

## Procedure
1. Build the local `@scan/efp-model` workspace package using `npm --prefix packages/efp-model run build`.
2. Prepare the local vendor artifact folder inside functions using `npm run prepare:functions-artifact`.
3. Install dependencies inside the functions directory using `npm ci --prefix functions`.
4. Verify Functions package resolution using `npm run test:functions-artifact`.
5. Verify functions-boundary and import isolation using `npm run test:functions-boundary`.
6. Run the functions runtime gate validation using `npm run test:functions-runtime-gate`.
7. Execute Functions unit tests using `npm run test:functions`.
8. Compile and build the Functions code using `npm --prefix functions run build`.
9. Verify the deploy allowlist file `functions/deploy-functions.allowlist.json` aligns with active callable functions.

## Stop conditions
- NPM installation or typescript compilation fails.
- Schema verification inside functions fails.
- Forbidden import leakage is detected by the boundary checks.
- Build artifact doesn't match the deploy allowlist.

## Verification
- Run `npm run test:functions`
- Run `npm --prefix functions run build`

## Related scripts
- `npm run prepare:functions-artifact`
- `npm run test:functions-artifact`
- `npm run test:functions-boundary`
- `npm run test:functions-runtime-gate`
- `npm run test:functions`

## Outputs
- Verified, compiled, and production-ready Cloud Functions build artifacts.

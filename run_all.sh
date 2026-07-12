#!/bin/bash
set -e

echo "1. npm ci"
npm ci > /dev/null
echo "2. efp-model build"
npm --prefix packages/efp-model run build > /dev/null
echo "3. contracts:validate"
npm run contracts:validate > /dev/null
echo "4. contracts:check-generated"
npm run contracts:check-generated > /dev/null
echo "5. version:verify"
npm run version:verify > /dev/null
echo "6. test:routing-boundary"
npm run test:routing-boundary > /dev/null
echo "7. test:routing"
npm run test:routing > /dev/null
echo "8. efp-model typecheck"
npm --prefix packages/efp-model run typecheck > /dev/null
echo "9. efp-model test"
npm --prefix packages/efp-model run test > /dev/null
echo "10. efp-model test:artifact"
npm --prefix packages/efp-model run test:artifact > /dev/null
echo "11. prepare:functions-artifact"
npm run prepare:functions-artifact > /dev/null
echo "12. npm ci --prefix functions"
npm ci --prefix functions > /dev/null
echo "13. test:functions-artifact"
npm run test:functions-artifact > /dev/null
echo "14. test:functions-boundary"
npm run test:functions-boundary > /dev/null
echo "15. test:functions-runtime-gate"
npm run test:functions-runtime-gate > /dev/null
echo "16. test:functions"
npm run test:functions > /dev/null
echo "17. functions build"
npm --prefix functions run build > /dev/null
echo "18. root test"
npm run test > /dev/null
echo "19. test:rules"
npm run test:rules > /dev/null
echo "20. lint"
npm run lint > /dev/null
echo "21. build"
npm run build > /dev/null

echo "✅ ALL PASSED"

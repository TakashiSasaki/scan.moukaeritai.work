import fs from 'fs';

let content = fs.readFileSync('functions/src/canonicalRequestIdentity.ts', 'utf8');

const rep = `function serializeToCanonicalJson(value: any): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(\`Invalid number value: \${value}. Only finite numbers are allowed.\`);
    }
    return JSON.stringify(value);
  }
  if (typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "undefined" || typeof value === "symbol" || typeof value === "function" || typeof value === "bigint") {
    throw new Error(\`Unsupported type: \${typeof value}\`);
  }
  if (Array.isArray(value)) {
    const arr = value.map(item => serializeToCanonicalJson(item));
    return "[" + arr.join(",") + "]";
  }
  if (typeof value === "object") {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      throw new Error(\`Unsupported object type. Only plain objects are allowed.\`);
    }
    const keys = Object.keys(value).sort();
    const props = keys.map(key => {
      const v = serializeToCanonicalJson(value[key]);
      return JSON.stringify(key) + ":" + v;
    });
    return "{" + props.join(",") + "}";
  }
  throw new Error(\`Unknown value type: \${typeof value}\`);
}

export function getCanonicalRequestIdentityWrapped(callableApiVersion: string, factType: string, data: any) {
  try {
    return getCanonicalRequestIdentity(callableApiVersion, factType, data);
  } catch (e: any) {
    // Actually we will fix this directly in submitFactCommand.ts
  }
}`;

content = content.replace(/function serializeToCanonicalJson[\s\S]*?Unknown value type.*\n\}/, rep.substring(0, rep.indexOf('export function getCanonicalRequestIdentityWrapped')-1));
fs.writeFileSync('functions/src/canonicalRequestIdentity.ts', content);

let sub = fs.readFileSync('functions/src/submitFactCommand.ts', 'utf8');
sub = sub.replace(/  const identity = getCanonicalRequestIdentity\(activeApiVersion, factType, payloadData\);/, 
`  let identity;
  try {
    identity = getCanonicalRequestIdentity(activeApiVersion, factType, payloadData);
  } catch (e: any) {
    throw new HttpsError("invalid-argument", \`Request canonicalization failed: \${e.message}\`);
  }`);
fs.writeFileSync('functions/src/submitFactCommand.ts', sub);

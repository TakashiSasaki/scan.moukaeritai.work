import * as crypto from "crypto";

export function getCanonicalRequestIdentity(callableApiVersion: string, factType: string, data: any) {
  const canonicalJson = serializeToCanonicalJson({
    callableApiVersion,
    factType,
    data
  });
  
  const requestHash = crypto.createHash("sha256").update(canonicalJson, "utf8").digest("hex");
  const requestHashVersion = 1;

  return {
    canonicalJson,
    requestHash,
    requestHashVersion,
    callableApiVersion,
    factType
  };
}

function serializeToCanonicalJson(value: any): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid number value: ${value}. Only finite numbers are allowed.`);
    }
    return JSON.stringify(value);
  }
  if (typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "undefined" || typeof value === "symbol" || typeof value === "function" || typeof value === "bigint") {
    throw new Error(`Unsupported type: ${typeof value}`);
  }
  if (Array.isArray(value)) {
    const arr = value.map(item => serializeToCanonicalJson(item));
    return "[" + arr.join(",") + "]";
  }
  if (typeof value === "object") {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      throw new Error(`Unsupported object type. Only plain objects are allowed.`);
    }
    const keys = Object.keys(value).sort();
    const props = keys.map(key => {
      const v = serializeToCanonicalJson(value[key]);
      return JSON.stringify(key) + ":" + v;
    });
    return "{" + props.join(",") + "}";
  }
  throw new Error(`Unknown value type: ${typeof value}`);
}


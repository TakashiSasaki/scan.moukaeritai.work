"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uuidV5FromCanonicalPayload = exports.canonicalizeJson = exports.APPLICATION_UUID_V5_NAMESPACE = void 0;
const uuid_1 = require("uuid");
/**
 * Application-wide UUIDv5 namespace for deterministic UUID generation.
 * This is a persistent data-model constant generated once as a UUIDv4.
 * The authoritative record and rationale are documented in `docs/architecture/deterministic-uuid.md`.
 * Do not change this, because changing it changes all derived UUIDv5 IDs.
 */
exports.APPLICATION_UUID_V5_NAMESPACE = 'e23891cf-81cd-4231-b750-836376f90efe';
/**
 * Converts a valid JSON payload into a canonical string.
 * This function enforces a strict canonical JSON policy for deterministic UUIDv5 name payloads.
 *
 * Requirements:
 * - Accepts JSON-compatible values only.
 * - Throws on `undefined`, functions, or non-finite numbers (NaN/Infinity).
 * - Sorts object keys deterministically.
 * - Preserves array order (array order is semantically meaningful).
 * - Caller is responsible for sorting set-like arrays before passing them.
 * - Date, Timestamp, Map, Set, or cyclic objects are not supported directly; they must be normalized before passing.
 */
function canonicalizeJson(value) {
    if (value === null)
        return 'null';
    const type = typeof value;
    if (type === 'string') {
        return JSON.stringify(value);
    }
    if (type === 'number') {
        if (!Number.isFinite(value)) {
            throw new Error('canonicalizeJson: NaN and Infinity are not supported.');
        }
        return String(value);
    }
    if (type === 'boolean') {
        return String(value);
    }
    if (type === 'object') {
        if (Array.isArray(value)) {
            const items = [];
            for (let i = 0; i < value.length; i++) {
                if (!(i in value) || value[i] === undefined) {
                    throw new Error('canonicalizeJson: undefined array elements or sparse arrays are not supported.');
                }
                items.push(canonicalizeJson(value[i]));
            }
            return `[${items.join(',')}]`;
        }
        // It's a plain object (or something pretending to be)
        // We strictly reject non-plain objects like Date, Map, Set
        if (Object.prototype.toString.call(value) !== '[object Object]') {
            throw new Error(`canonicalizeJson: Unsupported object type ${Object.prototype.toString.call(value)}`);
        }
        const keys = Object.keys(value).sort();
        const props = keys.map(k => {
            const v = value[k];
            if (v === undefined) {
                throw new Error(`canonicalizeJson: undefined value found for key '${k}'.`);
            }
            return `${JSON.stringify(k)}:${canonicalizeJson(v)}`;
        });
        return `{${props.join(',')}}`;
    }
    throw new Error(`canonicalizeJson: Unsupported type '${type}'.`);
}
exports.canonicalizeJson = canonicalizeJson;
/**
 * Generates a deterministic UUIDv5 from a canonical JSON payload.
 */
function uuidV5FromCanonicalPayload(payload) {
    const canonicalString = canonicalizeJson(payload);
    return (0, uuid_1.v5)(canonicalString, exports.APPLICATION_UUID_V5_NAMESPACE);
}
exports.uuidV5FromCanonicalPayload = uuidV5FromCanonicalPayload;
//# sourceMappingURL=deterministicUuid.js.map
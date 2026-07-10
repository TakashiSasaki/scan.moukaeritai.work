import * as assert from "node:assert";
import test from "node:test";
import { getClientIp } from "./src/index.js";

test("getClientIp returns correct IP and reverse DNS", async (t) => {
  // Mock request object
  const mockRequest = {
    rawRequest: {
      headers: {
        "x-forwarded-for": "1.1.1.1, 10.0.0.1",
      },
      ip: "10.0.0.1",
      socket: {
        remoteAddress: "10.0.0.1",
      },
    },
  };

  // call the underlying function
  // Note: For v2 functions, the exported object has a `run` method for testing,
  // but if it's imported in a JS context, we might need to access it differently.
  // Actually, wait, `getClientIp.run` is the way to call it with a mock request object
  // wait, the `run` method in v2 accepts the CallableRequest object.
  const result = await getClientIp.run(mockRequest as any);

  assert.strictEqual(result.ip, "1.1.1.1");
  // 1.1.1.1 is Cloudflare's DNS, its reverse DNS is one.one.one.one
  assert.ok(result.reverseDns.length > 0);
  assert.strictEqual(result.reverseDns[0], "one.one.one.one");
});

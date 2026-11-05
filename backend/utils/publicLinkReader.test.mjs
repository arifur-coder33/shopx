import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { extractPublicLinks, isPublicAddress, publicUrl, readPublicLink } from "./publicLinkReader.mjs";

test("rejects loopback, private, metadata and mapped/transition IPv6 addresses", () => {
  for (const address of ["127.0.0.1", "10.1.1.1", "169.254.169.254", "172.16.0.1", "192.168.1.1", "100.100.100.200", "::1", "::ffff:8.8.8.8", "fc00::1", "fe80::1", "2002:0808:0808::1", "2001:db8::1"]) assert.equal(isPublicAddress(address), false, address);
  for (const address of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"]) assert.equal(isPublicAddress(address), true, address);
  for (const url of ["http://2130706433/", "http://0x7f000001/", "http://127.1/", "http://[::1]/", "http://localhost/", "https://user:pass@example.com/", "https://example.com:8080/", "file:///etc/passwd"]) assert.throws(() => publicUrl(url));
});

test("extracts bounded distinct links and unwraps Meta redirect links", () => {
  assert.deepEqual(extractPublicLinks("https://l.facebook.com/l.php?u=https%3A%2F%2Fshop.example%2Fproduct%2Ftest https://shop.example/product/test www.example.com. http://localhost/ https://other.example", 2), ["https://shop.example/product/test", "https://www.example.com/"]);
});

function mockRequest(handler) {
  return (url, options, callback) => {
    const request = new EventEmitter();
    request.end = () => queueMicrotask(() => {
      const result = handler(url, options);
      const response = Readable.from([Buffer.from(result.body || "")]);
      response.statusCode = result.status || 200;
      response.headers = result.headers || { "content-type": "text/html" };
      callback(response);
    });
    return request;
  };
}

test("pins the verified IP and does not send credentials to public pages", async () => {
  const requestHttps = mockRequest((_url, options) => {
    options.lookup("example.com", {}, (error, address, family) => {
      assert.equal(error, null); assert.equal(address, "8.8.8.8"); assert.equal(family, 4);
    });
    assert.equal(options.headers.Authorization, undefined);
    return { body: "<p>Product information</p>" };
  });
  const result = await readPublicLink("https://example.com/", { resolve: async () => [{ address: "8.8.8.8", family: 4 }], requestHttps });
  assert.match(result.body, /Product information/);
});

test("blocks mixed public/private DNS results before making a request", async () => {
  let requested = false;
  await assert.rejects(readPublicLink("https://example.com/", {
    resolve: async () => [{ address: "8.8.8.8", family: 4 }, { address: "127.0.0.1", family: 4 }],
    requestHttps: () => { requested = true; },
  }), /private_address/);
  assert.equal(requested, false);
});

test("revalidates redirects and caps response bodies", async () => {
  const resolve = async () => [{ address: "8.8.8.8", family: 4 }];
  await assert.rejects(readPublicLink("https://example.com/", { resolve, requestHttps: mockRequest(() => ({ status: 302, headers: { location: "http://169.254.169.254/" } })) }), /private_host/);
  await assert.rejects(readPublicLink("https://example.com/", { resolve, requestHttps: mockRequest(() => ({ body: "x".repeat(128 * 1024 + 1) })) }), /page_too_large/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { formatCustomer, validateCustomer } from "../api/screen.js";
import { citationWarnings } from "../lib/openrouter.js";

const valid = {
  name: "Avery Morgan",
  institution: "Northbridge Institute",
  email: "avery@example.org",
  orcid: "",
  order: "Fictional order",
};

test("accepts structured customer data and formats only known fields", () => {
  assert.equal(validateCustomer(valid), null);
  assert.equal(
    formatCustomer({ ...valid, ignored: "instructions" }),
    "Name: Avery Morgan\nInstitution: Northbridge Institute\nEmail: avery@example.org\nOrder or intended work: Fictional order",
  );
});

test("rejects malformed and oversized customer fields", () => {
  assert.match(validateCustomer({ ...valid, email: "not an email" }), /Email/);
  assert.match(validateCustomer({ ...valid, name: "x".repeat(161) }), /too long/);
  assert.match(validateCustomer({ ...valid, orcid: "123" }), /ORCID/);
});

test("reports model citations that were not returned by a tool", () => {
  assert.deepEqual(
    citationWarnings("Supported [web1], unsupported [screen2] and [web1].", [
      { id: "web1" },
    ]),
    ["screen2"],
  );
});

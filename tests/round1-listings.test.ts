/** Round 1: listing extras, terms rules, invoice layout — run with `npm test`. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cleanCategories, cleanCertificates, cleanPatents, cleanOrigin, cleanShipsTo, cleanExtras,
  extrasProblem, groupOfVendorCategory, EMPTY_EXTRAS, MAX_CERTIFICATES,
} from "@/lib/listings/extras";
import { missingFor, TERMS_VERSIONS, docFromSlug, docHref } from "@/lib/legal/terms";
import { invoicePages, invoiceTotals, ROWS_WITH_TOTALS } from "@/lib/export/invoiceLayout";

test("main category's group comes first; extras are known groups, no repeats", () => {
  assert.equal(groupOfVendorCategory("Sofas"), "Seating");
  assert.equal(groupOfVendorCategory("Décor accents"), "Decor");
  assert.deepEqual(cleanCategories("Storage", ["Seating", "Storage", "Bogus", "Seating", 4]), ["Storage", "Seating"]);
  assert.deepEqual(cleanCategories("Choose", ["Tables"]), ["Tables"]);
  assert.deepEqual(cleanCategories("Sofas", "Seating"), ["Seating"]);
});

test("certificates: need a name, https links only, valid dates, capped", () => {
  const out = cleanCertificates([
    { name: " SASO conformity ", issuer: "SASO", url: "https://x.supabase.co/c.pdf", expires: "2027-03-01" },
    { name: "", url: "https://x/y.pdf" },
    { name: "ISO 9001", url: "javascript:alert(1)", expires: "soon" },
  ]);
  assert.deepEqual(out, [
    { name: "SASO conformity", issuer: "SASO", url: "https://x.supabase.co/c.pdf", expires: "2027-03-01" },
    { name: "ISO 9001" },
  ]);
  const many = cleanCertificates(Array.from({ length: 20 }, (_, i) => ({ name: `C${i}` })));
  assert.equal(many.length, MAX_CERTIFICATES);
});

test("patents need a number; unknown country dropped", () => {
  assert.deepEqual(cleanPatents([{ number: "SA 1234", country: "sa", title: "Hinge" }, { title: "no number" }, { number: "X", country: "ZZ" }]), [
    { number: "SA 1234", country: "SA", title: "Hinge" },
    { number: "X" },
  ]);
});

test("origin and ships-to", () => {
  assert.deepEqual(cleanOrigin("saudi", "IT"), { origin: "saudi", origin_country: "SA" });
  assert.deepEqual(cleanOrigin("international", "it"), { origin: "international", origin_country: "IT" });
  assert.deepEqual(cleanOrigin("international", "SA"), { origin: "international", origin_country: "" });
  assert.deepEqual(cleanOrigin(undefined, undefined), { origin: "saudi", origin_country: "SA" });
  assert.deepEqual(cleanShipsTo(["sa", "AE", "AE", "XX"]), ["SA", "AE"]);
  assert.deepEqual(cleanShipsTo([]), ["SA"]);
  assert.deepEqual(cleanShipsTo(null), ["SA"]);
});

test("cleanExtras bundles everything", () => {
  const x = cleanExtras("Chairs", { categories: ["Outdoor"], origin: "international", origin_country: "TR", ships_to: ["SA", "KW"] });
  assert.deepEqual(x.categories, ["Seating", "Outdoor"]);
  assert.equal(x.origin_country, "TR");
  assert.deepEqual(x.ships_to, ["SA", "KW"]);
  assert.deepEqual(x.certificates, []);
});

test("form problems", () => {
  assert.equal(extrasProblem(EMPTY_EXTRAS), null);
  assert.match(extrasProblem({ ...EMPTY_EXTRAS, origin: "international", origin_country: "" })!, /country/);
  assert.match(extrasProblem({ ...EMPTY_EXTRAS, ships_to: [] })!, /ships to/);
  assert.match(extrasProblem({ ...EMPTY_EXTRAS, certificates: [{ name: "", url: "https://a" }] })!, /name/);
  assert.match(extrasProblem({ ...EMPTY_EXTRAS, certificates: [{ name: "A", uploading: true }] })!, /upload/);
});

test("terms: current version, per role", () => {
  assert.deepEqual(missingFor("vendor", []), ["terms", "privacy", "vendor_agreement"]);
  assert.deepEqual(missingFor("client", [
    { role: "client", document: "terms", version: TERMS_VERSIONS.terms },
    { role: "client", document: "privacy", version: TERMS_VERSIONS.privacy },
  ]), []);
  assert.deepEqual(missingFor("employee", [{ role: "client", document: "terms", version: TERMS_VERSIONS.terms }]),
    ["terms", "privacy", "employee_policy"]);
  assert.equal(docFromSlug("vendor-agreement"), "vendor_agreement");
  assert.equal(docFromSlug("nope"), null);
  assert.equal(docHref("employee_policy"), "/legal/employee-policy");
});

test("invoice pages: totals always on the last page, nothing lost", () => {
  for (const n of [0, 1, ROWS_WITH_TOTALS, ROWS_WITH_TOTALS + 1, 14, 15, 23, 40]) {
    const pages = invoicePages(n);
    assert.equal(pages[0].from, 0);
    assert.equal(pages[pages.length - 1].to, n);
    for (let i = 1; i < pages.length; i++) assert.equal(pages[i].from, pages[i - 1].to);
    assert.ok(pages[pages.length - 1].to - pages[pages.length - 1].from <= ROWS_WITH_TOTALS);
  }
  assert.equal(invoicePages(5).length, 1);
});

test("invoice totals add up", () => {
  const t = invoiceTotals({ subtotal: 2400, discount: 100, shipping: 50, vat_amount: 352.5, total: 2702.5, vat_rate: 15 });
  assert.equal(t.taxable, 2350);
  assert.equal(Math.round((t.taxable + t.vat) * 100) / 100, t.total);
});

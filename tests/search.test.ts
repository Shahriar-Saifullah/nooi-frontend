/** Platform search: local matches and links — run with `npm test`. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { hitHref, localGroups, localScore, mergeGroups, type SearchHit } from "@/lib/search/search";

const hit = (kind: SearchHit["kind"], extra: Partial<SearchHit> = {}): SearchHit =>
  ({ kind, id: "ID", title: "T", subtitle: null, image: null, ref: null, status: null, score: 1, ...extra });

test("local matching: prefix beats word beats keyword", () => {
  assert.equal(localScore("ord", "Orders"), 1);
  assert.equal(localScore("inv", "Documents & invoices"), 0.9);
  assert.equal(localScore("vat", "Documents & invoices", "invoices vat receipts"), 0.7);
  assert.equal(localScore("sofas", "Seating", "sofa couch"), 0.6);
  assert.equal(localScore("x", "Orders"), 0);
  assert.equal(localScore("zzz", "Orders"), 0);
});

test("pages depend on who searches", () => {
  const pages = (q: string, s: Parameters<typeof localGroups>[1]) =>
    localGroups(q, s).find(g => g.kind === "page")?.hits.map(h => h.ref) ?? [];
  assert.ok(pages("payout", "vendor").includes("/sell/payments"));
  assert.ok(pages("payout", "admin").includes("/admin/payouts"));
  assert.deepEqual(pages("payout", "client"), []);
  assert.ok(pages("invoice", "client").includes("/dashboard/profile"));
  const cats = localGroups("sofa", "public").find(g => g.kind === "category")!;
  assert.equal(cats.hits[0].ref, "Seating");
  assert.equal(localGroups("كنبة", "public", true).find(g => g.kind === "category")!.hits[0].title, "مقاعد");
});

test("links per role", () => {
  assert.equal(hitHref(hit("product", { status: "approved" }), "client"), "/marketplace/ID");
  assert.equal(hitHref(hit("product", { status: "pending" }), "vendor"), "/sell/products?product=ID");
  assert.equal(hitHref(hit("product", { status: "pending" }), "admin"), "/admin/listings?id=ID");
  assert.equal(hitHref(hit("order", { title: "NOOI-123" }), "vendor"), "/sell/orders?order=NOOI-123");
  assert.equal(hitHref(hit("order"), "client"), "/orders/ID");
  assert.equal(hitHref(hit("order"), "admin"), "/admin/orders?id=ID");
  assert.equal(hitHref(hit("invoice", { ref: "ORD" }), "client"), "/orders/ORD");
  assert.equal(hitHref(hit("ticket"), "vendor"), "/sell/support?ticket=ID");
  assert.equal(hitHref(hit("ticket"), "admin"), "/admin/support?id=ID");
  assert.equal(hitHref(hit("account", { status: "approved" }), "admin"), "/admin/applications?id=ID");
  assert.equal(hitHref(hit("account", { status: "admin" }), "admin"), "/admin/team");
  assert.equal(hitHref(hit("category", { ref: "Beds" }), "public"), "/marketplace?group=Beds");
  assert.equal(hitHref(hit("project"), "client"), "/canvas?projectId=ID");
});

test("local groups come first", () => {
  const m = mergeGroups([{ kind: "page", hits: [hit("page")] }], [{ kind: "product", hits: [hit("product")] }, { kind: "order", hits: [] }]);
  assert.deepEqual(m.map(g => g.kind), ["page", "product"]);
});

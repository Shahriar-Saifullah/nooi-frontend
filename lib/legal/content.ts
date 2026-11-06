/**
 * Working text of Nooi's legal documents — lib/legal/content.ts
 * ============================================================================
 * A plain-language starting draft so acceptance can be recorded against a
 * real document. It has NOT been reviewed by a lawyer. Replace each section
 * with counsel's text and bump the version in lib/legal/terms.ts and the
 * backend's terms.service.ts.
 */

import type { TermsDocument } from "./terms";

export interface LegalSection { h: string; p: string[] }

export const LEGAL_CONTENT: Record<TermsDocument, LegalSection[]> = {
  terms: [
    { h: "Who we are", p: [
      "Nooi is an interior design platform and marketplace operated in the Kingdom of Saudi Arabia. Nooi sells the products listed in its marketplace as merchant of record and issues the tax invoice for every order; independent vendors and factories make and ship them.",
    ] },
    { h: "Your account", p: [
      "Keep your sign-in details private and tell us if you think someone else has used your account. You are responsible for what happens under your account.",
    ] },
    { h: "Designs and AI", p: [
      "Designs you create are yours. AI-generated images and layouts are suggestions: check measurements, structure and electrical or plumbing work with a qualified professional before building.",
    ] },
    { h: "Orders and prices", p: [
      "Prices are in Saudi riyals and exclude 15% VAT until checkout, where VAT and delivery are shown before you pay. An order is confirmed once payment succeeds. Each vendor ships separately, with its own delivery estimate.",
      "Made-to-order and custom-size pieces are produced for you and cannot be returned unless faulty. In-stock items can be returned within the window shown on the order.",
    ] },
    { h: "Delivery", p: [
      "We deliver only to the countries a listing shows under \"Ships to\". Delivery dates are estimates from the vendor's lead time.",
    ] },
    { h: "Acceptable use", p: [
      "Don't misuse the platform: no unlawful content, no attempts to break security, no scraping, and no listing or buying items prohibited in Saudi Arabia.",
    ] },
    { h: "Liability", p: [
      "Nooi is not liable for indirect losses. Nothing in these terms limits rights you have under Saudi consumer protection law.",
    ] },
    { h: "Governing law", p: [
      "These terms are governed by the laws of the Kingdom of Saudi Arabia, and disputes are resolved by its competent courts.",
    ] },
  ],
  privacy: [
    { h: "What we collect", p: [
      "Your name, email, phone, delivery addresses, orders, the rooms and designs you create, and technical data such as your IP address and browser. Card details are handled by our payment provider and never stored by Nooi.",
    ] },
    { h: "How we use it", p: [
      "To run your account, process and deliver orders, issue invoices, provide support, keep the platform secure and, if you agree, send you updates. Vendors receive only what they need to make and deliver your order.",
    ] },
    { h: "Where it is kept", p: [
      "Data is stored with our cloud providers and handled in line with Saudi Arabia's Personal Data Protection Law (PDPL).",
    ] },
    { h: "Your rights", p: [
      "You can see, correct, download or delete your data from Settings, or ask us through Support. Invoices are kept for as long as tax law requires.",
    ] },
    { h: "Records of consent", p: [
      "When you accept these documents we record which version, when, and the IP address and browser used, so we can show what was agreed.",
    ] },
  ],
  vendor_agreement: [
    { h: "Who this applies to", p: [
      "Every vendor and factory selling on Nooi. A factory is a vendor that manufactures its own products and carries the Factory badge.",
    ] },
    { h: "Listings", p: [
      "Listings must be accurate: real photos, exact dimensions, materials, lead time, where the product is made and the countries it ships to. Certificates and patents you add must be genuine and current. Nooi reviews every listing before it goes on sale and may remove any listing.",
    ] },
    { h: "Orders and fulfilment", p: [
      "Accept, make and ship orders within the lead time you state, update the shipment stage in your dashboard, and pack goods to arrive undamaged. Measurement visits you accept must be attended at the agreed time.",
    ] },
    { h: "Commission and payouts", p: [
      "Nooi sells to the customer and issues the invoice. You receive the sale price less Nooi's commission, paid to your registered Saudi bank account after the hold period shown in your dashboard. Refunds for faulty, late or undelivered items may be deducted.",
    ] },
    { h: "Quality and compliance", p: [
      "You are responsible for product safety, SASO and other required conformity, and your own commercial registration and VAT obligations.",
    ] },
    { h: "Customer data", p: [
      "Use customer details only to fulfil the order. Don't contact customers outside Nooi for marketing.",
    ] },
    { h: "Ending the agreement", p: [
      "Either side can end this agreement with notice; open orders must still be completed. Nooi may suspend accounts for serious or repeated breaches.",
    ] },
  ],
  employee_policy: [
    { h: "Confidentiality", p: [
      "Customer, vendor, order, payment and business information seen in the Nooi admin is confidential. Use it only for your job and never share it outside Nooi.",
    ] },
    { h: "Access", p: [
      "Use only your own account, keep your password private, and access only the records you need. Admin actions are logged.",
    ] },
    { h: "Fair dealing", p: [
      "Review listings, refunds and payouts on their merits. Declare any personal link to a vendor or customer and step away from decisions about them.",
    ] },
    { h: "Personal data", p: [
      "Handle personal data in line with the Privacy Policy and the PDPL. Report any suspected breach immediately.",
    ] },
  ],
};

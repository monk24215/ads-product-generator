# ads-product-generator

Spawn a new `ads-product-*` from the template. Slug is identity — everything else is derived.

## One-time setup

1. Clone this repo locally.
2. `npm install`
3. Copy `.env.example` to `.env` and fill in your `GITHUB_TOKEN`.
4. `npm link` — makes the `new-product` command available globally on your machine.

## Usage

```bash
new-product <slug> <vendor_id> <product_name>
```

### Example

```bash
new-product decoy SURVDCY "Survival Decoy Caching"
```

This will:

1. Create `wirehouseworkers/ads-product-decoy` as a private repo (cloned from the template).
2. Write `product.json` with the slug-derived identity populated; marketing copy fields are stubbed with `TODO:` placeholders.
3. Register the product slug in the `ads-access-system` catalog.

Then the CLI tells you the remaining manual steps:

- Create a Railway service from the new repo.
- Set environment variables.
- Add a custom domain in Railway.
- Add a DNS CNAME.
- Drop in hero images.
- Fill in the `TODO:` marketing copy.

## Slug rules

- Lowercase letters, digits, hyphens only.
- 2–32 characters.
- No leading or trailing hyphen.
- The slug IS the routing — choose carefully. It becomes:
  - Repo name: `ads-product-<slug>`
  - Subdomain: `<slug>.survivalskills.pro`
  - Catalog key, asset folder, ClickBank TID, internal hostname — all derive from it.

## Vendor ID rules

- Uppercase letters and digits, 5–12 characters.
- This is your ClickBank vendor ID exactly as it appears in the marketplace.

## Why this exists

40 products, each with their own routing, naming, infrastructure, and integration touchpoints. Manual setup compounds mistakes. This tool turns spawning a new product into one command and a checklist.
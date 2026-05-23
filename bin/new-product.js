#!/usr/bin/env node
import 'dotenv/config';
import { validateSlug, validateVendorId, deriveIdentity, buildProductJson, github, b64 } from '../lib/template.js';

const args = process.argv.slice(2);
if (args.length < 3 || args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage:
  new-product <slug> <vendor_id> <product_name>

Example:
  new-product decoy SURVDCY "Survival Decoy Caching"

Slug rules: lowercase letters, digits, hyphens. 2-32 chars.
Vendor ID rules: 5-12 uppercase letters/digits (ClickBank format).
Product name: free text, quote if it contains spaces.
`);
  process.exit(args.length < 3 ? 1 : 0);
}

const [slug, vendor_id, product_name] = args;

// --- Validate inputs ---------------------------------------------------------
const slugErr = validateSlug(slug);
if (slugErr) fail(`Invalid slug: ${slugErr}`);

const vendorErr = validateVendorId(vendor_id);
if (vendorErr) fail(`Invalid vendor ID: ${vendorErr}`);

if (!product_name || product_name.length < 2) fail('Product name required');

// --- Validate environment ----------------------------------------------------
const {
  GITHUB_TOKEN,
  GITHUB_OWNER,
  TEMPLATE_REPO    = 'ads-product-template',
  TEMPLATE_OWNER,
  ADS_ACCESS_BASE  = 'https://ads-access.survivalskills.pro',
} = process.env;

if (!GITHUB_TOKEN) fail('GITHUB_TOKEN missing in .env');
if (!GITHUB_OWNER) fail('GITHUB_OWNER missing in .env');

const templateOwner = TEMPLATE_OWNER || GITHUB_OWNER;
const identity = deriveIdentity(slug);

// --- Execute -----------------------------------------------------------------
log('SCAFFOLDING NEW PRODUCT');
log(`  Slug:          ${identity.slug}`);
log(`  Repo:          ${GITHUB_OWNER}/${identity.repo_name}`);
log(`  Subdomain:     ${identity.subdomain}.survivalskills.pro`);
log(`  Vendor ID:     ${vendor_id}`);
log(`  Product name:  ${product_name}`);
console.log('');

try {
  // 1. Create repo from template
  log('1/3 Creating GitHub repo from template...');
  await github(GITHUB_TOKEN, 'POST', `/repos/${templateOwner}/${TEMPLATE_REPO}/generate`, {
    owner: GITHUB_OWNER,
    name: identity.repo_name,
    description: `${product_name} — sales page service`,
    private: true,
    include_all_branches: false,
  });
  ok(`Repo created: ${GITHUB_OWNER}/${identity.repo_name}`);

  // GitHub takes a beat to finish initializing the new repo
  await sleep(2000);

  // 2. Write the populated product.json over the template's default
  log('2/3 Writing product.json with slug-derived identity...');
  const productJson = buildProductJson({ slug, vendor_id, product_name });

  // get the current product.json sha (required to update via Contents API)
  const existing = await github(
    GITHUB_TOKEN,
    'GET',
    `/repos/${GITHUB_OWNER}/${identity.repo_name}/contents/product.json`
  );

  await github(GITHUB_TOKEN, 'PUT', `/repos/${GITHUB_OWNER}/${identity.repo_name}/contents/product.json`, {
    message: `Initialize ${slug} product config`,
    content: b64(JSON.stringify(productJson, null, 2) + '\n'),
    sha: existing.sha,
  });
  ok('product.json written');

  // 3. Register product with ads-access catalog
  log('3/3 Registering with ads-access catalog...');
  try {
    const r = await fetch(`${ADS_ACCESS_BASE}/api/catalog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        title: product_name,
        books: [],
      }),
    });
    if (!r.ok) {
      warn(`Catalog registration returned ${r.status} — register manually if needed`);
    } else {
      ok(`Registered in catalog as "${slug}"`);
    }
  } catch (e) {
    warn(`Could not reach catalog endpoint: ${e.message}`);
  }

  console.log('');
  log('SCAFFOLDING COMPLETE — NEXT STEPS:');
  console.log('');
  console.log(`  1. Create Railway service from: ${GITHUB_OWNER}/${identity.repo_name}`);
  console.log(`  2. Set environment variables on the service:`);
  console.log(`       PORT=8080`);
  console.log(`       DESIGN_BASE=https://ads-design.survivalskills.pro`);
  console.log(`       COMPLIANCE_BASE=https://ads-compliance.survivalskills.pro`);
  console.log(`       ACCESS_BASE=${ADS_ACCESS_BASE}`);
  console.log(`       SELF_AFFILIATE=monk242`);
  console.log(`  3. Add custom domain in Railway: ${identity.subdomain}.survivalskills.pro`);
  console.log(`  4. Add DNS CNAME: ${identity.subdomain} → <Railway target>`);
  console.log(`  5. Drop hero images into public${identity.asset_folder} (hero.png, hero.webp)`);
  console.log(`  6. Fill in TODO: fields in product.json with marketing copy`);
  console.log('');

} catch (err) {
  console.error('');
  fail(`FAILED: ${err.message}`);
}

// --- Helpers -----------------------------------------------------------------
function log(msg)  { console.log(`  ${msg}`); }
function ok(msg)   { console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
function warn(msg) { console.log(`  \x1b[33m!\x1b[0m ${msg}`); }
function fail(msg) {
  console.error(`  \x1b[31m✗\x1b[0m ${msg}`);
  process.exit(1);
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
// Helpers — pure functions, no side effects.

/**
 * Strip control characters from strings before sending to GitHub API.
 * Prevents Windows terminal artifacts (^B, ^C, etc.) from breaking requests.
 */
export function clean(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/[\u2000-\u200F\uFEFF]/g, '')
    .trim();
}

/**
 * Validate that a slug follows the convention:
 *   lowercase, hyphens allowed, no leading/trailing hyphen, 2-32 chars.
 */
export function validateSlug(slug) {
  if (typeof slug !== 'string') return 'Slug must be a string';
  if (slug.length < 2 || slug.length > 32) return 'Slug must be 2-32 characters';
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    return 'Slug must be lowercase letters, digits, and hyphens only (no leading/trailing hyphen)';
  }
  return null;
}

/**
 * Validate a ClickBank vendor ID — 5-12 uppercase alphanumeric characters.
 */
export function validateVendorId(id) {
  if (typeof id !== 'string') return 'Vendor ID must be a string';
  if (!/^[A-Z0-9]{5,12}$/.test(id)) {
    return 'Vendor ID must be 5-12 uppercase letters/digits';
  }
  return null;
}

/**
 * Derive every routing/identity value a product needs from the slug alone.
 */
export function deriveIdentity(slug) {
  return {
    slug,
    repo_name:           `ads-product-${slug}`,
    subdomain:           slug,
    public_url:          `https://${slug}.survivalskills.pro`,
    railway_internal:    `adsproduct${slug.replace(/-/g, '')}.railway.internal`,
    asset_folder:        `/assets/images/${slug}/`,
    hero_image:          `/assets/images/${slug}/hero.png`,
    hero_image_webp:     `/assets/images/${slug}/hero.webp`,
    catalog_key:         slug,
    clickbank_tid:       slug,
  };
}

/**
 * Build the initial product.json with TODO placeholders for marketing copy.
 */
export function buildProductJson({ slug, vendor_id, product_name }) {
  const identity = deriveIdentity(slug);
  const TODO = (field) => `TODO: write ${field}`;

  return {
    slug:              identity.slug,
    vendor_id,
    product_name,
    product_tagline:   TODO('product_tagline'),
    hero_image:        identity.hero_image,
    hero_image_webp:   identity.hero_image_webp,
    hero_image_alt:    product_name,
    price:             37,
    price_was:         97,

    opsec_bar:         TODO('opsec_bar'),

    hero_kicker:       TODO('hero_kicker'),
    hero_headline_top: TODO('hero_headline_top'),
    hero_headline_bottom: TODO('hero_headline_bottom'),
    hero_sub:          TODO('hero_sub'),
    hero_meta: [
      'Complete System',
      'Instant Digital Download',
      'Companion Guide Included',
      '60-Day Guarantee'
    ],

    problem_lead:        TODO('problem_lead'),
    problem_paragraphs:  [],
    problem_fails:       [],
    problem_close:       TODO('problem_close'),
    pullquote:           TODO('pullquote'),

    mechanism_label:        TODO('mechanism_label'),
    mechanism_title_top:    TODO('mechanism_title_top'),
    mechanism_title_bottom: TODO('mechanism_title_bottom'),
    mechanism_badge:        'THE STRATEGY',
    mechanism_heading:      TODO('mechanism_heading'),
    mechanism_paragraphs:   [],
    tactics_label:          TODO('tactics_label'),
    tactics:                [],

    inside_label:        'What\'s Inside the Guide',
    inside_title_top:    product_name,
    inside_title_bottom: '— Complete System Contents',
    inside_sections:     [],

    companion_label:        'Free Companion Guide',
    companion_title_top:    'Print It. Fill It Out.',
    companion_title_bottom: 'Use It This Weekend.',
    companion_heading:      TODO('companion_heading'),
    companion_sub:          TODO('companion_sub'),
    companion_body:         TODO('companion_body'),
    companion_tactics:      [],
    scarcity:               TODO('scarcity'),

    price_caption:    TODO('price_caption'),
    guarantee_body:   TODO('guarantee_body'),

    closing_identity: TODO('closing_identity'),
    ps_blocks:        []
  };
}

/**
 * GitHub REST helper.
 */
export async function github(token, method, path, body) {
  const r = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'ads-product-generator',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`GitHub ${method} ${path} → ${r.status}: ${text}`);
  }
  return r.json();
}

/**
 * Encode a UTF-8 string as base64 for the GitHub Contents API.
 */
export function b64(s) {
  return Buffer.from(s, 'utf-8').toString('base64');
}
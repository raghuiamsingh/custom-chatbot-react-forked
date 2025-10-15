export function stripQuery(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch (_) {
    return url.split('?')[0];
  }
}

export function isLikelyImage(url: string): boolean {
  if (!url) return false;
  const noQuery = stripQuery(url).toLowerCase();
  return (
    noQuery.endsWith('.jpg') ||
    noQuery.endsWith('.jpeg') ||
    noQuery.endsWith('.png') ||
    noQuery.endsWith('.webp') ||
    noQuery.endsWith('.gif') ||
    noQuery.endsWith('.svg')
  );
}

export function normalizeImageUrl(rawUrl: string, base?: string): string {
  if (!rawUrl) return rawUrl;
  const mediaBase = base || process.env.MEDIA_BASE || 'https://uat.gethealthy.store';
  try {
    // Relative paths
    if (rawUrl.startsWith('/')) {
      let path = rawUrl;
      // If under /media but missing catalog/product, insert
      if (path.startsWith('/media/') && !path.startsWith('/media/catalog/product/')) {
        const rest = path.replace(/^\/media\//, '');
        path = `/media/catalog/product/${rest}`;
      } else if (/^\/(?:_|[a-z0-9]\/)/i.test(path) || /\/[a-z0-9]{1}\//i.test(path)) {
        // Magento-like attribute paths such as "/a/d/adb5-180.png" → treat under media/catalog/product
        path = `/media/catalog/product${path}`;
      }
      return mediaBase.replace(/\/$/, '') + path;
    }

    // Absolute URLs
    const u = new URL(rawUrl);
    const baseHost = new URL(mediaBase).hostname.toLowerCase();
    if (u.hostname.toLowerCase().endsWith(baseHost)) {
      if (u.pathname.startsWith('/media/') && !u.pathname.startsWith('/media/catalog/product/')) {
        const rest = u.pathname.replace(/^\/media\//, '');
        u.pathname = `/media/catalog/product/${rest}`;
        return u.toString();
      }
    }
    return rawUrl;
  } catch (_) {
    return rawUrl;
  }
}

export interface Product {
  media_gallery_entries?: Array<{
    extension_attributes?: {
      url?: string;
    };
    file?: string;
  }>;
  custom_attributes?: Array<{
    attribute_code: string;
    value: string;
  }>;
}

export function pickBestImageUrl(product: Product, base?: string): string | null {
  if (!product) return null;
  const candidates: string[] = [];

  // 1) media_gallery_entries[0].extension_attributes.url
  const mge = Array.isArray(product.media_gallery_entries) ? product.media_gallery_entries[0] : null;
  if (mge && mge.extension_attributes && mge.extension_attributes.url) {
    candidates.push(mge.extension_attributes.url);
  }
  // 2) media_gallery_entries[0].file (relative path)
  if (mge && mge.file) {
    candidates.push(mge.file);
  }
  // 3) custom_attributes: image, small_image, thumbnail
  if (Array.isArray(product.custom_attributes)) {
    const attrs = product.custom_attributes;
    const keys = ['image', 'small_image', 'thumbnail'];
    for (const key of keys) {
      const found = attrs.find(a => a.attribute_code === key && a.value);
      if (found && found.value) candidates.push(found.value);
    }
  }

  for (const candidate of candidates) {
    const normalized = normalizeImageUrl(candidate, base);
    if (isLikelyImage(normalized)) return normalized;
  }
  return null;
}

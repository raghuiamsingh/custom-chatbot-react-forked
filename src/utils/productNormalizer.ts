import type { RawProductApiResponse, Product } from "@types";

/**
 * Strips HTML tags from a string
 */
function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  
  // Check if we're in a browser environment
  if (typeof document === 'undefined') {
    // Fallback for non-browser environments: simple regex-based stripping
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  }
  
  // Create a temporary div element
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  // Get text content and clean up whitespace
  const text = tmp.textContent || tmp.innerText || '';
  return text.trim();
}

/**
 * Normalizes raw product API response to Product type for display
 */
export function normalizeProduct(rawProduct: RawProductApiResponse | Partial<RawProductApiResponse> | Product): Product {
  // If it's already a normalized Product (has productUrl field), return as-is
  if ('productUrl' in rawProduct && typeof rawProduct.productUrl === 'string' && rawProduct.productUrl.includes('botdojo/product')) {
    return rawProduct as Product;
  }

  const product = rawProduct as RawProductApiResponse | Partial<RawProductApiResponse>;

  // Get image URL - prefer thumbnail, fallback to first media gallery image
  const imageUrl = product.thumbnail || 
    (product.media_gallery_images && Array.isArray(product.media_gallery_images) && product.media_gallery_images.length > 0 
      ? product.media_gallery_images[0].small_image 
      : '');

  // Get description - strip HTML
  const description = product.description ? stripHtml(product.description) : '';

  // Get dosage from suggested_use - strip HTML
  const dosage = product.suggested_use ? stripHtml(product.suggested_use) : '';

  // Filter out empty strings from ingredients
  const ingredients = Array.isArray(product.ingredients) 
    ? product.ingredients.filter(ing => ing && typeof ing === 'string' && ing.trim() !== '')
    : [];

  // Generate product URL
  const productUrl = product.sku 
    ? `https://uat.gethealthy.store/botdojo/product?sku=${product.sku}`
    : '';

  // Format price
  let price = '';
  if (product.formatted_price) {
    price = product.formatted_price;
  } else if (typeof product.price === 'number') {
    price = `$${product.price.toFixed(2)}`;
  } else if (typeof product.price === 'string') {
    price = product.price;
  }

  return {
    sku: product.sku || '',
    name: product.name || (product.sku ? `Product: ${product.sku}` : 'Product'),
    description,
    price,
    ingredients,
    benefits: [], // Not available in API
    dosage,
    warnings: '', // Not available in API
    productUrl,
    imageUrl,
    category: product.product_typegroup || '',
    brand: product.brand || '',
    servings: product.size ? `${product.size} count` : '',
    form: product.form || '',
  };
}

/**
 * Normalizes an array of raw products
 */
export function normalizeProducts(rawProducts: (RawProductApiResponse | Partial<RawProductApiResponse>)[]): Product[] {
  return rawProducts.map(normalizeProduct);
}

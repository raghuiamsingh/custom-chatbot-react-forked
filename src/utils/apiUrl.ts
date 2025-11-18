/**
 * Build API URL with endpoint prefix
 * @param path - API path (e.g., "/chat", "/suggestions")
 * @param endpoint - Optional endpoint prefix (e.g., "/api/v1" for prod, "" or "/" for local)
 * @returns Full API URL
 */
export function buildApiUrl(path: string, endpoint?: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Handle endpoint prefix
  if (!endpoint || endpoint === '/') {
    return normalizedPath;
  }
  
  // Ensure endpoint doesn't end with / and path doesn't start with /
  const normalizedEndpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
  
  return `${normalizedEndpoint}${normalizedPath}`;
}


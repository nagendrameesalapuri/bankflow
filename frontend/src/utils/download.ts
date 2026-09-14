import { apiClient } from '../services/apiClient';

/**
 * BankFlow authenticates with a Bearer access token (not a cookie usable
 * outside /api/auth), so a plain <a href="..."> to an API route can't carry
 * auth. Downloads instead go through apiClient (which attaches the token)
 * as a blob, then get saved via a throwaway object URL.
 */
export async function downloadAuthenticatedFile(url: string, filename: string): Promise<void> {
  const response = await apiClient.get(url, { responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(response.data as Blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

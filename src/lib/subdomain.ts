import { supabase } from '@/integrations/supabase/client';

const MAIN_DOMAIN = 'nextprochat.com.br';
const DEV_HOSTS = ['localhost', '127.0.0.1', 'preview--', 'lovable.app'];

/**
 * Extracts the company slug from the current hostname.
 * e.g. empresa1.nextprochat.com.br → "empresa1"
 * Returns null if on main domain, dev, or preview environments.
 */
export function getSubdomainSlug(): string | null {
  const hostname = window.location.hostname;

  // Skip subdomain validation in dev/preview environments
  if (DEV_HOSTS.some(h => hostname.includes(h))) {
    return null;
  }

  // Check if hostname ends with the main domain
  if (!hostname.endsWith(`.${MAIN_DOMAIN}`)) {
    return null;
  }

  // Extract subdomain
  const subdomain = hostname.replace(`.${MAIN_DOMAIN}`, '');

  // Ignore www or empty
  if (!subdomain || subdomain === 'www') {
    return null;
  }

  return subdomain;
}

/**
 * Resolves a subdomain slug to a company_id by querying the companies table.
 */
export async function resolveCompanyBySlug(slug: string): Promise<{ id: string; name: string; slug: string } | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, slug')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Validates that a user's company_id matches the expected company from the subdomain.
 */
export async function validateUserCompany(userId: string, expectedCompanyId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .single();

  if (error || !data) return false;
  return data.company_id === expectedCompanyId;
}

/**
 * Returns true if we're running in a subdomain environment (production).
 */
export function isSubdomainEnvironment(): boolean {
  return getSubdomainSlug() !== null;
}

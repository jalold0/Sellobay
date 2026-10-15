import { privateDisallowPaths } from '../lib/robots-rules';
import { siteUrl } from '../lib/site-url';

import type { MetadataRoute } from 'next';

const SITE_URL = siteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: privateDisallowPaths(),
      },
      {
        userAgent: 'GPTBot',
        disallow: '/',
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

import { type NextRequest, NextResponse } from 'next/server';

import { updateSupabaseSession } from './lib/supabase/proxy';

export default async function proxy(request: NextRequest) {
  return updateSupabaseSession(request, NextResponse.next({ request }));
}

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|icon|apple-icon|robots|sitemap|opengraph-image|twitter-image|.*\\..*).*)',
  ],
};

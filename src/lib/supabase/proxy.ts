import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

import type { Database } from '@/types/database';

export async function updateSupabaseSession(
  request: NextRequest,
  response: NextResponse,
) {
  let result = response;

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          if (!result.headers.has('location')) {
            const next = NextResponse.next({ request });
            for (const [k, v] of result.headers.entries()) {
              if (k === 'x-middleware-request-cookie') continue;
              k === 'set-cookie'
                ? next.headers.append(k, v)
                : next.headers.set(k, v);
            }
            result = next;
          }
          for (const { name, value, options } of cookiesToSet) {
            result.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  await supabase.auth.getUser();
  return result;
}

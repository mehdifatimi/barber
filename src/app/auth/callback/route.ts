import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/dashboard';

    console.log('[Auth Callback] Start exchange. Code present:', !!code);

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('[Auth Callback] Missing Supabase environment variables');
        return NextResponse.redirect(`${origin}/login?error=Configuration+Error`);
    }

    if (code) {
        try {
            const cookieStore = await cookies(); // Await cookies for Next.js 15+ / 16
            const supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                {
                    cookies: {
                        get(name: string) {
                            return cookieStore.get(name)?.value;
                        },
                        set(name: string, value: string, options: CookieOptions) {
                            cookieStore.set({ name, value, ...options });
                        },
                        remove(name: string, options: CookieOptions) {
                            cookieStore.delete({ name, ...options });
                        },
                    },
                }
            );

            const { error } = await supabase.auth.exchangeCodeForSession(code);

            if (error) {
                console.error('[Auth Callback] Session exchange error:', error.message);
                return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
            }

            console.log('[Auth Callback] Successful exchange, redirecting to:', next);

            // Ensure next starts with / to avoid double slashes or malformed URLs
            const redirectPath = next.startsWith('/') ? next : `/${next}`;
            return NextResponse.redirect(`${origin}${redirectPath}`);

        } catch (error: any) {
            console.error('[Auth Callback] Uncaught exception:', error);
            return NextResponse.redirect(`${origin}/login?error=Internal+Server+Error`);
        }
    }

    console.warn('[Auth Callback] No code provided in URL');
    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=No+authentication+code+found`);
}

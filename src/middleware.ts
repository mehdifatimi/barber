import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                },
            },
        }
    );

    // Optimized: Use getUser() which is more secure and doesn't rely solely on the browser-sent session.
    // However, to keep it fast, we check the session first.
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const url = request.nextUrl.clone();

    // Protect dashboard routes
    const isDashboardRoute = url.pathname.startsWith('/admin') ||
        url.pathname.startsWith('/barber') ||
        url.pathname.startsWith('/client/dashboard') ||
        url.pathname === '/dashboard';

    if (!user && isDashboardRoute) {
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    if (user) {
        // Fetch fresh role from DB for definitive access control
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

        const role = profile?.role || user.user_metadata?.role || 'client';

        // Handle generic /dashboard redirect
        if (url.pathname === '/dashboard') {
            if (role === 'admin') url.pathname = '/admin';
            else if (role === 'barber') url.pathname = '/barber';
            else url.pathname = '/client/dashboard';
            return NextResponse.redirect(url);
        }

        // Role-specific protection
        if (url.pathname.startsWith('/admin') && role !== 'admin') {
            url.pathname = '/unauthorized';
            return NextResponse.redirect(url);
        }

        if (url.pathname.startsWith('/barber') && role !== 'barber') {
            // Allow access to public barber profile pages (/barber/:id)
            // Block access to dashboard routes
            const pathSegments = url.pathname.split('/').filter(Boolean);
            const isProfilePage = pathSegments.length === 2 && !['dashboard', 'bookings', 'calendar', 'services', 'reviews', 'profile'].includes(pathSegments[1]);

            if (!isProfilePage) {
                url.pathname = '/unauthorized';
                return NextResponse.redirect(url);
            }
        }
    }

    return response;
}

export const config = {
    matcher: ['/admin/:path*', '/barber/:path*', '/client/dashboard/:path*', '/dashboard'],
};

'use client';

import { useAuth } from '@/components/providers/auth-provider';
import { Scissors, Shield, Star, MapPin, Calendar, Clock, LogOut, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  const { user, role, signOut, loading } = useAuth();

  const getDashboardHref = () => {
    if (role === 'admin') return '/admin';
    if (role === 'barber') return '/barber';
    return '/client/dashboard';
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Scissors className="text-primary w-8 h-8" />
            <span className="text-2xl font-bold tracking-tighter">BarberApp</span>
          </Link>
          <div className="flex gap-4 sm:gap-6 items-center font-medium">
            {!loading && (
              <>
                {user ? (
                  <>
                    <Link
                      href={getDashboardHref()}
                      className="flex items-center gap-2 hover:text-primary transition-colors font-bold"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                    <button
                      onClick={signOut}
                      className="px-4 py-2 bg-secondary text-secondary-foreground rounded-full font-bold hover:bg-secondary/80 transition-all flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="hover:text-primary transition-colors">Login</Link>
                    <Link href="/signup" className="px-5 py-2 bg-primary text-black rounded-full font-bold hover:opacity-90 transition-all">
                      Join Now
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
          <h1 className="text-6xl lg:text-8xl font-black tracking-tight leading-none">
            REDEFINE YOUR <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">STYLE</span>
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-muted-foreground">
            Connect with the best barbers in your city. Real-time booking, professional services, and a premium experience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup?role=client" className="px-8 py-4 bg-primary text-black rounded-xl font-black text-lg hover:scale-105 transition-transform">
              BOOK AN APPOINTMENT
            </Link>
            <Link href="/signup?role=barber" className="px-8 py-4 bg-transparent border-2 border-primary text-primary rounded-xl font-black text-lg hover:bg-primary/5 transition-all">
              ARE YOU A BARBER?
            </Link>
          </div>
        </div>

        {/* Decorative background elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full -z-10" />
      </section>

      {/* Features */}
      <section className="py-20 bg-card/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <MapPin className="text-primary w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold">Find Local Barbers</h3>
            <p className="text-muted-foreground">Discover top-rated barbers near you using our advanced map search.</p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Clock className="text-primary w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold">Real-time Booking</h3>
            <p className="text-muted-foreground">Check availability and book your slot instantly, no phone calls needed.</p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="text-primary w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold">Trusted Services</h3>
            <p className="text-muted-foreground">Verified reviews and secure payments through Stripe integration.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground">
          <p>© 2026 BarberApp. Precision in every cut.</p>
        </div>
      </footer>
    </div>
  );
}

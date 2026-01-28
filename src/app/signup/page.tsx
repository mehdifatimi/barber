'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState<'client' | 'barber'>('client');
    const [address, setAddress] = useState('');
    const [bio, setBio] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [storeImages, setStoreImages] = useState<FileList | null>(null);
    const [storeImageUrl, setStoreImageUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Location States
    const [cities, setCities] = useState<any[]>([]);
    const [neighborhoods, setNeighborhoods] = useState<any[]>([]);
    const [selectedCityId, setSelectedCityId] = useState('');
    const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState('');

    const supabase = createBrowserClient();
    const router = useRouter();

    // Fetch cities on mount
    useEffect(() => {
        async function fetchCities() {
            const { data } = await supabase.from('cities').select('*').order('name');
            if (data) setCities(data);
        }
        fetchCities();
    }, []);

    // Fetch neighborhoods when city changes
    useEffect(() => {
        async function fetchNeighborhoods() {
            if (!selectedCityId) {
                setNeighborhoods([]);
                return;
            }
            const { data } = await supabase
                .from('neighborhoods')
                .select('*')
                .eq('city_id', selectedCityId)
                .order('name');
            if (data) setNeighborhoods(data);
        }
        fetchNeighborhoods();
    }, [selectedCityId]);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            console.log("Attempting signup with:", { email, role, fullName });

            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        role: role,
                        // Pass metadata for barber trigger
                        address: role === 'barber' ? address : undefined,
                        bio: role === 'barber' ? bio : undefined,
                        city_id: role === 'barber' ? selectedCityId : undefined,
                        neighborhood_id: role === 'barber' ? selectedNeighborhoodId : undefined,
                    },
                },
            });

            if (signUpError) {
                console.error("Supabase signup error:", signUpError);
                setError(signUpError.message);
                setLoading(false);
                return;
            }

            if (data?.user) {
                console.log("User created successfully:", data.user.id);

                // If session is active (no email confirm), try uploads
                if (data.session && role === 'barber') {
                    try {
                        // 1. Upload Avatar
                        if (avatarFile) {
                            const fileExt = avatarFile.name.split('.').pop();
                            const fileName = `${data.user.id}/avatar.${fileExt}`;
                            const { error: uploadError } = await supabase.storage
                                .from('avatars')
                                .upload(fileName, avatarFile, { upsert: true });

                            if (!uploadError) {
                                const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
                                await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', data.user.id);
                            }
                        } else if (avatarUrl) {
                            // Use provided URL if no file
                            await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', data.user.id);
                        }

                        // 2. Upload Store Images
                        if (storeImages) {
                            for (let i = 0; i < storeImages.length; i++) {
                                const file = storeImages[i];
                                const fileExt = file.name.split('.').pop();
                                const fileName = `${data.user.id}/store_${Date.now()}_${i}.${fileExt}`;
                                const { error: galleryUploadError } = await supabase.storage
                                    .from('gallery')
                                    .upload(fileName, file);

                                if (!galleryUploadError) {
                                    const { data: { publicUrl } } = supabase.storage.from('gallery').getPublicUrl(fileName);
                                    await supabase.from('gallery').insert({
                                        barber_id: data.user.id,
                                        image_url: publicUrl,
                                        title: 'Store Image'
                                    });
                                }
                            }
                        }

                        // 3. Insert Store Image URL if provided
                        if (storeImageUrl) {
                            await supabase.from('gallery').insert({
                                barber_id: data.user.id,
                                image_url: storeImageUrl,
                                title: 'Store Image (URL)'
                            });
                        }
                    } catch (uploadErr) {
                        console.error("Error uploading initial files:", uploadErr);
                        // Continue to success message even if upload fails
                    }
                }

                // Use router.push, but wrap in try-catch or ensure it runs
                try {
                    router.push('/login?message=Check your email to confirm your account');
                } catch (navError) {
                    console.error("Navigation error, falling back to window.location:", navError);
                    window.location.href = '/login?message=Check your email to confirm your account';
                }
            } else {
                console.warn("Signup successful but no user returned (perhaps rate limited or check email settings)");
                // Even if no user immediately (e.g. email confirmation required but strict?), usually we get a user.
                // If we are here, we should probably stop loading or redirect.
                // Proceed to login anyway as instructions usually go to email.
                router.push('/login?message=Check your email to confirm your account');
            }
        } catch (err: any) {
            console.error("Unexpected error during signup:", err);
            setError(err.message || "An unexpected error occurred. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background py-10">
            <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-xl border border-border shadow-2xl">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-foreground">Create Account</h1>
                    <p className="text-muted-foreground text-sm">Join the best barber network</p>
                </div>

                <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Full Name</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="John Doe"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="name@example.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Register as</label>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setRole('client')}
                                className={`flex-1 py-2 rounded-lg border transition-all ${role === 'client' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                            >
                                Client
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('barber')}
                                className={`flex-1 py-2 rounded-lg border transition-all ${role === 'barber' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                            >
                                Barber
                            </button>
                        </div>
                    </div>

                    {/* Barber Specific Fields */}
                    {role === 'barber' && (
                        <div className="space-y-4 pt-2 border-t border-border animate-in fade-in slide-in-from-top-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Profile Picture</label>
                                <div className="space-y-2">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                                        className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                    />
                                    <div className="relative flex items-center">
                                        <div className="flex-grow border-t border-border"></div>
                                        <span className="flex-shrink-0 mx-2 text-xs text-muted-foreground">OR</span>
                                        <div className="flex-grow border-t border-border"></div>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Paste image URL..."
                                        value={avatarUrl}
                                        onChange={(e) => setAvatarUrl(e.target.value)}
                                        className="w-full px-4 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">City</label>
                                    <select
                                        value={selectedCityId}
                                        onChange={(e) => {
                                            setSelectedCityId(e.target.value);
                                            setSelectedNeighborhoodId('');
                                        }}
                                        required={role === 'barber'}
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                                    >
                                        <option value="">Select City</option>
                                        {cities.map(city => (
                                            <option key={city.id} value={city.id}>{city.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Neighborhood (Cartier)</label>
                                    <select
                                        value={selectedNeighborhoodId}
                                        onChange={(e) => setSelectedNeighborhoodId(e.target.value)}
                                        required={role === 'barber'}
                                        disabled={!selectedCityId}
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary appearance-none disabled:opacity-50"
                                    >
                                        <option value="">Select Neighborhood</option>
                                        {neighborhoods.map(nb => (
                                            <option key={nb.id} value={nb.id}>{nb.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Address / Location</label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    required={role === 'barber'}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="e.g. 123 Main St"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Bio / About</label>
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
                                    placeholder="Tell us about your experience..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Store Images (Optional)</label>
                                <div className="space-y-2">
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={(e) => setStoreImages(e.target.files)}
                                        className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Or paste an image URL..."
                                        value={storeImageUrl}
                                        onChange={(e) => setStoreImageUrl(e.target.value)}
                                        className="w-full px-4 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">Upload photos of your shop to attract clients.</p>
                            </div>
                        </div>
                    )}

                    {error && <p className="text-destructive text-sm font-medium">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {loading ? 'Creating account...' : 'Sign Up'}
                    </button>
                </form>

                <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <a href="/login" className="text-primary hover:underline font-medium">
                            Sign in
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

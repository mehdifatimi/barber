import { Loader2 } from 'lucide-react';

export default function Loading() {
    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center">
            <div className="relative">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />

                <div className="relative flex flex-col items-center gap-4">
                    <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-2xl">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    </div>

                    <div className="flex flex-col items-center">
                        <h2 className="text-xl font-black tracking-tighter text-foreground">
                            Barba<span className="text-primary">App</span>
                        </h2>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1 animate-pulse">
                            Loading perfection...
                        </p>
                    </div>
                </div>
            </div>

            {/* Subtle progress bar at the top */}
            <div className="fixed top-0 left-0 right-0 h-1 bg-muted overflow-hidden">
                <div className="h-full bg-primary animate-progress-loading" />
            </div>
        </div>
    );
}

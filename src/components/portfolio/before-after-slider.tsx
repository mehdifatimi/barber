'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';

interface BeforeAfterSliderProps {
    beforeImage: string;
    afterImage: string;
    title?: string;
    description?: string;
}

export default function BeforeAfterSlider({ beforeImage, afterImage, title, description }: BeforeAfterSliderProps) {
    const [sliderPos, setSliderPos] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMove = (e: React.MouseEvent | React.TouchEvent | any) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.type === 'touchmove' ? e.touches[0].clientX : e.clientX) - rect.left;
        const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSliderPos(position);
    };

    return (
        <div className="space-y-4">
            {(title || description) && (
                <div className="space-y-1">
                    {title && <h3 className="text-xl font-black tracking-tight">{title}</h3>}
                    {description && <p className="text-sm text-muted-foreground">{description}</p>}
                </div>
            )}

            <div
                ref={containerRef}
                className="relative aspect-square sm:aspect-[4/3] rounded-3xl overflow-hidden cursor-ew-resize group select-none shadow-2xl border border-border"
                onMouseMove={handleMove}
                onTouchMove={handleMove}
            >
                {/* Before Image (Bottom) */}
                <div className="absolute inset-0">
                    <img
                        src={beforeImage}
                        alt="Before"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                        Before
                    </div>
                </div>

                {/* After Image (Top, Clipped) */}
                <div
                    className="absolute inset-0"
                    style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                >
                    <img
                        src={afterImage}
                        alt="After"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 right-4 bg-primary/80 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                        After
                    </div>
                </div>

                {/* Slider Handle Divider */}
                <div
                    className="absolute inset-y-0 w-1 bg-white shadow-[0_0_15px_rgba(0,0,0,0.5)] z-10"
                    style={{ left: `${sliderPos}%` }}
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-2xl flex items-center justify-center border-4 border-primary transition-transform group-hover:scale-110">
                        <div className="flex gap-1">
                            <div className="w-1 h-3 bg-primary rounded-full" />
                            <div className="w-1 h-3 bg-primary rounded-full" />
                        </div>
                    </div>
                </div>

                {/* Overlay hint on hover */}
                <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs font-medium text-center italic">Drag the slider to see the transformation</p>
                </div>
            </div>
        </div>
    );
}

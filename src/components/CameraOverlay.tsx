
import React from 'react';

interface CameraOverlayProps {
    mode: 'nutrition' | 'scan' | 'compare';
    scansRemaining: number;
    currentShot: number;
    maxShots: number;
}

export const CameraOverlay: React.FC<CameraOverlayProps> = ({
    mode,
    scansRemaining,
    currentShot,
    maxShots
}) => {
    return (
        <>
            <div className="absolute inset-0 camera-overlay pointer-events-none"></div>

            <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="w-full aspect-[4/5] scan-frame rounded-2xl border-2 border-primary/50 relative">
                    <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl"></div>
                    <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl"></div>
                    <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl"></div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl"></div>

                    {/* Scan Line Animation */}
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-primary/40 shadow-[0_0_15px_rgba(19,236,19,0.8)] scan-line"></div>
                </div>
            </div>

            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start">
                <button className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white pointer-events-auto">
                    <span className="material-icons-round">close</span>
                </button>

                <div className="bg-black/40 backdrop-blur-lg px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                    <span className="material-icons-round text-primary text-sm">energy_savings_leaf</span>
                    <span className="text-xs font-medium text-white tracking-wide uppercase">{scansRemaining} free scans remaining</span>
                </div>

                <button className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white pointer-events-auto">
                    <span className="material-icons-round">flash_on</span>
                </button>
            </div>

            <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-3">
                <div className="flex gap-2">
                    {[...Array(maxShots)].map((_, i) => (
                        <div
                            key={i}
                            className={`w-8 h-1 rounded-full ${i < currentShot ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-white/30 backdrop-blur-sm'}`}
                        ></div>
                    ))}
                </div>
                <div className="bg-primary/20 backdrop-blur-md border border-primary/40 px-3 py-1 rounded-full">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-[0.1em]">
                        {mode === 'compare' ? 'Multi-shot Mode' : 'Instant Scan'} ({currentShot}/{maxShots})
                    </p>
                </div>
            </div>
        </>
    );
};

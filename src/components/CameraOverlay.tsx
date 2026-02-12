
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
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
            {/* Top Bar */}
            <div className="flex justify-between items-start">
                <button className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white pointer-events-auto">
                    <span className="material-icons-round">close</span>
                </button>

                <div className="bg-black/40 backdrop-blur-lg px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                    <span className="material-icons-round text-primary text-sm" style={{ color: '#13ec13' }}>energy_savings_leaf</span>
                    <span className="text-xs font-medium text-white tracking-wide uppercase">{scansRemaining} free scans remaining</span>
                </div>

                <button className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white pointer-events-auto">
                    <span className="material-icons-round">flash_on</span>
                </button>
            </div>

            {/* Center Scan Frame */}
            <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="w-full aspect-[4/5] rounded-2xl border-2 border-primary/50 relative" style={{ borderColor: 'rgba(19, 236, 19, 0.5)' }}>
                    <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 rounded-tl-xl" style={{ borderColor: '#13ec13' }}></div>
                    <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 rounded-tr-xl" style={{ borderColor: '#13ec13' }}></div>
                    <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 rounded-bl-xl" style={{ borderColor: '#13ec13' }}></div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 rounded-br-xl" style={{ borderColor: '#13ec13' }}></div>

                    {/* Scan Line Animation (CSS would handle actual animation) */}
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-primary/40 shadow-[0_0_15px_rgba(19,236,19,0.8)]" style={{ backgroundColor: 'rgba(19, 236, 19, 0.4)' }}></div>
                </div>
            </div>

            {/* Bottom Multi-shot Indicator */}
            <div className="flex flex-col items-center gap-3 mt-auto mb-10">
                <div className="flex gap-2">
                    {[...Array(maxShots)].map((_, i) => (
                        <div
                            key={i}
                            className={`w-8 h-1 rounded-full ${i < currentShot ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-white/30 backdrop-blur-sm'}`}
                            style={{ backgroundColor: i < currentShot ? '#13ec13' : 'rgba(255, 255, 255, 0.3)' }}
                        ></div>
                    ))}
                </div>
                <div className="bg-primary/20 backdrop-blur-md border border-primary/40 px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(19, 236, 19, 0.2)', borderColor: 'rgba(19, 236, 19, 0.4)' }}>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-[0.1em]" style={{ color: '#13ec13' }}>Multi-shot Mode ({currentShot}/{maxShots})</p>
                </div>
            </div>
        </div>
    );
};

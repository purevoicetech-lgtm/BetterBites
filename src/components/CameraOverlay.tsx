
import React from 'react';

interface CameraOverlayProps {
    mode: 'nutrition' | 'scan' | 'compare';
    scansRemaining: number;
    currentShot: number;
    maxShots: number;
    shots: string[];
    onRemoveShot: (index: number) => void;
    onAnalyze: () => void;
    onClose: () => void;
    onToggleFlash: () => void;
}

export const CameraOverlay: React.FC<CameraOverlayProps> = ({
    mode,
    scansRemaining,
    currentShot,
    maxShots,
    shots,
    onRemoveShot,
    onAnalyze,
    onClose,
    onToggleFlash
}) => {
    return (
        <>
            {/* Background overlay gradient */}
            <div className="absolute inset-0 camera-overlay pointer-events-none z-0"></div>

            {/* Central Scan Frame */}
            <div className="absolute inset-0 flex items-center justify-center p-8 z-10">
                <div className="w-full aspect-[4/5] scan-frame rounded-2xl border-2 border-primary/50 relative">
                    <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl"></div>
                    <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl"></div>
                    <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl"></div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl"></div>

                    {/* Scan Line Animation */}
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-primary/40 shadow-[0_0_15px_rgba(19,236,19,0.8)] scan-line"></div>
                </div>
            </div>

            {/* Top Navigation */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20">
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white pointer-events-auto active:scale-95 transition-transform">
                    <span className="material-icons-round">close</span>
                </button>

                <div className="bg-black/40 backdrop-blur-lg px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                    <span className="material-icons-round text-primary text-sm">energy_savings_leaf</span>
                    <span className="text-xs font-medium text-white tracking-wide uppercase">{scansRemaining} free scans remaining</span>
                </div>

                <button onClick={onToggleFlash} className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white pointer-events-auto active:scale-95 transition-transform">
                    <span className="material-icons-round">flash_on</span>
                </button>
            </div>

            {/* Bottom Multi-shot Content */}
            <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-3 z-20 px-6">
                {mode === 'compare' && shots.length > 0 ? (
                    <div className="w-full bg-[#fdfbf7]/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-white/20 pointer-events-auto animate-in">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-primary uppercase tracking-widest">Comparison Tray</span>
                            <span className="text-[10px] font-medium text-slate-400">{shots.length} / {maxShots} items</span>
                        </div>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 items-center">
                            {shots.map((shot, i) => (
                                <div key={i} className="relative flex-shrink-0">
                                    <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-primary/40 bg-white">
                                        <img src={shot} className="w-full h-full object-cover" alt="Scan item" />
                                    </div>
                                    <button
                                        onClick={() => onRemoveShot(i)}
                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white border-2 border-[#fdfbf7] dark:border-slate-900"
                                    >
                                        <span className="material-icons text-[12px]">close</span>
                                    </button>
                                </div>
                            ))}
                            {shots.length < maxShots && (
                                <div className="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400">
                                    <span className="material-icons text-lg">add</span>
                                </div>
                            )}
                            <div className="flex-grow pl-2 flex items-center">
                                <button
                                    onClick={onAnalyze}
                                    className="bg-primary text-black font-bold text-xs px-4 py-3 rounded-xl flex items-center gap-2 whitespace-nowrap shadow-lg shadow-primary/20 active:scale-95 transition-transform"
                                >
                                    ANALYZE
                                    <span className="material-icons text-sm">analytics</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex gap-2">
                            {[...Array(maxShots)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-8 h-1 rounded-full ${i < currentShot ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-white/30 backdrop-blur-sm'}`}
                                ></div>
                            ))}
                        </div>
                        <div className="bg-primary/20 backdrop-blur-md border border-primary/40 px-3 py-1 rounded-full text-center min-w-[140px]">
                            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.1em]">
                                {mode === 'compare' ? `Multi-shot Mode (${currentShot}/${maxShots})` : 'Instant Label Scan'}
                            </p>
                        </div>
                    </>
                )}
            </div>
        </>
    );
};

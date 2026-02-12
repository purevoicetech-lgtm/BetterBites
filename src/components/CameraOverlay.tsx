
import React from 'react';

interface CameraOverlayProps {
    mode: 'nutrition' | 'scan' | 'compare';
    scansRemaining: number;
    currentShot: number;
    maxShots: number;
    shots: string[];
    onRemoveShot: (index: number) => void;
    onAnalyze: () => void;
}

export const CameraOverlay: React.FC<CameraOverlayProps> = ({
    mode,
    scansRemaining,
    currentShot,
    maxShots,
    shots,
    onRemoveShot,
    onAnalyze
}) => {
    return (
        <>
            <div className="absolute inset-0 camera-overlay pointer-events-none"></div>

            {/* Scanning Reticle */}
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

            {/* Navigation Bars */}
            <div className="absolute top-0 left-0 right-0 p-6 pt-12 flex justify-between items-start z-20">
                <button className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white pointer-events-auto">
                    <span className="material-icons-round">close</span>
                </button>

                <div className="bg-black/40 backdrop-blur-lg px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(19,236,19,0.8)]"></div>
                    <span className="text-xs font-semibold text-white uppercase tracking-wider">{scansRemaining} scans left</span>
                </div>

                <button className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white pointer-events-auto">
                    <span className="material-icons-round">flash_on</span>
                </button>
            </div>

            {/* Comparison Tray / Multi-shot Status */}
            <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-4 z-20 px-4">
                {mode === 'compare' && shots.length > 0 && (
                    <div className="w-full bg-[#fdfbf7]/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-white/20 pointer-events-auto">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Comparison Tray</span>
                            <span className="text-[10px] font-medium text-slate-400">{shots.length} / {maxShots} items</span>
                        </div>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 items-center">
                            {shots.map((shot, i) => (
                                <div key={i} className="relative flex-shrink-0">
                                    <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-primary/40 bg-white">
                                        <img src={shot} className="w-full h-full object-cover" alt={`Shot ${i + 1}`} />
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
                            {shots.length >= 1 && (
                                <div className="flex-grow pl-2 flex items-center">
                                    <button
                                        onClick={onAnalyze}
                                        className="bg-primary text-black font-bold text-xs px-4 py-3 rounded-xl flex items-center gap-2 whitespace-nowrap shadow-lg shadow-primary/20"
                                    >
                                        ANALYZE
                                        <span className="material-icons text-sm">analytics</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {mode !== 'compare' && (
                    <>
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
                                {mode === 'nutrition' ? 'Nutrition Insight' : 'Instant Label Scan'}
                            </p>
                        </div>
                    </>
                )}
            </div>
        </>
    );
};

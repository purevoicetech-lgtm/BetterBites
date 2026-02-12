
import React from 'react';

interface CameraControlsProps {
    onCapture: () => void;
    onUpload: () => void;
    onHistory: () => void;
    onHelp: () => void;
    activeMode: 'nutrition' | 'scan' | 'compare';
    setMode: (mode: 'nutrition' | 'scan' | 'compare') => void;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
    onCapture,
    onUpload,
    onHistory,
    onHelp,
    activeMode,
    setMode
}) => {
    return (
        <div className="flex-1 bg-background-light dark:bg-background-dark rounded-t-3xl -mt-6 relative z-10 flex flex-col items-center justify-between py-6 px-6">
            <div className="flex items-center gap-8 mb-2">
                <button
                    onClick={() => setMode('nutrition')}
                    className={`text-sm font-semibold uppercase tracking-wider ${activeMode === 'nutrition' ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}
                >
                    Nutrition
                </button>
                <button
                    onClick={() => setMode('scan')}
                    className={`text-sm font-bold uppercase tracking-wider relative ${activeMode === 'scan' ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}
                >
                    Label Scan
                    {activeMode === 'scan' && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full"></span>}
                </button>
                <button
                    onClick={() => setMode('compare')}
                    className={`text-sm font-semibold uppercase tracking-wider ${activeMode === 'compare' ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}
                >
                    Compare
                </button>
            </div>

            <div className="w-full flex items-center justify-between px-4">
                <button onClick={onHistory} className="flex flex-col items-center gap-1 group">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 group-active:scale-95 transition-transform">
                        <span className="material-icons-round">history</span>
                    </div>
                    <span className="text-[9px] font-semibold text-slate-500 uppercase">History</span>
                </button>

                <div className="relative flex items-center gap-4">
                    <div className="relative flex items-center justify-center">
                        <div className="absolute w-24 h-24 rounded-full border-4 border-primary/20"></div>
                        <button
                            onClick={onCapture}
                            className="w-20 h-20 rounded-full bg-white dark:bg-slate-900 border-[6px] border-primary shadow-xl active:scale-90 transition-transform flex items-center justify-center z-10"
                        >
                            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="material-icons-round text-primary text-4xl">eco</span>
                            </div>
                        </button>
                    </div>

                    <button onClick={onUpload} className="flex flex-col items-center gap-1 group">
                        <div className="relative w-11 h-11 rounded-xl overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm active:scale-95 transition-transform">
                            <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                                <span className="material-icons-round text-slate-500 dark:text-slate-400 text-xl border-slate-500">file_upload</span>
                            </div>
                        </div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Upload</span>
                    </button>
                </div>

                <button onClick={onHelp} className="flex flex-col items-center gap-1 group">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 group-active:scale-95 transition-transform">
                        <span className="material-icons-round">help_outline</span>
                    </div>
                    <span className="text-[9px] font-semibold text-slate-500 uppercase text-center leading-none">Help</span>
                </button>
            </div>

            <div className="flex items-center gap-2 py-1 px-4 rounded-full bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500">
                <span className="material-icons-round text-sm">info</span>
                <p className="text-[11px] font-medium italic">Hold steady for better label recognition</p>
            </div>
        </div>
    );
};

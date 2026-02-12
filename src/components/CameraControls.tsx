
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
        <div className="flex-1 bg-white dark:bg-[#102210] rounded-t-3xl -mt-6 relative z-10 flex flex-col items-center justify-between py-6 px-6 shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
            {/* Mode Selector */}
            <div className="flex items-center gap-8 mb-2">
                <button
                    onClick={() => setMode('nutrition')}
                    className={`text-sm font-semibold uppercase tracking-wider ${activeMode === 'nutrition' ? 'text-[#13ec13]' : 'text-slate-400 dark:text-slate-500'}`}
                >
                    Nutrition
                    {activeMode === 'nutrition' && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#13ec13] rounded-full"></span>}
                </button>
                <button
                    onClick={() => setMode('scan')}
                    className={`text-sm font-bold uppercase tracking-wider relative ${activeMode === 'scan' ? 'text-[#13ec13]' : 'text-slate-400 dark:text-slate-500'}`}
                >
                    Label Scan
                    {activeMode === 'scan' && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#13ec13] rounded-full"></span>}
                </button>
                <button
                    onClick={() => setMode('compare')}
                    className={`text-sm font-semibold uppercase tracking-wider ${activeMode === 'compare' ? 'text-[#13ec13]' : 'text-slate-400 dark:text-slate-500'}`}
                >
                    Compare
                    {activeMode === 'compare' && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#13ec13] rounded-full"></span>}
                </button>
            </div>

            {/* Action Buttons */}
            <div className="w-full flex items-center justify-between px-4">
                {/* History Button */}
                <button onClick={onHistory} className="flex flex-col items-center gap-1 group">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 group-active:scale-95 transition-transform">
                        <span className="material-icons-round">history</span>
                    </div>
                    <span className="text-[9px] font-semibold text-slate-500 uppercase">History</span>
                </button>

                {/* Capture Button */}
                <div className="relative flex items-center justify-center">
                    <div className="absolute w-24 h-24 rounded-full border-4 border-[#13ec13]/20"></div>
                    <button
                        onClick={onCapture}
                        className="w-20 h-20 rounded-full bg-white dark:bg-slate-900 border-[6px] border-[#13ec13] shadow-xl active:scale-90 transition-transform flex items-center justify-center z-10"
                    >
                        <div className="w-14 h-14 rounded-full bg-[#13ec13]/10 flex items-center justify-center">
                            <span className="material-icons-round text-[#13ec13] text-4xl">eco</span>
                        </div>
                    </button>
                </div>

                {/* Upload Button */}
                <button onClick={onUpload} className="flex flex-col items-center gap-1 group">
                    <div className="relative w-11 h-11 rounded-xl overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm active:scale-95 transition-transform">
                        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                            <span className="material-icons-round text-slate-500 dark:text-slate-400 text-xl">file_upload</span>
                        </div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Upload</span>
                </button>
            </div>

            {/* Info Message */}
            <div className="flex items-center gap-2 py-1 px-4 rounded-full bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500">
                <span className="material-icons-round text-sm">info</span>
                <p className="text-[11px] font-medium italic">Hold steady for better label recognition</p>
            </div>
        </div>
    );
};

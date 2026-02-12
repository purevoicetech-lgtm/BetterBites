
import React, { useState, useEffect, useRef } from 'react';
import {
    UserTier,
    UserState,
    ScanResult,
    HealthAnalysis,
    TIER_CONFIG
} from './types';
import { APP_NAME, COLORS } from './constants';
import { supabase, uploadImage } from './services/supabaseClient';
import { analyzeProduct } from './services/geminiService';
import { CameraOverlay } from './components/CameraOverlay';
import { CameraControls } from './components/CameraControls';
import './styles/main.css';

const App: React.FC = () => {
    const [activePage, setActivePage] = useState<'camera' | 'results' | 'history' | 'pricing' | 'login'>('camera');
    const [user, setUser] = useState<UserState>({
        isLoggedIn: false,
        isPaid: false,
        tier: UserTier.FREE,
        scansRemaining: TIER_CONFIG[UserTier.FREE].scans,
        history: []
    });

    const [currentShots, setCurrentShots] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [activeMode, setActiveMode] = useState<'nutrition' | 'scan' | 'compare'>('scan');
    const [lastAnalysis, setLastAnalysis] = useState<HealthAnalysis | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUser(prev => ({ ...prev, isLoggedIn: true }));
                syncUserData(session.user.id);
            }
        };
        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                setUser(prev => ({ ...prev, isLoggedIn: true }));
                syncUserData(session.user.id);
            } else {
                setUser({
                    isLoggedIn: false,
                    isPaid: false,
                    tier: UserTier.FREE,
                    scansRemaining: TIER_CONFIG[UserTier.FREE].scans,
                    history: []
                });
                setActivePage('login');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const syncUserData = async (userId: string) => {
        const { data: profile } = await supabase
            .from('profiles')
            .select('tier, scans_remaining, is_paid')
            .eq('id', userId)
            .single();

        if (profile) {
            setUser(prev => ({
                ...prev,
                tier: profile.tier as UserTier,
                scansRemaining: profile.scans_remaining,
                isPaid: profile.is_paid
            }));
        }
    };

    const handleCapture = async () => {
        // In a real app, this would use the MediaDevices API. 
        // For this implementation, we'll trigger the file uploader to simulate "capture"
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = reader.result as string;
            const newShots = [...currentShots, base64];
            setCurrentShots(newShots);

            if (newShots.length >= (activeMode === 'compare' ? 3 : 1)) {
                await processAnalysis(newShots);
            }
        };
        reader.readAsDataURL(file);
    };

    const processAnalysis = async (shots: string[]) => {
        if (user.scansRemaining <= 0) {
            setActivePage('pricing');
            return;
        }

        setIsAnalyzing(true);
        try {
            const result = await analyzeProduct(shots);
            if (result) {
                setLastAnalysis(result);

                // Update scans in Supabase
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const newScans = user.scansRemaining - 1;
                    await supabase
                        .from('profiles')
                        .update({ scans_remaining: newScans })
                        .eq('id', session.user.id);

                    setUser(prev => ({ ...prev, scansRemaining: newScans }));
                }

                setActivePage('results');
            }
        } catch (err) {
            console.error("Analysis failed", err);
        } finally {
            setIsAnalyzing(false);
            setCurrentShots([]);
        }
    };

    return (
        <div className="h-screen w-full max-w-md mx-auto flex flex-col overflow-hidden shadow-2xl bg-black font-display">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
            />

            {activePage === 'camera' && (
                <div className="relative h-screen flex flex-col">
                    {/* Camera View Area (72%) */}
                    <div className="relative h-[72%] w-full bg-slate-900 overflow-hidden">
                        {currentShots.length > 0 ? (
                            <img src={currentShots[currentShots.length - 1]} className="w-full h-full object-cover" alt="Current shot" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500">
                                <span className="material-icons-round text-6xl">camera_alt</span>
                            </div>
                        )}

                        <CameraOverlay
                            mode={activeMode}
                            scansRemaining={user.scansRemaining}
                            currentShot={currentShots.length}
                            maxShots={activeMode === 'compare' ? 3 : 1}
                        />

                        {isAnalyzing && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white z-50">
                                <div className="w-16 h-16 border-4 border-[#13ec13] border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="font-bold text-lg">Analyzing Nutrition...</p>
                                <p className="text-sm text-slate-400">Gemini Flash is decoding ingredients</p>
                            </div>
                        )}
                    </div>

                    {/* Controls Area (28%) */}
                    <CameraControls
                        activeMode={activeMode}
                        setMode={setActiveMode}
                        onCapture={handleCapture}
                        onUpload={() => fileInputRef.current?.click()}
                        onHistory={() => setActivePage('history')}
                        onHelp={() => console.log('Help clicked')}
                    />
                </div>
            )}

            {activePage === 'results' && lastAnalysis && (
                <div className="flex-1 bg-[#f6f8f6] dark:bg-[#102210] overflow-y-auto p-6 animate-in slide-in-from-bottom duration-500">
                    {/* Results Implementation here */}
                    <div className="flex justify-between items-center mb-8">
                        <button onClick={() => setActivePage('camera')} className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                            <span className="material-icons-round">arrow_back</span>
                        </button>
                        <h2 className="text-xl font-bold font-display uppercase tracking-wider">Analysis</h2>
                        <div className="w-10"></div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl mb-6">
                        <div className="flex flex-col items-center mb-6">
                            <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                                <svg className="w-full h-full rotate-[-90deg]">
                                    <circle cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-800" />
                                    <circle cx="64" cy="64" r="58" fill="transparent" stroke="#13ec13" strokeWidth="8" strokeDasharray={364.4} strokeDashoffset={364.4 * (1 - lastAnalysis.score / 100)} strokeLinecap="round" />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl font-bold">{lastAnalysis.score}</span>
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Score</span>
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-center">{lastAnalysis.productName}</h3>
                            <p className="text-sm text-slate-500 text-center mt-2 px-4">{lastAnalysis.explanation}</p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#13ec13] mb-3">The Good (Pros)</h4>
                                <div className="flex flex-wrap gap-2">
                                    {lastAnalysis.pros.map((pro, i) => (
                                        <span key={i} className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-medium">✓ {pro}</span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-3">The Bad (Cons)</h4>
                                <div className="flex flex-wrap gap-2">
                                    {lastAnalysis.cons.map((con, i) => (
                                        <span key={i} className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-1 rounded-full text-xs font-medium">✕ {con}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setActivePage('camera')}
                        className="w-full bg-[#13ec13] text-black font-bold py-5 rounded-2xl shadow-xl active:scale-95 transition-transform"
                    >
                        Scan Another
                    </button>
                </div>
            )}

            {/* Other pages (Login, Pricing, History) would be implemented similarly */}
            {activePage === 'login' && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white dark:bg-[#102210]">
                    <div className="w-20 h-20 bg-[#13ec13] rounded-3xl flex items-center justify-center mb-8 shadow-xl">
                        <span className="material-icons-round text-white text-4xl">eco</span>
                    </div>
                    <h1 className="text-3xl font-bold mb-2">{APP_NAME}</h1>
                    <p className="text-slate-500 mb-12 text-center">Your Personal AI Grocery Assistant</p>
                    <button
                        onClick={() => setActivePage('camera')}
                        className="w-full bg-black dark:bg-slate-800 text-white font-bold py-5 rounded-2xl mb-4"
                    >
                        Login with Email
                    </button>
                    <button className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Create Account</button>
                </div>
            )}
        </div>
    );
};

export default App;

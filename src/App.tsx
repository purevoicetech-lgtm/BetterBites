
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
                <div className="flex-1 bg-background-light dark:bg-background-dark font-display text-slate-800 dark:text-slate-100 min-h-screen pb-32 overflow-y-auto">
                    {/* Navigation Bar */}
                    <nav className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
                        <button
                            onClick={() => setActivePage('camera')}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm"
                        >
                            <span className="material-icons-round text-slate-600 dark:text-slate-300">arrow_back_ios_new</span>
                        </button>
                        <h1 className="text-lg font-semibold tracking-tight">Analysis</h1>
                        <button
                            onClick={() => setActivePage('camera')}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/20"
                        >
                            <span className="material-icons-round">qr_code_scanner</span>
                        </button>
                    </nav>

                    <main className="px-4 py-6">
                        {/* Header Section */}
                        <div className="mb-8 px-2">
                            <h2 className="text-2xl font-bold leading-tight">Your Grocery Analysis</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Successfully analyzed {lastAnalysis.productName}</p>
                        </div>

                        {/* Product Card */}
                        <div className="relative bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border-2 border-primary/40 flex flex-col h-full mb-8">
                            {/* Healthiest Choice Badge */}
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold uppercase tracking-widest py-1 px-3 rounded-full flex items-center gap-1 shadow-lg shadow-primary/30">
                                <span className="material-icons-round text-xs">eco</span>
                                Analyzed Result
                            </div>

                            <div className="text-center mb-4 mt-2">
                                <h3 className="font-bold text-lg leading-tight line-clamp-2">{lastAnalysis.productName}</h3>
                                <p className="text-[10px] text-slate-400 uppercase tracking-tighter mt-1">Processed by Gemini Flash</p>
                            </div>

                            {/* Health Score Gauge */}
                            <div className="flex flex-col items-center justify-center mb-6">
                                <div className="relative w-24 h-24 flex items-center justify-center">
                                    <svg className="w-full h-full -rotate-90">
                                        <circle className="text-slate-100 dark:text-slate-800" cx="48" cy="48" fill="transparent" r="42" stroke="currentColor" strokeWidth="8"></circle>
                                        <circle className="text-primary" cx="48" cy="48" fill="transparent" r="42" stroke="currentColor" strokeDasharray="263.89" strokeDashoffset={263.89 * (1 - lastAnalysis.score / 100)} strokeWidth="8" strokeLinecap="round"></circle>
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-3xl font-bold">{lastAnalysis.score}</span>
                                    </div>
                                </div>
                                <span className="text-xs font-medium text-primary mt-2">
                                    {lastAnalysis.score >= 80 ? 'Excellent' : lastAnalysis.score >= 60 ? 'Good' : 'Moderate'}
                                </span>
                            </div>

                            {/* Pros & Cons */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary">The Good</h4>
                                    {lastAnalysis.pros.map((pro, i) => (
                                        <div key={i} className="flex items-start gap-2">
                                            <span className="material-icons-round text-primary text-sm mt-0.5">check_circle</span>
                                            <span className="text-xs leading-tight font-medium">{pro}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-rose-500">To Watch Out For</h4>
                                    {lastAnalysis.cons.map((con, i) => (
                                        <div key={i} className="flex items-start gap-2">
                                            <span className="material-icons-round text-rose-500 text-sm mt-0.5">warning</span>
                                            <span className="text-xs leading-tight font-medium">{con}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Summary Insight Card */}
                        <div className="bg-primary/10 dark:bg-primary/5 rounded-xl p-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white flex-shrink-0">
                                <span className="material-icons-round">lightbulb</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-sm">Dietary Insight</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                                    {lastAnalysis.explanation}
                                </p>
                            </div>
                        </div>
                    </main>

                    {/* Sticky Subscription Prompt */}
                    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/95 dark:via-background-dark/95 to-transparent">
                        <div className="bg-white dark:bg-slate-900 border border-primary/20 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4">
                            <div className="flex-grow">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-xs font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase">Pro</span>
                                    <span className="text-sm font-bold">Go Unlimited</span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">Unlock detailed breakdowns for every scan</p>
                            </div>
                            <button
                                onClick={() => setActivePage('pricing')}
                                className="bg-primary hover:bg-primary/90 text-white font-bold text-xs py-3 px-6 rounded-xl transition-all shadow-lg shadow-primary/20 whitespace-nowrap"
                            >
                                Unlock Now
                            </button>
                        </div>
                    </div>
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

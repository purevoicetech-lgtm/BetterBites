
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
    const [isCapturing, setIsCapturing] = useState(false);
    const [showShutter, setShowShutter] = useState(false);
    const [activeMode, setActiveMode] = useState<'nutrition' | 'scan' | 'compare'>('scan');
    const [lastAnalysis, setLastAnalysis] = useState<HealthAnalysis | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    // Auth Effects
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

    // Camera Management
    useEffect(() => {
        if (activePage === 'camera') {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [activePage]);

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

    const startCamera = async () => {
        setCameraError(null);

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setCameraError("Your browser does not support camera access.");
            return;
        }

        try {
            // First attempt: High resolution back camera
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { exact: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            }).catch(async () => {
                // Second attempt: Fallback to any back camera
                console.warn("Exact environment camera failed, falling back to any video device.");
                return await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' },
                    audio: false
                });
            }).catch(async () => {
                // Third attempt: Minimalist constraints
                console.warn("Back camera failed, trying simplest constraints.");
                return await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false
                });
            });

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                // Force play to ensure mobile browsers start the stream
                try {
                    await videoRef.current.play();
                } catch (playErr) {
                    console.error("Video play failed:", playErr);
                }
            }
            setStream(mediaStream);
        } catch (err: any) {
            console.error("All camera attempts failed:", err);
            const errorMsg = err.name === 'NotAllowedError' ?
                "Camera permission was denied. Please check your browser settings." :
                `Camera Error: ${err.message || "Could not access camera"}`;
            setCameraError(errorMsg);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const handleCapture = async () => {
        if (isCapturing || isAnalyzing || !videoRef.current || !canvasRef.current) {
            console.warn("Capture blocked:", { isCapturing, isAnalyzing, video: !!videoRef.current, canvas: !!canvasRef.current });
            return;
        }

        setIsCapturing(true);
        setShowShutter(true);
        setTimeout(() => setShowShutter(false), 150);

        try {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            // Wait for video to be ready
            if (video.readyState < 2) {
                console.warn("Video not ready for capture");
                setIsCapturing(false);
                return;
            }

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const base64 = canvas.toDataURL('image/jpeg', 0.85);

                // Add to shots and then decide if we analyze
                const updatedShots = [...currentShots, base64];
                setCurrentShots(updatedShots);

                if (activeMode !== 'compare') {
                    await processAnalysis(updatedShots);
                }
            }
        } catch (e: any) {
            console.error("Capture failure:", e);
            setCameraError(`Capture Failed: ${e.message}`);
        } finally {
            setIsCapturing(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = reader.result as string;
            const updatedShots = [...currentShots, base64];
            setCurrentShots(updatedShots);

            if (activeMode !== 'compare') {
                await processAnalysis(updatedShots);
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

    const handleRemoveShot = (index: number) => {
        setCurrentShots(prev => prev.filter((_, i) => i !== index));
    };

    const handleAnalyzeFromOverlay = async () => {
        if (currentShots.length > 0) {
            await processAnalysis(currentShots);
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
            <canvas ref={canvasRef} className="hidden" />

            {activePage === 'camera' && (
                <div className="relative h-screen flex flex-col">
                    {/* Camera View Area (72%) */}
                    <div className="relative h-[72%] w-full bg-slate-900 overflow-hidden">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />

                        {/* Shutter Flash Effect */}
                        {showShutter && (
                            <div className="absolute inset-0 bg-white z-50 animate-pulse"></div>
                        )}

                        {(cameraError || !stream) && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 shadow-inner text-slate-400 p-8 text-center z-40">
                                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-slate-700">
                                    <span className="material-icons-round text-4xl text-slate-500">
                                        {cameraError?.includes('permission') ? 'block' : 'videocam_off'}
                                    </span>
                                </div>

                                <h3 className="text-white font-bold mb-2">Camera Access Required</h3>
                                <p className="text-xs text-slate-500 mb-8 max-w-[240px] leading-relaxed">
                                    {cameraError || "Adjusting lenses or waiting for permission. BetterBite needs camera access to scan products."}
                                </p>

                                <div className="space-y-3 w-full max-w-[200px]">
                                    <button
                                        onClick={() => startCamera()}
                                        className="w-full py-3 bg-primary text-black font-bold rounded-xl text-xs shadow-lg shadow-primary/20 active:scale-95 transition-transform"
                                    >
                                        RETRY CAMERA
                                    </button>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-700 transition-colors"
                                    >
                                        UPLOAD PHOTO
                                    </button>
                                </div>

                                <div className="mt-8 flex items-center gap-2 text-[10px] text-slate-600 font-medium tracking-tight">
                                    <span className="material-icons-round text-sm">lock</span>
                                    SECURE HTTPS CONNECTION
                                </div>
                            </div>
                        )}

                        <CameraOverlay
                            mode={activeMode}
                            scansRemaining={user.scansRemaining}
                            currentShot={currentShots.length}
                            maxShots={activeMode === 'compare' ? 3 : 1}
                            shots={currentShots}
                            onRemoveShot={handleRemoveShot}
                            onAnalyze={handleAnalyzeFromOverlay}
                            onClose={() => setActivePage('login')}
                            onToggleFlash={() => console.log('Flash toggle - Not supported on most web browsers')}
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
                <div className="flex-1 bg-background-light dark:bg-background-dark font-display text-slate-800 dark:text-slate-100 min-h-screen pb-32 overflow-y-auto animate-in">
                    {/* Top Bar */}
                    <nav className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                        <button
                            onClick={() => setActivePage('camera')}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm"
                        >
                            <span className="material-icons-round text-slate-500">arrow_back_ios_new</span>
                        </button>
                        <h1 className="text-lg font-bold tracking-tight">Health Analysis</h1>
                        <div className="w-10"></div>
                    </nav>

                    <main className="px-5 py-8">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold leading-tight">Grocery Analysis</h2>
                            <p className="text-slate-500 text-sm mt-1">Found healthiest option and insights</p>
                        </div>

                        {/* Product Result Card */}
                        <div className="relative bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-xl border-2 border-primary/20 mb-8 overflow-hidden">
                            {/* Leaf Pattern Background (Subtle) */}
                            <div className="absolute top-0 right-0 opacity-[0.03] pointer-events-none">
                                <span className="material-icons-round text-[150px] text-primary">eco</span>
                            </div>

                            {/* Healthiest Choice Badge */}
                            <div className="absolute top-0 right-0 bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-bl-2xl flex items-center gap-1">
                                <span className="material-icons-round text-xs">verified</span>
                                High Score
                            </div>

                            <div className="text-center mb-6">
                                <h3 className="font-bold text-xl leading-snug px-4">{lastAnalysis.productName}</h3>
                                <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] mt-2">Analysis by Gemini Flash</p>
                            </div>

                            {/* Score Gauge */}
                            <div className="flex flex-col items-center justify-center mb-8">
                                <div className="relative w-36 h-36 flex items-center justify-center">
                                    <svg className="w-full h-full -rotate-90">
                                        <circle className="text-slate-100 dark:text-slate-800" cx="72" cy="72" fill="transparent" r="64" stroke="currentColor" strokeWidth="12"></circle>
                                        <circle className="text-primary transition-all duration-1000 ease-out" cx="72" cy="72" fill="transparent" r="64" stroke="currentColor" strokeDasharray="402.12" strokeDashoffset={402.12 * (1 - lastAnalysis.score / 100)} strokeWidth="12" strokeLinecap="round"></circle>
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-5xl font-bold tracking-tighter">{lastAnalysis.score}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Score</span>
                                    </div>
                                </div>
                                <div className="mt-4 px-4 py-1.5 bg-primary/10 rounded-full">
                                    <p className="text-xs font-bold text-primary uppercase tracking-widest">
                                        {lastAnalysis.score >= 80 ? 'Excellent Choice' : lastAnalysis.score >= 60 ? 'Good Choice' : 'Consume Moderately'}
                                    </p>
                                </div>
                            </div>

                            {/* Analysis Lists */}
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-3">Key Benefits</h4>
                                    <div className="space-y-3">
                                        {lastAnalysis.pros.map((pro, i) => (
                                            <div key={i} className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                                <span className="material-icons-round text-primary text-xl">check_circle</span>
                                                <span className="text-xs font-medium leading-tight">{pro}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-rose-500 mb-3">Health Considerations</h4>
                                    <div className="space-y-3">
                                        {lastAnalysis.cons.map((con, i) => (
                                            <div key={i} className="flex items-start gap-3 bg-rose-50/50 dark:bg-rose-900/10 p-3 rounded-xl border border-rose-100/50 dark:border-rose-900/20">
                                                <span className="material-icons-round text-rose-400 text-xl">report_problem</span>
                                                <span className="text-xs font-medium leading-tight">{con}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* AI Insight Card */}
                        <div className="bg-primary/5 dark:bg-primary/10 rounded-[2rem] p-6 border border-primary/10 flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-primary/20">
                                <span className="material-icons-round">psychology</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-sm mb-1 uppercase tracking-tight">AI Nutrition Insight</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {lastAnalysis.explanation}
                                </p>
                            </div>
                        </div>

                        {/* Scan Another Button */}
                        <button
                            onClick={() => setActivePage('camera')}
                            className="w-full mt-8 bg-primary hover:bg-primary/90 text-white font-bold py-5 rounded-2xl shadow-xl shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-icons-round">qr_code_scanner</span>
                            SCAN ANOTHER PRODUCT
                        </button>
                    </main>
                </div>
            )}

            {activePage === 'pricing' && (
                <div className="relative flex-1 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 antialiased overflow-hidden flex flex-col font-display">
                    <div className="absolute top-0 right-0 opacity-[0.05] pointer-events-none">
                        <span className="material-icons-round text-[300px] text-primary">spa</span>
                    </div>

                    <div className="relative z-10 p-6 pt-12 flex items-center justify-between">
                        <button
                            onClick={() => setActivePage('camera')}
                            className="w-10 h-10 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md flex items-center justify-center shadow-sm"
                        >
                            <span className="material-icons-round text-slate-400">close</span>
                        </button>
                        <div className="flex-1 text-center pr-10">
                            <h1 className="text-xl font-bold">Go Pro</h1>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 pb-24 relative z-10">
                        <div className="text-center mb-10">
                            <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                                <span className="material-icons-round text-primary text-6xl">auto_awesome</span>
                            </div>
                            <h2 className="text-3xl font-bold mb-3 tracking-tight">Elevate Your Health</h2>
                            <p className="text-slate-500 text-sm max-w-[240px] mx-auto">Unlock the full power of AI label scanning and take control of your nutrition.</p>
                        </div>

                        <div className="space-y-4 mb-10">
                            {[
                                { icon: 'qr_code_scanner', title: 'Unlimited Scans', desc: 'Scan every product in your cart without limits.' },
                                { icon: 'psychology', title: 'Deep AI Analysis', desc: 'Detailed ingredient safety and nutritional breakdowns.' },
                                { icon: 'block', title: 'Ad-Free Experience', desc: 'A clean, distraction-free scanning journey.' }
                            ].map((benefit, i) => (
                                <div key={i} className="flex items-center gap-4 p-5 rounded-3xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white dark:border-slate-800 shadow-sm">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <span className="material-icons-round text-2xl">{benefit.icon}</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{benefit.title}</h4>
                                        <p className="text-[11px] text-slate-500 mt-0.5">{benefit.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-4">
                            <div className="relative p-6 rounded-[2rem] border-2 border-primary bg-primary/5 ring-4 ring-primary/5 shadow-xl transition-all">
                                <div className="absolute -top-3 right-6 bg-primary text-white text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-primary/20">
                                    Best Value
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center">
                                            <div className="w-3 h-3 rounded-full bg-primary"></div>
                                        </div>
                                        <div>
                                            <p className="font-bold text-lg">Yearly Plan</p>
                                            <p className="text-xs text-primary font-bold">Save 40% annually</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-xl">$39.99</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">/ year</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="w-6 h-6 rounded-full border-2 border-slate-200"></div>
                                        <div>
                                            <p className="font-bold text-lg">Monthly Plan</p>
                                            <p className="text-xs text-slate-500">Cancel anytime</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-xl">$5.99</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">/ month</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/95 dark:via-background-dark/95 to-transparent p-6 pt-12 pb-10 z-20">
                        <button className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-5 rounded-[1.5rem] shadow-xl shadow-primary/20 active:scale-[0.98] transition-all mb-6">
                            SUBSCRIBE NOW
                        </button>
                        <div className="flex flex-col items-center gap-3">
                            <button className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] hover:text-slate-600 transition-colors">
                                Restore Purchase
                            </button>
                            <p className="text-[9px] text-slate-400 text-center px-8 leading-normal">
                                Subscription will be charged to your account and automatically renews unless canceled 24h before period ends.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {activePage === 'login' && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background-light dark:bg-background-dark font-display relative overflow-hidden">
                    {/* Back Button */}
                    <button
                        onClick={() => setActivePage('camera')}
                        className="absolute top-12 left-8 w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center z-20"
                    >
                        <span className="material-icons-round text-slate-400">close</span>
                    </button>

                    <div className="relative z-10 w-full flex flex-col items-center">
                        <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-xl border border-primary/20 animate-bounce group">
                            <span className="material-icons-round text-primary text-5xl">eco</span>
                        </div>
                        <h1 className="text-4xl font-bold mb-3 tracking-tight">{APP_NAME}</h1>
                        <p className="text-slate-500 mb-16 text-center text-base max-w-[200px]">Your Personal AI Grocery Nutrition Assistant</p>

                        <div className="w-full space-y-4">
                            <button
                                onClick={() => setActivePage('camera')}
                                className="w-full bg-primary text-white font-bold py-5 rounded-[1.5rem] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                            >
                                <span className="material-icons-round">bolt</span>
                                CONTINUE AS GUEST
                            </button>
                            <button
                                className="w-full bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold py-5 rounded-[1.5rem] border-2 border-slate-100 dark:border-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                LOGIN WITH EMAIL
                            </button>
                        </div>
                        <button className="mt-12 text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] hover:text-primary transition-colors">
                            CREATE AN ACCOUNT
                        </button>
                    </div>

                    <div className="absolute -bottom-24 -left-24 opacity-[0.05] pointer-events-none">
                        <span className="material-icons-round text-[400px] text-primary">spa</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;

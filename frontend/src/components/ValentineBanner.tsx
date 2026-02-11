import { useState, useEffect } from 'react';
import { Heart, Sparkles, X } from 'lucide-react';
import { useThemeStore } from '@/stores/useThemeStore';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

export const ValentineBanner = () => {
    const { theme, setTheme } = useThemeStore();
    const [isVisible, setIsVisible] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const [timeLeft, setTimeLeft] = useState<{
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
        isValentines: boolean;
    } | null>(null);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const currentYear = now.getFullYear();
            let valentineDate = new Date(currentYear, 1, 14); // Month is 0-indexed: 1 = February

            // Check if it's actually Valentine's Day!
            if (now.getMonth() === 1 && now.getDate() === 14) {
                return { days: 0, hours: 0, minutes: 0, seconds: 0, isValentines: true };
            }

            if (now > valentineDate) {
                // If passed, target next year
                valentineDate = new Date(currentYear + 1, 1, 14);
            }

            const difference = +valentineDate - +now;

            if (difference > 0) {
                return {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60),
                    isValentines: false
                };
            }

            return { days: 0, hours: 0, minutes: 0, seconds: 0, isValentines: true };
        };

        // Initial set
        setTimeLeft(calculateTimeLeft());

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const handleToggleTheme = () => {
        if (theme === 'valentine') {
            setTheme('dark'); // Toggle off to dark
        } else {
            setTheme('valentine'); // Toggle on
            triggerConfetti();
        }
    };

    const triggerConfetti = () => {
        const duration = 3000;
        const end = Date.now() + duration;

        // Valentine colors
        const colors = ['#ec4899', '#f43f5e', '#ffffff'];

        (function frame() {
            confetti({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: colors
            });
            confetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: colors
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="relative w-full z-50"
                >
                    <div
                        className={`
              relative w-full px-3 py-3 md:px-8 md:py-6
              bg-gradient-to-r from-pink-600 via-rose-500 to-red-600
              text-white shadow-md
              flex flex-col md:flex-row items-center justify-between gap-3 md:gap-8
              transition-all duration-500 ease-in-out
              ${theme === 'valentine' ? 'border-b border-pink-400/30' : ''}
            `}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                    >
                        {/* Animated Overlay */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent bg-[length:30px_30px]"></div>
                        <div
                            className={`absolute inset-0 bg-white/10 origin-left transition-transform duration-700 ease-out pointer-events-none`}
                            style={{ transform: isHovered ? 'scaleX(1)' : 'scaleX(0)' }}
                        />

                        {/* Wrapper for Left Content: 'contents' on mobile to unwrap, 'flex-col' on desktop */}
                        <div className="contents md:flex md:flex-col md:items-start md:text-left z-10 w-full md:w-auto">

                            {/* TEXT SECTION (Mobile: Order 1) */}
                            <div className="order-1 md:order-none flex flex-col items-center md:items-start text-center md:text-left mb-2 md:mb-2">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div className="p-1.5 md:p-3 bg-white/20 rounded-full backdrop-blur-sm shadow-inner animate-[pulse_2s_infinite]">
                                        <Heart className={`w-4 h-4 md:w-8 md:h-8 text-white fill-current ${theme === 'valentine' ? 'animate-[bounce_1s_infinite]' : ''}`} />
                                    </div>
                                    <div className="flex flex-col items-center md:items-start">
                                        <h3 className="font-bold text-sm md:text-2xl leading-none flex items-center gap-2">
                                            Valentine's Special
                                            {theme === 'valentine' && <Sparkles className="w-3 h-3 md:w-5 md:h-5 text-yellow-300 animate-spin" />}
                                        </h3>
                                        <p className="text-[10px] md:text-base text-white/90 font-medium mt-0.5 md:mt-1 max-w-[200px] md:max-w-none leading-tight">
                                            <span className="font-bold text-white underline decoration-wavy decoration-pink-300">Love Mode</span> is available!
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* BUTTONS SECTION (Mobile: Order 3 - Bottom) */}
                            <div className="order-3 md:order-none flex items-center gap-2 md:gap-3 mt-1 md:mt-4 justify-center md:justify-start w-full md:w-auto">
                                <button
                                    onClick={handleToggleTheme}
                                    className={`
                                        px-4 py-2 md:px-6 md:py-2.5 rounded-full text-xs md:text-base font-bold
                                        transition-all duration-300 transform active:scale-95 hover:scale-105 hover:shadow-lg
                                        flex items-center gap-1.5 md:gap-2 shadow-md whitespace-nowrap w-full md:w-auto justify-center
                                        ${theme === 'valentine'
                                            ? 'bg-white text-pink-600 hover:bg-pink-50 ring-2 ring-pink-200'
                                            : 'bg-black/40 text-white hover:bg-black/60 backdrop-blur-md border border-white/30'}
                                    `}
                                >
                                    {theme === 'valentine' ? (
                                        <>
                                            <X className="w-3 h-3 md:w-4 md:h-4" /> Turn Off
                                        </>
                                    ) : (
                                        <>
                                            Try We Love Mode <Heart className="w-3 h-3 md:w-4 md:h-4 fill-current" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Close Button - Fixed Top Right */}
                        <button
                            onClick={() => setIsVisible(false)}
                            className="absolute top-1 right-1 md:top-2 md:right-2 p-1.5 md:p-2 rounded-full hover:bg-black/20 text-white/80 hover:text-white transition-colors z-20"
                            aria-label="Close"
                        >
                            <X className="w-3 h-3 md:w-5 md:h-5" />
                        </button>

                        {/* RIGHT SECTION: Calendar Countdown (Mobile: Order 2 - Middle) */}
                        <div className="order-2 md:order-none flex items-center gap-1 md:gap-4 z-10 scale-90 md:scale-100 origin-center md:origin-right my-1 md:my-0">
                            {!timeLeft?.isValentines ? (
                                <>
                                    {/* Days */}
                                    <div className="flex flex-col items-center bg-white/20 backdrop-blur-md rounded-md md:rounded-lg p-1.5 md:p-3 w-12 md:w-20 shadow-lg border border-white/20">
                                        <span className="text-lg md:text-4xl font-black text-white drop-shadow-md">
                                            {timeLeft?.days}
                                        </span>
                                        <span className="text-[9px] md:text-xs font-bold uppercase tracking-wider text-pink-100">Days</span>
                                    </div>

                                    <div className="text-white/50 font-bold text-sm md:text-xl">:</div>

                                    {/* Hours */}
                                    <div className="flex flex-col items-center bg-white/20 backdrop-blur-md rounded-md md:rounded-lg p-1.5 md:p-3 w-12 md:w-20 shadow-lg border border-white/20">
                                        <span className="text-lg md:text-4xl font-black text-white drop-shadow-md">
                                            {timeLeft?.hours}
                                        </span>
                                        <span className="text-[9px] md:text-xs font-bold uppercase tracking-wider text-pink-100">Hrs</span>
                                    </div>

                                    <div className="text-white/50 font-bold text-sm md:text-xl">:</div>

                                    {/* Mins */}
                                    <div className="flex flex-col items-center bg-white/20 backdrop-blur-md rounded-md md:rounded-lg p-1.5 md:p-3 w-12 md:w-20 shadow-lg border border-white/20">
                                        <span className="text-lg md:text-4xl font-black text-white drop-shadow-md">
                                            {timeLeft?.minutes}
                                        </span>
                                        <span className="text-[9px] md:text-xs font-bold uppercase tracking-wider text-pink-100">Mins</span>
                                    </div>

                                    <div className="text-white/50 font-bold text-sm md:text-xl">:</div>

                                    {/* Secs */}
                                    <div className="flex flex-col items-center bg-white/90 backdrop-blur-md rounded-md md:rounded-lg p-1.5 md:p-3 w-12 md:w-20 shadow-xl border border-white animate-pulse">
                                        <span className="text-lg md:text-4xl font-black text-pink-600 drop-shadow-sm">
                                            {timeLeft?.seconds}
                                        </span>
                                        <span className="text-[9px] md:text-xs font-bold uppercase tracking-wider text-pink-600">Secs</span>
                                    </div>
                                </>
                            ) : (
                                <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 md:p-6 border border-white/30 text-center animate-bounce">
                                    <h2 className="text-xl md:text-4xl font-black text-white drop-shadow-lg transform -rotate-2">
                                        HAPPY
                                    </h2>
                                    <h2 className="text-xl md:text-4xl font-black text-pink-100 drop-shadow-lg transform rotate-2">
                                        VALENTINE'S!
                                    </h2>
                                </div>
                            )}
                        </div>

                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

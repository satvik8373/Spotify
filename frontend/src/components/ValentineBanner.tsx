
import { useState } from 'react';
import { Heart, Sparkles, X } from 'lucide-react';
import { useThemeStore } from '@/stores/useThemeStore';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

export const ValentineBanner = () => {
    const { theme, setTheme } = useThemeStore();
    const [isVisible, setIsVisible] = useState(true);
    const [isHovered, setIsHovered] = useState(false);

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
              relative w-full px-4 py-3 md:py-4 md:px-6 
              bg-gradient-to-r from-pink-600 via-rose-500 to-red-600
              text-white shadow-lg
              flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-6
              transition-all duration-500 ease-in-out
              ${theme === 'valentine' ? 'shadow-[0_0_20px_rgba(236,72,153,0.4)] border-b border-pink-400/30' : ''}
            `}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                    >
                        {/* Animated Background Overlay Pattern */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent bg-[length:20px_20px]"></div>

                        {/* Hover Fill Effect - simpler CSS transition */}
                        <div
                            className={`absolute inset-0 bg-white/10 origin-left transition-transform duration-700 ease-out pointer-events-none`}
                            style={{ transform: isHovered ? 'scaleX(1)' : 'scaleX(0)' }}
                        />

                        <div className="flex items-center gap-3 relative z-10 w-full sm:w-auto justify-center sm:justify-start">
                            <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm shadow-inner animate-[pulse_2s_infinite]">
                                <Heart className={`w-5 h-5 md:w-6 md:h-6 text-white fill-current ${theme === 'valentine' ? 'animate-[bounce_1s_infinite]' : ''}`} />
                            </div>
                            <div className="text-center sm:text-left">
                                <h3 className="font-bold text-sm md:text-base leading-tight flex items-center gap-2 justify-center sm:justify-start">
                                    Valentine's Special
                                    {theme === 'valentine' && <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" />}
                                </h3>
                                <p className="text-xs md:text-sm text-white/90 font-medium hidden sm:block">
                                    Switch to <span className="font-bold text-white underline decoration-wavy decoration-pink-300">Love Mode</span> & feel the romance!
                                </p>
                                <p className="text-xs md:text-sm text-white/90 font-medium sm:hidden">
                                    Turn on <span className="font-bold text-white">Love Mode</span>!
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 relative z-10 w-full sm:w-auto justify-center sm:justify-end">
                            <button
                                onClick={handleToggleTheme}
                                className={`
                  px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold
                  transition-all duration-300 transform active:scale-95 hover:scale-105
                  flex items-center gap-2 shadow-md
                  ${theme === 'valentine'
                                        ? 'bg-white text-pink-600 hover:bg-pink-50'
                                        : 'bg-black/30 text-white hover:bg-black/50 backdrop-blur-md border border-white/20'}
                `}
                            >
                                {theme === 'valentine' ? (
                                    <>
                                        <X className="w-3 h-3 md:w-4 md:h-4" /> Turn Off
                                    </>
                                ) : (
                                    <>
                                        Try It Now <Heart className="w-3 h-3 md:w-4 md:h-4 fill-current" />
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => setIsVisible(false)}
                                className="p-1.5 rounded-full hover:bg-black/10 text-white/70 hover:text-white transition-colors absolute right-2 top-2 sm:relative sm:right-auto sm:top-auto sm:ml-1"
                                aria-label="Close banner"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

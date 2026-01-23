import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { CustomScrollbar } from '@/components/ui/CustomScrollbar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Smartphone, Sparkles, User, Mail, Code2 } from 'lucide-react';

interface WhatsNewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function WhatsNewDialog({ open, onOpenChange }: WhatsNewDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-[#1e1e1e] border-[#333] text-white p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex-shrink-0 p-6 pb-4 bg-gradient-to-r from-green-900/20 to-black border-b border-[#333]">
                    <DialogHeader>
                        <div className="flex items-center justify-between mb-2">
                            <Badge variant="secondary" className="bg-green-500 text-black font-bold hover:bg-green-400">
                                v2.5.0 Live
                            </Badge>
                            <span className="text-xs text-neutral-400">Released: Dec 6, 2025</span>
                        </div>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <Sparkles className="h-6 w-6 text-yellow-400" />
                            What's New in Mavrixfy
                        </DialogTitle>
                        <DialogDescription className="text-neutral-300">
                            Major mobile experience upgrades, visual styling refinements, and under-the-hood optimizations.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Scrollable Content */}
                <CustomScrollbar className="h-[60vh] w-full p-6 pt-2">
                    <div className="space-y-8">
                        {/* Mobile Experience Section */}
                        <section>
                            <h3 className="flex items-center gap-2 text-lg font-semibold text-green-400 mb-3">
                                <Smartphone className="h-5 w-5" />
                                Mobile Experience Refined
                            </h3>
                            <div className="bg-[#2a2a2a] rounded-lg p-4 space-y-3 border border-[#333]">
                                <div className="flex gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-white">Full-Width Text Layout</h4>
                                        <p className="text-sm text-neutral-400 mt-1">Mobile cards now utilize the entire screen width with smart padding (`pl-2`), giving text maximum room to breathe.</p>
                                    </div>
                                </div>
                                <Separator className="bg-[#333]" />
                                <div className="flex gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-white">Perfect Font Sizing</h4>
                                        <p className="text-sm text-neutral-400 mt-1">Reverted mobile text to high-density `text-xs` (approx 12px) for that crisp, native app list view feel.</p>
                                    </div>
                                </div>
                                <Separator className="bg-[#333]" />
                                <div className="flex gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-white">Clean & Fast</h4>
                                        <p className="text-sm text-neutral-400 mt-1">Disabled heavy gradient effects and hidden filter buttons on mobile for a streamlined, performance-focused interface.</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Visual Polish Section */}
                        <section>
                            <h3 className="flex items-center gap-2 text-lg font-semibold text-purple-400 mb-3">
                                <Sparkles className="h-5 w-5" />
                                Visual Polish (Desktop)
                            </h3>
                            <div className="bg-[#2a2a2a] rounded-lg p-4 space-y-3 border border-[#333]">
                                <div className="flex gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-white">Pixel-Perfect Dimensions</h4>
                                        <p className="text-sm text-neutral-400 mt-1">Cards are tuned to exactly 64px height with 1px width adjustments (`w-[calc(100%-1px)]`) for flawless grid alignment.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-white">Bold Typography</h4>
                                        <p className="text-sm text-neutral-400 mt-1">Upgraded desktop fonts to 15px Bold for better legibility and a premium look.</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Developer Info Section */}
                        <section className="bg-gradient-to-br from-[#2a2a2a] to-black rounded-xl p-5 border border-[#444] mt-6">
                            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-2">Developed By</h4>
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className="bg-neutral-800 p-2 rounded-full">
                                            <Code2 className="h-5 w-5 text-white" />
                                        </div>
                                        <span className="text-xl font-bold text-white">Satvik Patel</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <h4 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Contact</h4>
                                    <a href="mailto:satvikpatel8373@gmail.com" className="flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors bg-green-900/20 px-3 py-1.5 rounded-full text-sm">
                                        <Mail className="h-4 w-4" />
                                        satvikpatel8373@gmail.com
                                    </a>
                                </div>
                            </div>
                        </section>
                    </div>
                </CustomScrollbar>

                {/* Footer */}
                <DialogFooter className="p-4 border-t border-[#333] bg-[#1a1a1a]">
                    <Button
                        className="w-full sm:w-auto bg-white text-black hover:bg-neutral-200 font-bold"
                        onClick={() => onOpenChange(false)}
                    >
                        Awesome, looks good!
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

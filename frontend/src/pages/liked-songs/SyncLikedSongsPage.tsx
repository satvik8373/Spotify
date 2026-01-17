import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Music, Upload, CheckCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SpotifyLikedSongsSync } from '@/components/liked-songs/SpotifyLikedSongsSync';
import { LikedSongsFileUploader } from '@/components/liked-songs/LikedSongsFileUploader';


const SyncLikedSongsPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'spotify' | 'upload'>('spotify');

    return (
        <div className="min-h-full bg-background text-foreground flex flex-col pb-24 md:pb-6">
            {/* Header Section */}
            {/* Unified Hero Header Section */}
            <div className="relative bg-gradient-to-b from-green-900/40 via-background to-background pt-4 pb-2 px-4 md:px-8 border-b border-white/5 shadow-2xl shadow-black/20">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2">
                        {/* Title Area */}
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate('/liked-songs')}
                                className="hover:bg-white/10 rounded-full h-10 w-10 flex-shrink-0 -ml-2"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>

                            <div className="flex flex-col">
                                <h1 className="text-3xl md:text-4xl font-bold leading-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                                    Add Songs
                                </h1>
                                <p className="text-muted-foreground text-sm mt-1">
                                    Expand your library with high-quality tracks
                                </p>
                            </div>
                        </div>

                        {/* Tabs integrated into header */}
                        <Tabs
                            defaultValue="spotify"
                            value={activeTab}
                            onValueChange={(v) => setActiveTab(v as any)}
                            className="w-full md:w-auto"
                        >
                            <TabsList className="bg-black/20 backdrop-blur-md p-1 h-auto rounded-full inline-flex w-full md:w-auto border border-white/5">
                                <TabsTrigger
                                    value="spotify"
                                    className="rounded-full px-6 py-2 text-sm font-medium data-[state=active]:bg-green-500 data-[state=active]:text-black data-[state=active]:shadow-lg transition-all duration-300 flex-1 md:flex-none"
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <Music className="h-4 w-4" />
                                        <span>Spotify Sync</span>
                                    </div>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="upload"
                                    className="rounded-full px-6 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300 flex-1 md:flex-none"
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <Upload className="h-4 w-4" />
                                        <span>Upload File</span>
                                    </div>
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 md:px-8 mt-2 flex-1 w-full container-query-fix">
                <Tabs value={activeTab} className="flex flex-col">
                    {/* Content Area - No duplicate TabsList here */}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-0">
                        <div className="lg:col-span-2 h-full min-h-0 flex flex-col">
                            <TabsContent value="spotify" className="mt-0 outline-none h-full">
                                <SpotifyLikedSongsSync onClose={() => navigate('/liked-songs')} />
                            </TabsContent>

                            <TabsContent value="upload" className="mt-0 outline-none h-full">
                                <LikedSongsFileUploader onClose={() => navigate('/liked-songs')} />
                            </TabsContent>
                        </div>

                        {/* Sidebar Info */}
                        <div className="hidden lg:block h-full overflow-hidden">
                            <div className="bg-card p-6 rounded-xl border border-border/50 h-full flex flex-col bg-opacity-50">
                                <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                                    <ShieldCheck className="h-4 w-4 text-green-500" />
                                    How Sync Works
                                </h3>
                                <ul className="space-y-3 text-xs text-muted-foreground">
                                    <li className="flex gap-2">
                                        <div className="bg-green-500/10 p-1.5 rounded-full h-fit flex-shrink-0">
                                            <CheckCircle className="h-3 w-3 text-green-500" />
                                        </div>
                                        <span>
                                            <strong className="text-foreground block mb-0.5">Secure Connection</strong>
                                            Official APIs. No credentials stored.
                                        </span>
                                    </li>
                                    <li className="flex gap-2">
                                        <div className="bg-blue-500/10 p-1.5 rounded-full h-fit flex-shrink-0">
                                            <CheckCircle className="h-3 w-3 text-blue-500" />
                                        </div>
                                        <span>
                                            <strong className="text-foreground block mb-0.5">High Quality</strong>
                                            Automatic highest quality matching.
                                        </span>
                                    </li>
                                    <li className="flex gap-2">
                                        <div className="bg-purple-500/10 p-1.5 rounded-full h-fit flex-shrink-0">
                                            <CheckCircle className="h-3 w-3 text-purple-500" />
                                        </div>
                                        <span>
                                            <strong className="text-foreground block mb-0.5">Smart Deduplication</strong>
                                            Skips existing songs automatically.
                                        </span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </Tabs>
            </div>
        </div>
    );
};

export default SyncLikedSongsPage;

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Outlet } from "react-router-dom";
import LeftSidebar from "./components/LeftSidebar";
import AudioPlayer from "./components/AudioPlayer";
import { PlaybackControls } from "./components/PlaybackControls";
import { useEffect, useState } from "react";
import MobileNav from "./components/MobileNav";
import { usePlayerStore } from "@/stores/usePlayerStore";

const MainLayout = () => {
	const [isMobile, setIsMobile] = useState(false);
	const { currentSong } = usePlayerStore();
	const hasActiveSong = !!currentSong;

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768);
		};

		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	return (
		<div className='h-screen bg-black text-white flex flex-col'>
			<ResizablePanelGroup direction='horizontal' className='flex-1 flex h-full overflow-hidden p-2'>
				<AudioPlayer />
				
				{/* Left sidebar - hidden on mobile */}
				<ResizablePanel 
					defaultSize={20} 
					minSize={isMobile ? 0 : 10} 
					maxSize={30}
					className={isMobile ? 'hidden md:block' : ''}
				>
					<LeftSidebar />
				</ResizablePanel>

				{!isMobile && (
					<ResizableHandle className='w-2 bg-black rounded-lg transition-colors' />
				)}

				{/* Main content - full width on mobile */}
				<ResizablePanel 
					defaultSize={isMobile ? 100 : 80}
					className={`overflow-y-auto ${hasActiveSong && isMobile ? 'pb-32' : 'pb-24 md:pb-0'}`} // Add padding for mobile player + nav
				>
					<Outlet />
				</ResizablePanel>
			</ResizablePanelGroup>

			{/* Playback controls */}
			<PlaybackControls />
			
			{/* Mobile Navigation */}
			<MobileNav />
		</div>
	);
};
export default MainLayout;

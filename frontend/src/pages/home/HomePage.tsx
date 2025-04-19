import Topbar from "@/components/Topbar";
import { ScrollArea } from "@/components/ui/scroll-area";
import IndianMusicPlayer from "@/components/IndianMusicPlayer";

const HomePage = () => {
	return (
		<main className='rounded-md overflow-hidden h-full bg-gradient-to-b from-zinc-800 to-zinc-900'>
			<Topbar />
			<ScrollArea className='h-[calc(100vh-180px)]'>
				<div className='p-4 sm:p-6'>
					<IndianMusicPlayer />
				</div>
			</ScrollArea>
		</main>
	);
};
export default HomePage;

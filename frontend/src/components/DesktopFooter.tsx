import React from 'react';
import { Instagram, Twitter, Facebook } from 'lucide-react';

const DesktopFooter = () => {
    return (
        <div className="bg-[#121212] pt-16 pb-8 px-8 mt-auto hidden md:block">
            <div className="flex flex-col">
                {/* Top Section with Links and Social Icons */}
                <div className="flex justify-between mb-16">
                    <div className="flex gap-16 lg:gap-24">
                        {/* Company Column */}
                        <div className="flex flex-col gap-4">
                            <h3 className="font-bold text-white text-base">Company</h3>
                            <ul className="flex flex-col gap-2">
                                <li><a href="#" className="text-[#a7a7a7] hover:text-white hover:underline">About</a></li>
                                <li><a href="#" className="text-[#a7a7a7] hover:text-white hover:underline">Jobs</a></li>
                                <li><a href="#" className="text-[#a7a7a7] hover:text-white hover:underline">For the Record</a></li>
                            </ul>
                        </div>

                        {/* Communities Column */}
                        <div className="flex flex-col gap-4">
                            <h3 className="font-bold text-white text-base">Communities</h3>
                            <ul className="flex flex-col gap-2">
                                <li><a href="#" className="text-[#a7a7a7] hover:text-white hover:underline">For Artists</a></li>
                                <li><a href="#" className="text-[#a7a7a7] hover:text-white hover:underline">Developers</a></li>
                                <li><a href="#" className="text-[#a7a7a7] hover:text-white hover:underline">Advertising</a></li>
                                <li><a href="#" className="text-[#a7a7a7] hover:text-white hover:underline">Investors</a></li>
                                <li><a href="#" className="text-[#a7a7a7] hover:text-white hover:underline">Vendors</a></li>
                            </ul>
                        </div>

                        {/* Useful Links Column */}
                        <div className="flex flex-col gap-4">
                            <h3 className="font-bold text-white text-base">Useful links</h3>
                            <ul className="flex flex-col gap-2">
                                <li><a href="#" className="text-[#a7a7a7] hover:text-white hover:underline">Support</a></li>
                                <li><a href="#" className="text-[#a7a7a7] hover:text-white hover:underline">Free Mobile App</a></li>
                                <li><a href="#" className="text-[#a7a7a7] hover:text-white hover:underline">Popular by Country</a></li>
                                <li><a href="#" className="text-[#a7a7a7] hover:text-white hover:underline">Import your music</a></li>
                            </ul>
                        </div>

                        {/* Spotify Plans Column */}
                        <div className="flex flex-col gap-4">
                            <h3 className="font-bold text-white text-base">Spotify Plans</h3>
                            <ul className="flex flex-col gap-2">
                                <li><a href="#" className="text-[#a7a7a7] hover:text-white hover:underline">Premium Lite</a></li>
                                <li><a href="#" className="text-[#a7a7a7] hover:text-white hover:underline">Premium Standard</a></li>
                                <li><a href="#" className="text-[#a7a7a7] hover:text-white hover:underline">Premium Platinum</a></li>
                                <li><a href="#" className="text-[#a7a7a7] hover:text-white hover:underline">Premium Student</a></li>
                                <li><a href="#" className="text-[#a7a7a7] hover:text-white hover:underline">Spotify Free</a></li>
                            </ul>
                        </div>
                    </div>

                    {/* Social Icons */}
                    <div className="flex gap-4">
                        <button className="w-10 h-10 rounded-full bg-[#292929] hover:bg-[#727272] flex items-center justify-center text-white transition-colors">
                            <Instagram size={20} />
                        </button>
                        <button className="w-10 h-10 rounded-full bg-[#292929] hover:bg-[#727272] flex items-center justify-center text-white transition-colors">
                            <Twitter size={20} fill="currentColor" />
                        </button>
                        <button className="w-10 h-10 rounded-full bg-[#292929] hover:bg-[#727272] flex items-center justify-center text-white transition-colors">
                            <Facebook size={20} fill="currentColor" />
                        </button>
                    </div>
                </div>

                {/* Divider */}
                <div className="h-[1px] bg-[#292929] w-full mb-8"></div>

                {/* Bottom Section */}
                <div className="flex justify-between items-center text-sm">
                    <div className="flex gap-6 flex-wrap">
                        <a href="#" className="text-[#a7a7a7] hover:text-white">Legal</a>
                        <a href="#" className="text-[#a7a7a7] hover:text-white">Safety & Privacy Center</a>
                        <a href="#" className="text-[#a7a7a7] hover:text-white">Privacy Policy</a>
                        <a href="#" className="text-[#a7a7a7] hover:text-white">Cookies</a>
                        <a href="#" className="text-[#a7a7a7] hover:text-white">About Ads</a>
                        <a href="#" className="text-[#a7a7a7] hover:text-white">Accessibility</a>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <div className="text-[#a7a7a7]">
                            Copyright @ Mavrixfy & Team
                        </div>
                        <div className="text-[#a7a7a7] text-xs">
                            Developed by Satvik Patel
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DesktopFooter;

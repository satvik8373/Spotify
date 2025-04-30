import React from 'react';
import { Home as IconHome, Search as IconSearch, Library as IconBookmark, Heart as IconHeart, Music as IconBrandSpotify } from 'lucide-react';

const sidebarLinks = [
  {
    name: 'Home',
    path: '/',
    icon: <IconHome />
  },
  {
    name: 'Search',
    path: '/search',
    icon: <IconSearch />
  },
  {
    name: 'Your Library',
    path: '/library',
    icon: <IconBookmark />
  },
  {
    name: 'Liked Songs',
    path: '/liked-songs',
    icon: <IconHeart />
  },
  {
    name: 'Spotify Playlists',
    path: '/spotify-playlists',
    icon: <IconBrandSpotify />
  }
]; 

export default sidebarLinks; 
import React from 'react';
import { MoodPlaylistGenerator } from './MoodPlaylistGenerator';
import './MoodPlaylistGeneratorStyled.css';

export const MoodPlaylistGeneratorStyled: React.FC = () => {
  return (
    <div className="mood-generator-wrapper">
      <MoodPlaylistGenerator className="mood-generator-styled" />
    </div>
  );
};

import React from 'react';
import { GeneratedStory } from '../types';
import { AudioPlayer } from './AudioPlayer';

interface StoryDisplayProps {
    story: GeneratedStory;
    onRegenerateAudio?: () => void;
    isAudioLoading?: boolean;
}

export const StoryDisplay: React.FC<StoryDisplayProps> = ({ 
    story, 
    onRegenerateAudio,
    isAudioLoading = false
}) => {
    
    const renderMedia = () => {
        if (story.videoUrl) {
            return (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg mb-6 bg-black">
                    <video 
                        src={story.videoUrl} 
                        controls 
                        autoPlay 
                        loop 
                        className="w-full h-full object-cover"
                    />
                    {story.isVideoSimulated && (
                        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                            Simulation (Ken Burns)
                        </div>
                    )}
                </div>
            );
        }

        if (story.imageUrl) {
            return (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg mb-6 group">
                    <img 
                        src={story.imageUrl} 
                        alt={story.imagePrompt || "Illustration de l'histoire"} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                </div>
            );
        }

        return null;
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
            
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6 text-center font-serif">
                {story.title}
            </h1>

            {renderMedia()}

            {story.audioUrl && (
                <div className="mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        🎧 Écouter l'histoire
                    </h3>
                    <AudioPlayer 
                        audioUrl={story.audioUrl} 
                        isLoading={isAudioLoading}
                        onRegenerate={onRegenerateAudio}
                    />
                </div>
            )}

            <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 mb-12">
                {story.content.split('\n').map((paragraph, index) => (
                    paragraph.trim() && (
                        <p key={index} className="mb-4 last:mb-0">
                            {paragraph}
                        </p>
                    )
                ))}
            </div>
        </div>
    );
};
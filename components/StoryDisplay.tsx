import React from 'react';
import { GeneratedStory, MediaType } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { SocraticChat } from './SocraticChat'; // ✅ Import du nouveau chat

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
    
    // Fonction pour déterminer si on affiche une vidéo ou une image
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
            
            {/* 1. TITRE DE L'HISTOIRE */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6 text-center font-serif">
                {story.title}
            </h1>

            {/* 2. MEDIA (IMAGE OU VIDEO) */}
            {renderMedia()}

            {/* 3. LECTEUR AUDIO (SI DISPONIBLE) */}
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

            {/* 4. CONTENU TEXTE */}
            <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 mb-12">
                {story.content.split('\n').map((paragraph, index) => (
                    paragraph.trim() && (
                        <p key={index} className="mb-4 last:mb-0">
                            {paragraph}
                        </p>
                    )
                ))}
            </div>

            {/* 5. LE CHAT SOCRATIQUE (NOUVEAU) */}
            {/* On sépare visuellement avec une ligne */}
            <div className="border-t border-gray-200 my-8"></div>
            
            <div className="bg-blue-50/50 p-4 md:p-6 rounded-2xl border border-blue-100">
                <SocraticChat storyContent={story.content} />
            </div>

        </div>
    );
};
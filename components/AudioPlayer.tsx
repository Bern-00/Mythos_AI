import React, { useRef, useState, useEffect } from 'react';

interface AudioPlayerProps {
    audioUrl: string;
    isLoading?: boolean;
    onRegenerate?: () => void;
}

// L'important est ici : "export const" pour que l'import { AudioPlayer } fonctionne
export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, isLoading = false, onRegenerate }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.load();
            setIsPlaying(false);
            setCurrentTime(0);
        }
    }, [audioUrl]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-4 w-full bg-gray-50 p-3 rounded-lg border border-gray-200">
            <audio
                ref={audioRef}
                src={audioUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
            />

            <button
                onClick={togglePlay}
                disabled={isLoading}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors flex-shrink-0 disabled:opacity-50"
            >
                {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                    <span>⏸</span>
                ) : (
                    <span>▶</span>
                )}
            </button>

            <div className="flex-1">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 relative overflow-hidden">
                    <div 
                        className="bg-blue-600 h-full rounded-full transition-all duration-100"
                        style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                    />
                </div>
            </div>

            {onRegenerate && (
                <button 
                    onClick={onRegenerate}
                    className="text-gray-400 hover:text-blue-600 transition-colors p-2"
                    title="Régénérer l'audio"
                >
                    🔄
                </button>
            )}
        </div>
    );
};
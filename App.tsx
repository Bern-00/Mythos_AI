
import React, { useState, useEffect } from 'react';
import { STORY_GENRES, AGE_GROUPS, IMAGE_STYLES, LANGUAGES, MEDIA_TYPES, VIDEO_FORMATS, APP_NAME } from './constants';
import { StoryRequest, GeneratedStory, StoryGenre, AgeGroup, ImageStyle, MediaType, HistoryItem, VideoFormat } from './types';
import { generateFullStory } from './services/geminiService';
import Button from './components/Button';
import Input from './components/Input';
import Select from './components/Select';
import StoryDisplay from './components/StoryDisplay';
import HistoryList from './components/HistoryList';
import LoginPage from './components/LoginPage';
import WelcomePage from './components/WelcomePage';
import Sidebar from './components/Sidebar';
import ImageGallery from './components/ImageGallery';
import SettingsPage from './components/SettingsPage';
import LoadingBot from './components/LoadingBot';

// Extend window interface for Google AI Studio specific features
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}

interface UserSession {
  email: string;
  name: string;
}

type ViewType = 'welcome' | 'create' | 'history' | 'images' | 'settings';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<UserSession | null>(null);

  // App State
  const [currentView, setCurrentView] = useState<ViewType>('welcome');
  const [loading, setLoading] = useState(false);
  const [story, setStory] = useState<GeneratedStory | null>(null);
  const [lastRequest, setLastRequest] = useState<StoryRequest | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Sidebar fermée par défaut
  
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      return (savedTheme as 'light' | 'dark') || 'dark';
    }
    return 'dark';
  });

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Load user session & history from localStorage on mount
  useEffect(() => {
    try {
      // Load User
      const savedUser = localStorage.getItem('mythos_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }

      // Load History
      const savedHistory = localStorage.getItem('mythos_history');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error("Impossible de charger les données locales", e);
      // Clean up corrupt data
      localStorage.removeItem('mythos_history');
    }
  }, []);

  // Gestion responsive de la sidebar (fermeture auto sur mobile)
  useEffect(() => {
    const handleResize = () => {
        if (window.innerWidth < 1024) {
            setIsSidebarOpen(false);
        }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogin = (email: string, name: string) => {
    const newUser = { email, name };
    setUser(newUser);
    localStorage.setItem('mythos_user', JSON.stringify(newUser));
    setCurrentView('welcome');
  };

  const handleLogout = () => {
    setUser(null);
    setStory(null);
    setTopic('');
    setLastRequest(null);
    localStorage.removeItem('mythos_user');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Form State
  const [topic, setTopic] = useState('');
  const [genre, setGenre] = useState<StoryGenre>(StoryGenre.EDUCATIONAL); // Default to Educational
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(AgeGroup.CHILD);
  const [imageStyle, setImageStyle] = useState<ImageStyle>(ImageStyle.CARTOON); // Default style
  const [mediaType, setMediaType] = useState<MediaType>(MediaType.TEXT_WITH_IMAGE);
  const [videoFormat, setVideoFormat] = useState<VideoFormat>(VideoFormat.MP4);
  const [language, setLanguage] = useState<string>('Français');
  const [haitianCulture, setHaitianCulture] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveToHistory = (newStory: GeneratedStory, request: StoryRequest) => {
    const newItem: HistoryItem = {
      ...newStory,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      originalTopic: request.topic,
      mediaType: request.mediaType,
      genre: request.genre
    };

    // Keep only last 5
    const updatedHistory = [newItem, ...history].slice(0, 5);
    
    // Attempt to save to localStorage
    try {
      localStorage.setItem('mythos_history', JSON.stringify(updatedHistory));
      setHistory(updatedHistory);
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.warn("LocalStorage full. Saving without heavy media.");
        const lightItem = { ...newItem };
        
        if (lightItem.imageUrl && lightItem.imageUrl.startsWith('data:')) {
           lightItem.imageUrl = undefined;
        }
        if (lightItem.audioUrl && lightItem.audioUrl.length > 1000) {
           lightItem.audioUrl = undefined;
        }

        const lighterHistory = [lightItem, ...history].slice(0, 5);
        try {
            localStorage.setItem('mythos_history', JSON.stringify(lighterHistory));
            setHistory(lighterHistory);
        } catch (e2) {
            console.error("Impossible de sauvegarder même en version allégée", e2);
        }
      }
    }
  };

  const handleGenerate = async (forcedRequest?: StoryRequest) => {
    const request = forcedRequest || {
        topic,
        genre,
        ageGroup,
        imageStyle,
        includeHaitianCulture: haitianCulture,
        language,
        mediaType,
        videoFormat: mediaType === MediaType.VIDEO ? videoFormat : undefined
    };

    if (!request.topic) {
        setError("Veuillez entrer un sujet ou un concept à apprendre.");
        return;
    }

    setError(null);
    setLoading(true); // Declenche l'affichage du LoadingBot
    setLastRequest(request);

    try {
      const result = await generateFullStory(request);
      setStory(result);
      saveToHistory(result, request);

    } catch (e: any) {
      setError(e.message || "Une erreur est survenue lors de la création.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('mythos_history');
  };

  const handleResetStory = () => {
    setStory(null);
    // On reste sur la vue actuelle
  };

  const selectHistoryItem = (item: HistoryItem) => {
      setStory(item);
  };

  // If user is not logged in, show Login Page
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen text-slate-900 dark:text-white transition-colors duration-300 flex flex-col relative overflow-x-hidden">
      
      {/* --- VISION BACKGROUND LAYER (ANIMATED BLOBS) --- */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        {/* Base Background Color */}
        <div className="absolute inset-0 bg-slate-50 dark:bg-[#0B0F19] transition-colors duration-500"></div>

        {/* Animated Orbs - Keyframes are now in index.html */}
        <div className="absolute top-0 -left-4 w-96 h-96 bg-indigo-300 dark:bg-indigo-600/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-fuchsia-300 dark:bg-fuchsia-600/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-cyan-300 dark:bg-blue-600/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>

        {/* Grid Texture */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 dark:opacity-5 mix-blend-overlay"></div>
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(129, 140, 248, 0.2) 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
      </div>

      {/* --- LOADING BOT OVERLAY --- */}
      {loading && <LoadingBot />}

      {/* Sidebar Navigation */}
      <Sidebar 
        currentView={currentView}
        onChangeView={(view) => {
            setCurrentView(view as ViewType);
            setStory(null); // Clear story when changing main views
            if (window.innerWidth < 1024) setIsSidebarOpen(false); // Close on mobile after click
        }}
        onLogout={handleLogout}
        userInitial={user.name.charAt(0)}
        theme={theme}
        toggleTheme={toggleTheme}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'lg:pl-64' : 'pl-0'} flex flex-col min-h-screen relative z-10`}>
        
        {/* Toggle Sidebar Button (Visible Mobile & Desktop) */}
        <div className="sticky top-0 z-40 p-4 pointer-events-none">
            <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="pointer-events-auto bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                aria-label={isSidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isSidebarOpen ? (
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    ) : (
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    )}
                </svg>
            </button>
        </div>

        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 -mt-16 pt-20 w-full">
            
            {/* If a story is active, show it (overlaying the current view) */}
            {story ? (
                <StoryDisplay 
                    story={story} 
                    onBack={handleResetStory} 
                />
            ) : (
                /* Otherwise show the selected view */
                <>
                    {currentView === 'welcome' && (
                        <WelcomePage 
                            userName={user.name.split(' ')[0]} 
                            onStartCreate={() => setCurrentView('create')}
                            onViewHistory={() => setCurrentView('history')}
                        />
                    )}

                    {currentView === 'create' && (
                        <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
                            
                            {/* Back Button for Create View */}
                            <button 
                                onClick={() => setCurrentView('welcome')}
                                className="mb-6 inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Retour à l'accueil
                            </button>

                            <div className="bg-white/60 dark:bg-slate-900/60 p-8 rounded-3xl border border-white/50 dark:border-slate-800/50 shadow-2xl backdrop-blur-xl">
                                <div className="space-y-6">
                                    <div className="space-y-2 border-b border-slate-200/50 dark:border-slate-800/50 pb-4">
                                        <h2 className="text-3xl font-bold font-serif text-slate-900 dark:text-white">Créer une Leçon</h2>
                                        <p className="text-slate-500 dark:text-slate-400">Configurez l'IA pour générer un contenu sur mesure.</p>
                                    </div>

                                    <div className="space-y-6">
                                        <Input 
                                            label="Sujet, Concept ou Titre" 
                                            placeholder="ex: La Photosynthèse, La Révolution Haïtienne, Le Courage..."
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                            className="!text-xl !py-4"
                                        />

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <Select 
                                                label="Type de contenu" 
                                                options={STORY_GENRES}
                                                value={genre}
                                                onChange={(e) => setGenre(e.target.value as StoryGenre)}
                                            />
                                            <Select 
                                                label="Niveau (Public Cible)" 
                                                options={AGE_GROUPS}
                                                value={ageGroup}
                                                onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <Select 
                                                label="Format du Support"
                                                options={MEDIA_TYPES}
                                                value={mediaType}
                                                onChange={(e) => setMediaType(e.target.value as MediaType)}
                                            />
                                            {mediaType === MediaType.VIDEO ? (
                                                <Select 
                                                    label="Format Vidéo"
                                                    options={VIDEO_FORMATS}
                                                    value={videoFormat}
                                                    onChange={(e) => setVideoFormat(e.target.value as VideoFormat)}
                                                />
                                            ) : (
                                                <Select 
                                                    label="Style Visuel" 
                                                    options={IMAGE_STYLES}
                                                    value={imageStyle}
                                                    onChange={(e) => setImageStyle(e.target.value as ImageStyle)}
                                                    disabled={mediaType === MediaType.TEXT_ONLY}
                                                    className={mediaType === MediaType.TEXT_ONLY ? 'opacity-50' : ''}
                                                />
                                            )}
                                        </div>
                                        
                                        <Select
                                            label="Langue de sortie"
                                            options={LANGUAGES}
                                            value={language}
                                            onChange={(e) => setLanguage(e.target.value)}
                                        />

                                        {/* Cultural Toggle */}
                                        <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-200/50 dark:border-indigo-500/20 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-indigo-100/50 dark:hover:bg-indigo-900/20 transition-colors"
                                            onClick={() => setHaitianCulture(!haitianCulture)}
                                        >
                                            <div className={`w-12 h-6 rounded-full relative transition-colors ${haitianCulture ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${haitianCulture ? 'left-7' : 'left-1'}`} />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-900 dark:text-white">Mode Culturel Haïtien</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Intégrer des références locales (géographie, contes, culture) dans la leçon.</p>
                                            </div>
                                        </div>

                                        {error && (
                                            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                {error}
                                            </div>
                                        )}
                                        
                                        <Button 
                                            className="w-full !py-4 text-lg mt-4" 
                                            onClick={() => handleGenerate()}
                                            isLoading={loading}
                                        >
                                            {mediaType === MediaType.VIDEO ? 'Générer la Vidéo 🎥' : 'Générer le contenu ✨'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentView === 'history' && (
                        <HistoryList 
                            history={history} 
                            onSelect={selectHistoryItem} 
                            onClear={handleClearHistory}
                            onBack={() => setCurrentView('welcome')}
                        />
                    )}

                    {currentView === 'images' && (
                        <ImageGallery
                            history={history}
                            onSelect={selectHistoryItem}
                            onBack={() => setCurrentView('welcome')}
                        />
                    )}

                    {currentView === 'settings' && (
                         <SettingsPage
                            onBack={() => setCurrentView('welcome')}
                            onClearHistory={handleClearHistory}
                            theme={theme}
                            toggleTheme={toggleTheme}
                            user={user}
                         />
                    )}
                </>
            )}
        </div>

        {/* Footer */}
        <footer className="w-full p-6 text-center text-slate-400 dark:text-slate-600 border-t border-slate-200/50 dark:border-slate-800/50 text-sm bg-white/30 dark:bg-black/20 backdrop-blur-md">
            <p className="font-medium">Développé par <span className="text-indigo-500 dark:text-indigo-400">B.A BA-Tech</span></p>
            <p className="text-xs mt-1">© 2025 MythosAI - Ayiti AI Hackathon</p>
        </footer>
      </main>
    </div>
  );
};

export default App;

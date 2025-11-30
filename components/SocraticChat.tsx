import React, { useState, useEffect, useRef } from 'react';
import { generateInitialQuestion, sendChatMessage } from '../services/geminiService';
import { ChatMessage } from '../types';

interface SocraticChatProps {
    storyContent: string;
}

export const SocraticChat: React.FC<SocraticChatProps> = ({ storyContent }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Au chargement, on génère la première question
    useEffect(() => {
        const initChat = async () => {
            setIsLoading(true);
            try {
                const initialQuestion = await generateInitialQuestion(storyContent);
                setMessages([{ role: 'model', text: initialQuestion }]);
            } catch (error) {
                console.error("Erreur init chat:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (storyContent) {
            initChat();
        }
    }, [storyContent]);

    // Scroll automatique vers le bas
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = input;
        setInput(''); // Vider l'input
        
        // Ajouter le message utilisateur
        const newHistory = [...messages, { role: 'user', text: userMsg } as ChatMessage];
        setMessages(newHistory);
        setIsLoading(true);

        try {
            // Réponse de l'IA
            const aiResponseText = await sendChatMessage(messages, userMsg, storyContent);
            setMessages([...newHistory, { role: 'model', text: aiResponseText }]);
        } catch (error) {
            console.error("Erreur chat:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ 
            marginTop: '2rem', 
            border: '1px solid #e5e7eb', 
            borderRadius: '12px', 
            padding: '1.5rem',
            backgroundColor: '#f9fafb'
        }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#4b5563' }}>
                🧠 Réflexion & Discussion
            </h3>
            
            <div style={{ 
                height: '300px', 
                overflowY: 'auto', 
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }}>
                {messages.length === 0 && isLoading && <p>L'IA réfléchit à une question...</p>}
                
                {messages.map((msg, idx) => (
                    <div key={idx} style={{
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                        padding: '10px 15px',
                        borderRadius: '15px',
                        backgroundColor: msg.role === 'user' ? '#2563eb' : '#ffffff',
                        color: msg.role === 'user' ? 'white' : '#1f2937',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        border: msg.role === 'model' ? '1px solid #e5e7eb' : 'none'
                    }}>
                        {msg.text}
                    </div>
                ))}
                {isLoading && messages.length > 0 && (
                    <div style={{ alignSelf: 'flex-start', color: '#6b7280', fontSize: '0.8rem', fontStyle: 'italic' }}>
                        MythosAI écrit...
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Répondez à la question ou partagez votre avis..."
                    style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        outline: 'none'
                    }}
                    disabled={isLoading}
                />
                <button
                    onClick={handleSend}
                    disabled={isLoading}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.7 : 1
                    }}
                >
                    Envoyer
                </button>
            </div>
        </div>
    );
};
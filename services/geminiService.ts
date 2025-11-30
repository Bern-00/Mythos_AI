import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { StoryRequest, GeneratedStory, StoryGenre, MediaType, ImageStyle, VideoFormat } from '../types';
import { ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, GEMINI_API_KEY } from '../constants';


export const generateElevenLabsAudio = async (text: string): Promise<string> => {
    
    const cleanText = text
        .replace(/[*#_]/g, '') // Enlève *, #, _
        .replace(/\[.*?\]/g, '') // Enlève les annotations entre crochets
        .replace(/^(Introduction|Conclusion|Titre|Concept|Résumé)\s*:/gmi, '') // Enlève les préfixes courants
        .trim();

    try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
                text: cleanText,
                model_id: "eleven_multilingual_v2", 
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                }
            }),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail?.message || "Erreur ElevenLabs");
        }

        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

    } catch (error) {
        console.error("Erreur génération audio ElevenLabs:", error);
        throw error;
    }
};



const generateFreeImage = async (prompt: string, style: ImageStyle): Promise<string> => {

    const enhancedPrompt = `${prompt}, ${style} style, high quality, detailed, 8k resolution, cinematic lighting`;
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    // Utilisation du modèle 'flux' pour une meilleure qualité
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&model=flux&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;

    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        // Conversion en Base64 pour compatibilité avec l'affichage
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Url = reader.result as string;
                resolve(base64Url);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Erreur génération image gratuite:", error);
        throw new Error("Impossible de générer l'image via l'API gratuite.");
    }
}

// --- SERVICE VIDEO (SIMULATION) ---

// L'API tierce étant instable/payante, nous simulons la vidéo pour l'instant
// en renvoyant l'image elle-même. Le front-end appliquera un effet Ken Burns.
const simulateVideoFromImage = async (base64ImageWithHeader: string): Promise<string> => {
    console.log("Simulation vidéo active...");
    await new Promise(resolve => setTimeout(resolve, 1500)); // Petit délai pour l'effet de chargement
    return base64ImageWithHeader;
}

// --- FONCTIONS EXPORTÉES ---

export const regenerateAudio = async (text: string): Promise<string | undefined> => {
    try {
        return await generateElevenLabsAudio(text);
    } catch (e) {
        console.error("Echec régénération audio:", e);
        return undefined;
    }
};

export const regenerateStoryImage = async (
  currentPrompt: string, 
  style: ImageStyle,
  mediaType: MediaType,
  videoFormat?: VideoFormat
): Promise<{ imageUrl: string; videoUrl?: string; videoError?: string; videoFormat?: VideoFormat; isVideoSimulated?: boolean }> => {
  
  // 1. Génération Image (Via API Gratuite)
  let imageUrl = "";
  try {
      imageUrl = await generateFreeImage(currentPrompt, style);
  } catch (e) {
      throw new Error("La régénération de l'image a échoué.");
  }

  // 2. Si c'était une vidéo, on simule la vidéo
  let videoUrl: string | undefined;
  let isVideoSimulated = false;

  if (mediaType === MediaType.VIDEO && imageUrl) {
      videoUrl = await simulateVideoFromImage(imageUrl);
      isVideoSimulated = true;
  }

  return { imageUrl, videoUrl, videoFormat, isVideoSimulated };
};

export const generateFullStory = async (request: StoryRequest): Promise<GeneratedStory> => {
    
    // Initialisation correcte de Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

  try {
    // === 1. TEXT GENERATION (Foundation) ===
    
    const culturePrompt = request.includeHaitianCulture
      ? "IMPORTANT: Intégrez naturellement des références haïtiennes (lieux, proverbes, culture) dans le récit sans le forcer."
      : "";

    const isEducational = request.genre === StoryGenre.EDUCATIONAL;
    const isVideoMode = request.mediaType === MediaType.VIDEO;

    let systemInstruction = "";
    let taskDescription = "";
    let constraints = "";

    // CONTRAINTES STRICTES DE NARRATION
    const narrativeConstraints = `
    RÈGLES DE NARRATION STRICTES :
    1. NE PAS utiliser de titres explicites comme "Introduction", "Développement", "Concept Clé", "Résumé", "Conclusion".
    2. Le texte doit couler naturellement, comme si une personne parlait.
    3. PAS de listes à puces ou de numérotation, sauf si absolument nécessaire pour une liste d'ingrédients ou d'étapes courtes.
    4. Expliquez les concepts directement dans le flux du récit.
    `;

    // CONFIGURATION DES CONTRAINTES DE LONGUEUR
    if (isVideoMode) {
        constraints = `
        CONTRAINTE VIDEO (15s) :
        - Texte EXTRÊMEMENT COURT (Max 40 mots).
        - Style script dynamique pour vidéo courte.
        ${narrativeConstraints}
        `;
    } else {
        constraints = `
        - Soyez complet et pédagogue mais conversationnel.
        ${narrativeConstraints}
        `;
    }

    if (isEducational) {
        systemInstruction = `Vous êtes un guide pédagogue expert. Vous expliquez les choses comme si vous parliez à un élève en face de vous.`;
        taskDescription = `Expliquez le sujet : "${request.topic}".`;
    } else {
        systemInstruction = "Vous êtes un conteur captivant.";
        taskDescription = `Racontez une histoire sur : "${request.topic}".`;
    }

    const prompt = `
      ${systemInstruction}
      
      TÂCHE : ${taskDescription}
      
      ${constraints}

      PARAMÈTRES :
      - Public : ${request.ageGroup} (Adaptez le vocabulaire et le ton)
      - Langue : ${request.language}
      ${culturePrompt}

      IMAGE PROMPT (Important) :
      Générez également une description visuelle EN ANGLAIS pour le générateur d'images.
      
      Retournez la réponse au format JSON :
      {
        "title": "Un titre court et accrocheur",
        "content": "Le texte narratif fluide",
        "imagePrompt": "Description visuelle (Anglais)"
      }
    `;

    // Configuration du Modèle avec le Schema JSON
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash", // Utilisation de la version stable
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: SchemaType.OBJECT,
                properties: {
                    title: { type: SchemaType.STRING },
                    content: { type: SchemaType.STRING },
                    imagePrompt: { type: SchemaType.STRING },
                },
                required: ["title", "content", "imagePrompt"],
            }
        }
    });

    // Génération du contenu
    const result = await model.generateContent(prompt);
    const textResponse = result.response.text();
    
    // Parsing du JSON
    const textData = JSON.parse(textResponse || '{}');
    const title = textData.title || "Sans titre";
    const content = textData.content || "Aucun contenu généré.";
    const imagePromptText = textData.imagePrompt || `Educational illustration about ${request.topic}`;

    // === 2. IMAGE GENERATION (API Gratuite - Pollinations) ===
    
    let imageUrl: string | undefined;
    
    if (request.mediaType !== MediaType.TEXT_ONLY) {
        try {
            const cultureStyle = request.includeHaitianCulture ? "Caribbean aesthetic, vibrant colors, " : "";
            const finalImagePrompt = `${imagePromptText}, ${cultureStyle}`;
            
            // Appel à l'API Gratuite
            imageUrl = await generateFreeImage(finalImagePrompt, request.imageStyle);
            
        } catch (imgError) {
            console.warn("Image generation failed:", imgError);
        }
    }

    // === 3. VIDEO GENERATION (SIMULATION) ===
    let videoUrl: string | undefined;
    let isVideoSimulated = false;
    
    if (request.mediaType === MediaType.VIDEO) {
        if (imageUrl) {
             // On utilise l'image comme source de vidéo simulée
             videoUrl = await simulateVideoFromImage(imageUrl);
             isVideoSimulated = true;
        }
    }

    // === 4. AUDIO GENERATION (ElevenLabs) ===
    let audioUrl: string | undefined;
    try {
        audioUrl = await generateElevenLabsAudio(content);
    } catch (audioError) {
        console.warn("Audio generation failed:", audioError);
    }

    return {
        title,
        content,
        imageUrl, 
        audioUrl,
        videoUrl,
        imagePrompt: imagePromptText,
        videoFormat: request.videoFormat,
        isVideoSimulated
    };

  } catch (error: any) {
    console.error("Content generation failed:", error);
    throw new Error(error.message || "Échec de la génération.");
  }
  // --- AJOUTS POUR LE CHAT SOCRATIQUE ---

// 1. Génère la première question d'ouverture basées sur l'histoire
export const generateInitialQuestion = async (storyContent: string): Promise<string> => {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
    Basé sur le contenu éducatif ou narratif suivant :
    "${storyContent.substring(0, 2000)}..." (extrait)

    TÂCHE : Pose une question courte, intrigante et ouverte à l'utilisateur pour le pousser à réfléchir sur la morale, le concept scientifique ou l'émotion de l'histoire.
    La question doit inviter à la discussion. Ne fais pas de longs préambules. Pose juste la question.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
};

// 2. Gère la conversation continue
export const sendChatMessage = async (history: ChatMessage[], newMessage: string, context: string): Promise<string> => {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // On transforme l'historique pour le format de Gemini
    const chatHistory = [
        {
            role: "user",
            parts: [{ text: `Voici le contexte de notre discussion (l'histoire que je viens de lire) : ${context}` }]
        },
        {
            role: "model",
            parts: [{ text: "Bien compris. Je suis prêt à discuter de cette histoire avec vous en utilisant la méthode socratique. Je poserai des questions pour guider votre réflexion." }]
        },
        ...history.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }))
    ];

    const chat = model.startChat({
        history: chatHistory as any, // "as any" pour éviter les conflits de typage stricts ici
        generationConfig: {
            maxOutputTokens: 300,
        },
    });

    const result = await chat.sendMessage(newMessage);
    return result.response.text();
};
};
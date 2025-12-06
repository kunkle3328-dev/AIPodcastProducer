
import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { GenerationOptions, VoiceStyle, ShowNotes, EpisodeTone } from '../types';

// IMPORTANT: This service assumes the API key is set in the environment.
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.warn("API_KEY environment variable not set. Using a placeholder. AI features will not work.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY || "YOUR_API_KEY_HERE" });

export const generatePodcastScript = async (options: GenerationOptions): Promise<{title: string, script: string}> => {
  const { topic, length, tone, isTwoHost } = options;
  const lengthInMinutes = length === 'short' ? 8 : length === 'medium' ? 18 : 30;
  
  // Specific personality instructions based on tone
  let toneInstructions = "";
  switch(tone) {
      case "heated-debate":
          toneInstructions = "The hosts should strongly disagree. Use interruptions (indicated by '--'), fast-paced banter, and emotional reactions. Host A supports the topic, Host B is skeptical/critical. It should feel intense but professional.";
          break;
      case "deep-dive":
          toneInstructions = "Extremely detailed, academic yet accessible. Use analogies. Focus on the 'why' and 'how'. Go down rabbit holes. The pacing should be thoughtful.";
          break;
      case "news-style":
          toneInstructions = "Fast, professional, broadcast journalism style. Use phrases like 'Breaking down', 'Just in', 'The headline is'. Minimal small talk, maximum information density.";
          break;
      case "storytelling":
          toneInstructions = "Narrative driven. Host A is the storyteller, Host B is the audience surrogate asking 'And then what happened?'. Use vivid imagery and suspense.";
          break;
      default:
          toneInstructions = "Natural, friendly, and conversational. Use humor, personal anecdotes, and clear explanations.";
  }

  const hostSetup = isTwoHost 
    ? "The podcast has two hosts, 'Alex' (Main Anchor) and 'Ben' (Co-host/Color commentator). Alternate speakers frequently. Include natural human sounds like [laughs], [sighs], [clears throat], [pause] to make it realistic." 
    : "The podcast has a single host, 'Alex'. Include natural pauses and rhetorical questions.";

  const prompt = `
    You are a world-class podcast producer and scriptwriter.
    Generate a complete, studio-quality podcast script.

    Parameters:
    - Topic: ${topic}
    - Target Length: ~${lengthInMinutes} minutes (approx ${lengthInMinutes * 150} words)
    - Tone: ${tone}
    - Style Guide: ${toneInstructions}
    - Format: ${hostSetup}

    The output must be a JSON object with two keys: "title" and "script".
    - "title": A catchy, viral-worthy title.
    - "script": The full script. 
      - Use markdown headers (e.g., '## Segment 1').
      - **CRITICAL**: Format dialogue as "Alex: [text]" or "Ben: [text]".
      - **CRITICAL**: Start with [Intro Music Fades In] and end with [Outro Music Fades Out].
      - Add sound effect cues in brackets e.g., [Sound effect: notification ping].
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            script: { type: Type.STRING },
          },
          required: ["title", "script"],
        }
      }
    });

    const text = response.text?.trim();
    if (!text) throw new Error("No script generated");
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating podcast script:", error);
    throw new Error("Failed to generate podcast script. Please check your API key and try again.");
  }
};

const MALE_VOICES: VoiceStyle[] = ["Zephyr", "Puck", "Charon", "Chiron"];

export const generatePodcastAudio = async (script: string, voiceStyle: VoiceStyle, isTwoHost: boolean, secondaryVoiceStyle?: VoiceStyle): Promise<string> => {
    
    let prompt: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let speechConfig: any; 

    // Pre-processing script to remove stage directions for audio generation to save tokens/improve flow
    // We keep them in the display script, but the TTS model sometimes reads them if not careful.
    // However, the Gemini TTS model is smart enough to ignore brackets usually, but let's be safe.
    // actually, for this specific model, it's better to leave them if they are cues, but distinct speaker names are vital.

    if (isTwoHost) {
        prompt = `
        Generate a multi-speaker audio podcast based on this script.
        Speakers: Alex (Host 1) and Ben (Host 2).
        Tone: Professional, engaging, and dynamic.
        
        Script:
        ${script}
        `;

        const isPrimaryVoiceMale = MALE_VOICES.includes(voiceStyle);
        const secondaryVoice: VoiceStyle = secondaryVoiceStyle || (isPrimaryVoiceMale ? 'Kore' : 'Zephyr');

        speechConfig = {
            multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: [
                    {
                        speaker: 'Alex',
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: voiceStyle }
                        }
                    },
                    {
                        speaker: 'Ben',
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: secondaryVoice }
                        }
                    }
                ]
            }
        };

    } else {
        prompt = `
        Read this podcast script with a consistent, engaging professional voice.
        Script:
        ${script}
        `;
        speechConfig = {
            voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceStyle },
            },
        };
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: speechConfig,
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data received from API.");
        }
        return base64Audio;
    } catch (error) {
        console.error("Error generating podcast audio:", error);
        throw new Error("Failed to generate podcast audio. The TTS model may be unavailable.");
    }
};

export const generateCoverArt = async (title: string): Promise<string> => {
    const prompt = `
        Design a high-quality, square podcast cover art.
        Title: "${title}"
        Style: Modern, vibrant, minimal, 3D abstract shapes, neon lighting, dark background, 8k resolution.
        Ensure the text is legible and centered.
    `;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
        });
        
        if (response.candidates?.[0]?.content?.parts) {
             for (const p of response.candidates[0].content.parts) {
                 if (p.inlineData) {
                     return p.inlineData.data;
                 }
             }
        }
        throw new Error("No image data received from API.");
    } catch (error) {
        console.error("Error generating cover art:", error);
        throw new Error("Failed to generate cover art. The image model may be unavailable.");
    }
};

export const generateShowNotes = async (title: string, script: string): Promise<ShowNotes> => {
    const prompt = `
        Generate JSON show notes for the podcast "${title}".
        Keys: "summary", "takeaways" (array), "socialPost".
        Script context: ${script.substring(0, 4000)}...
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        takeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
                        socialPost: { type: Type.STRING },
                    },
                    required: ["summary", "takeaways", "socialPost"],
                }
            }
        });
        const text = response.text?.trim();
        if (!text) throw new Error("No text generated for show notes");
        return JSON.parse(text);
    } catch (error) {
        console.error("Error generating show notes:", error);
        throw new Error("Failed to generate show notes.");
    }
};

export const generateSpinoffs = async (title: string, script: string): Promise<Array<{title: string, description: string}>> => {
    const prompt = `
        Suggest 3 spin-off episode ideas for "${title}".
        Script context: ${script.substring(0, 3000)}...
        Return JSON array of objects with "title" and "description".
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            description: { type: Type.STRING }
                        },
                         required: ["title", "description"]
                    }
                }
            }
        });
        const text = response.text?.trim();
        if (!text) throw new Error("No spinoffs generated");
        return JSON.parse(text);
    } catch (error) {
        console.error("Error generating spinoffs:", error);
        return [];
    }
}

export const getHostChatModel = (script: string, hostName: string) => {
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: `You are ${hostName}, the host of this podcast. 
            Answer listener questions based ONLY on the script. 
            Be brief, witty, and stay in character. 
            Script: ${script}`
        }
    });
};

// Generate audio for the host's answer in the chat
export const generateHostResponseAudio = async (text: string, voiceStyle: VoiceStyle): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceStyle },
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio generated");
        return base64Audio;
    } catch (error) {
        console.error("Error generating host response audio:", error);
        throw error;
    }
};


import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader, Volume2, PhoneIncoming } from 'lucide-react';
import { Button } from './ui/Button';
import { GlassCard } from './ui/GlassCard';
import { Modal } from './ui/Modal';
import { getHostChatModel, generateHostResponseAudio } from '../services/geminiService';
import type { GenerateContentResponse, Chat } from "@google/genai";
import type { VoiceStyle } from '../types';

interface AskHostModalProps {
    isOpen: boolean;
    onClose: () => void;
    script: string;
    hostName: string;
    voiceStyle: VoiceStyle;
    mainAudioRef: React.RefObject<HTMLAudioElement>;
}

interface Message {
    role: 'user' | 'model';
    text: string;
    audioUrl?: string;
}

export const AskHostModal: React.FC<AskHostModalProps> = ({ isOpen, onClose, script, hostName, voiceStyle, mainAudioRef }) => {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: `Hey there! I'm ${hostName}. We're live! What's on your mind?` }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPlayingResponse, setIsPlayingResponse] = useState(false);
    
    const chatSession = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const responseAudioRef = useRef<HTMLAudioElement | null>(null);
    const ringtoneRef = useRef<HTMLAudioElement | null>(null);

    // Initialize ringtone
    useEffect(() => {
        ringtoneRef.current = new Audio('https://cdn.pixabay.com/audio/2022/03/24/audio_73e7210215.mp3'); // Simple beep/ring sound
        ringtoneRef.current.volume = 0.5;
        responseAudioRef.current = new Audio();
        
        responseAudioRef.current.onended = () => {
             setIsPlayingResponse(false);
             // Resume main podcast
             if (mainAudioRef.current) {
                 mainAudioRef.current.play().catch(e => console.log("Resume failed", e));
                 mainAudioRef.current.volume = 1.0; // Restore volume
             }
        };

        return () => {
            if (responseAudioRef.current) {
                responseAudioRef.current.pause();
                responseAudioRef.current.src = "";
            }
        }
    }, [mainAudioRef]);

    useEffect(() => {
        if (isOpen && !chatSession.current) {
            chatSession.current = getHostChatModel(script, hostName);
        }
    }, [isOpen, script, hostName]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !chatSession.current) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        // 1. Pause Main Audio
        if (mainAudioRef.current && !mainAudioRef.current.paused) {
            mainAudioRef.current.pause();
        }

        // 2. Play Ringtone effect
        if (ringtoneRef.current) {
            ringtoneRef.current.play().catch(e => console.error("Ringtone fail", e));
        }

        try {
            // 3. Get Text Response
            const result: GenerateContentResponse = await chatSession.current.sendMessage({ 
                message: `A live caller just asked: "${userMsg}". Answer them directly as if on air.` 
            });
            const responseText = result.text || "Sorry, we're having some technical difficulties on the line.";
            
            // 4. Generate Audio Response
            let audioUrl = undefined;
            try {
                const base64Audio = await generateHostResponseAudio(responseText, voiceStyle);
                // Convert PCM to WAV for playback using local helper
                audioUrl = `data:audio/wav;base64,${pcmToWav(base64Audio)}`;
            } catch (audioErr) {
                console.error("Audio gen failed", audioErr);
            }

            setMessages(prev => [...prev, { role: 'model', text: responseText, audioUrl }]);

            // 5. Play Response
            if (audioUrl && responseAudioRef.current) {
                responseAudioRef.current.src = audioUrl;
                setIsPlayingResponse(true);
                responseAudioRef.current.play();
            } else {
                // If no audio, resume main audio after a short delay
                setTimeout(() => {
                     if (mainAudioRef.current) mainAudioRef.current.play();
                }, 2000);
            }

        } catch (error) {
            console.error("Chat error", error);
            setMessages(prev => [...prev, { role: 'model', text: "Sorry, I'm having trouble connecting to the studio right now." }]);
            if (mainAudioRef.current) mainAudioRef.current.play();
        } finally {
            setIsLoading(false);
        }
    };

    // Minimal PCM to WAV helper for this component
    const pcmToWav = (base64Pcm: string) => {
         const binaryString = atob(base64Pcm);
         const len = binaryString.length;
         const pcmData = new Uint8Array(len);
         for (let i = 0; i < len; i++) { pcmData[i] = binaryString.charCodeAt(i); }
         
         const sampleRate = 24000;
         const numChannels = 1;
         const bitsPerSample = 16;
         const blockAlign = (numChannels * bitsPerSample) / 8;
         const byteRate = sampleRate * blockAlign;
         const dataSize = pcmData.length;
         
         const header = new ArrayBuffer(44);
         const view = new DataView(header);
         
         view.setUint32(0, 1380533830, false); // RIFF
         view.setUint32(4, 36 + dataSize, true);
         view.setUint32(8, 1463899717, false); // WAVE
         view.setUint32(12, 1718449184, false); // fmt 
         view.setUint32(16, 16, true); 
         view.setUint16(20, 1, true); 
         view.setUint16(22, numChannels, true);
         view.setUint32(24, sampleRate, true);
         view.setUint32(28, byteRate, true);
         view.setUint16(32, blockAlign, true);
         view.setUint16(34, bitsPerSample, true);
         view.setUint32(36, 1684108385, false); // data
         view.setUint32(40, dataSize, true);
         
         const wavBytes = new Uint8Array(44 + dataSize);
         wavBytes.set(new Uint8Array(header), 0);
         wavBytes.set(pcmData, 44);
         
         let binaryWav = '';
         for (let i = 0; i < wavBytes.byteLength; i++) { binaryWav += String.fromCharCode(wavBytes[i]); }
         return btoa(binaryWav);
    }

    return (
        <Modal isOpen={isOpen} onClose={() => {
            if (responseAudioRef.current) responseAudioRef.current.pause();
            if (mainAudioRef.current) mainAudioRef.current.play().catch(() => {});
            onClose();
        }} title={`Live Line: ${hostName}`}>
            <div className="flex flex-col h-[500px]">
                {/* Visualizer Header */}
                <div className="bg-black/30 p-2 rounded-t-lg flex items-center justify-center h-12 border-b border-white/5">
                    {isPlayingResponse ? (
                        <div className="flex items-center gap-1">
                             <span className="w-1 h-3 bg-cyan-400 animate-bounce"></span>
                             <span className="w-1 h-5 bg-cyan-400 animate-bounce delay-75"></span>
                             <span className="w-1 h-4 bg-cyan-400 animate-bounce delay-150"></span>
                             <span className="text-cyan-400 text-xs font-bold ml-2 tracking-widest uppercase">On Air</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-widest">
                            <PhoneIncoming size={14} />
                            Lines Open
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 p-4 custom-scrollbar">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-cyan-500 text-white' : 'bg-fuchsia-500 text-white'}`}>
                                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed flex flex-col gap-2 ${
                                msg.role === 'user' 
                                ? 'bg-cyan-500/20 text-cyan-50 rounded-tr-none border border-cyan-500/30' 
                                : 'bg-white/10 text-gray-200 rounded-tl-none border border-white/10'
                            }`}>
                                <p>{msg.text}</p>
                                {msg.audioUrl && (
                                    <div className="flex items-center gap-2 text-xs text-fuchsia-300 opacity-75">
                                        <Volume2 size={12} />
                                        <span>Audio generated</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-3">
                             <div className="w-8 h-8 rounded-full bg-fuchsia-500 text-white flex items-center justify-center flex-shrink-0 animate-pulse">
                                <Bot size={16} />
                            </div>
                             <div className="bg-white/10 p-3 rounded-2xl rounded-tl-none border border-white/10 flex items-center gap-2">
                                <Loader size={16} className="animate-spin text-fuchsia-400"/>
                                <span className="text-xs text-gray-400">Host is speaking...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSend} className="mt-auto flex gap-2 pt-4 border-t border-white/10">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your question for the host..."
                        className="flex-1 bg-black/20 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                        disabled={isLoading || isPlayingResponse}
                    />
                    <Button type="submit" disabled={isLoading || !input.trim() || isPlayingResponse} className="px-4 py-2">
                        <Send size={18} />
                    </Button>
                </form>
            </div>
        </Modal>
    );
};

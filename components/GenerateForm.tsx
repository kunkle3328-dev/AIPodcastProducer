
import React, { useState, useEffect } from 'react';
import type { GenerationOptions, EpisodeLength, EpisodeTone, VoiceStyle, MusicMood, Episode } from '../types';
import { Button } from './ui/Button';
import { GlassCard } from './ui/GlassCard';
import { generatePodcastScript, generatePodcastAudio, generateCoverArt } from '../services/geminiService';
import { api } from '../services/mockApi';
import { Bot, Clapperboard, Music, Sparkles, Mic, Users, Zap } from 'lucide-react';

interface GenerateFormProps {
    onGenerationComplete: (newEpisode: Episode) => void;
    initialTopic?: string;
}

const LabelledInput: React.FC<{ label: string; icon: React.ReactNode; children: React.ReactNode }> = ({ label, icon, children }) => (
    <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
            {icon} {label}
        </label>
        {children}
    </div>
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
    <select {...props} className={`bg-white/10 border border-white/20 rounded-lg p-3 text-white focus:ring-cyan-500 focus:border-cyan-500 w-full ${props.className}`}>
        {props.children}
    </select>
);

export const GenerateForm: React.FC<GenerateFormProps> = ({ onGenerationComplete, initialTopic = '' }) => {
  const [options, setOptions] = useState<Omit<GenerationOptions, 'topic'>>(() => {
      // Load defaults from local storage if available
      const savedDefaults = localStorage.getItem('default_options');
      const defaults = savedDefaults ? JSON.parse(savedDefaults) : {};
      
      return {
        length: defaults.length || 'short',
        tone: defaults.tone || 'conversational',
        voiceStyle: defaults.voiceStyle || 'Zephyr',
        secondaryVoiceStyle: 'Kore',
        musicMood: defaults.musicMood || 'uplifting',
        isTwoHost: true, // Default to two hosts now
      };
  });

  const [topic, setTopic] = useState(initialTopic);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTopic) {
        setTopic(initialTopic);
    }
  }, [initialTopic]);

  const allVoices: { value: VoiceStyle, label: string }[] = [
      { value: 'Zephyr', label: 'Zephyr (Friendly Male)' },
      { value: 'Kore', label: 'Kore (Warm Female)' },
      { value: 'Puck', label: 'Puck (Energetic Male)' },
      { value: 'Charon', label: 'Charon (Deep Male)' },
      { value: 'Fenrir', label: 'Fenrir (Professional Female)' },
      { value: 'Chiron', label: 'Chiron (Authoritative Male)' },
      { value: 'Cria', label: 'Cria (Youthful Female)' },
      { value: 'Siren', label: 'Siren (Elegant Female)' },
  ];

  const handleHostChange = (isTwo: boolean) => {
    setOptions(prev => {
        const newOptions = { ...prev, isTwoHost: isTwo };
        if (isTwo && newOptions.voiceStyle === newOptions.secondaryVoiceStyle) {
            const differentVoice = allVoices.find(v => v.value !== newOptions.voiceStyle);
            if (differentVoice) {
                newOptions.secondaryVoiceStyle = differentVoice.value;
            }
        }
        return newOptions;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
        setError('Please enter a topic for your podcast.');
        return;
    }
    setError(null);
    setIsLoading(true);

    try {
        setLoadingMessage('Step 1/3: Crafting the perfect script...');
        // Step 1: Script (Critical - if this fails, we stop)
        const { title, script } = await generatePodcastScript({ ...options, topic });
        
        // Step 2: Audio (Optional - catch errors to prevent app from getting stuck)
        let audioURL = '';
        try {
            setLoadingMessage('Step 2/3: Generating realistic voiceover...');
            audioURL = await generatePodcastAudio(script, options.voiceStyle, options.isTwoHost, options.secondaryVoiceStyle);
        } catch (audioErr) {
            console.error("Audio generation skipped due to error:", audioErr);
        }

        // Step 3: Cover Art (Optional)
        let coverArtURL = '';
        try {
            setLoadingMessage('Step 3/3: Designing stunning cover art...');
            coverArtURL = await generateCoverArt(title);
        } catch (artErr) {
             console.error("Cover art generation skipped due to error:", artErr);
        }

        setLoadingMessage('Finalizing your episode...');
        const newEpisodeData = {
            userId: 'user-123',
            title,
            script,
            audioURL,
            coverArtURL,
            voiceStyle: options.voiceStyle,
            lengthInMinutes: options.length === 'short' ? 8 : options.length === 'medium' ? 18 : 30,
        };

        const savedEpisode = await api.saveEpisode(newEpisodeData);
        onGenerationComplete(savedEpisode);
        setTopic('');

    } catch (err) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('An unknown error occurred during generation.');
        }
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  };

  return (
    <GlassCard className="p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><Clapperboard /> Create New Episode</h2>
        {error && <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-lg">{error}</div>}
        
        <LabelledInput label="Podcast Topic" icon={<Bot size={16}/>}>
            <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., The ethical implications of AI in healthcare"
                className="bg-white/10 border border-white/20 rounded-lg p-3 text-white focus:ring-cyan-500 focus:border-cyan-500 w-full min-h-[100px]"
                rows={4}
                disabled={isLoading}
            />
        </LabelledInput>

        <div className="grid md:grid-cols-2 gap-6">
            <LabelledInput label="Episode Length" icon={<Sparkles size={16}/>}>
                <Select value={options.length} onChange={(e) => setOptions(prev => ({...prev, length: e.target.value as EpisodeLength}))} disabled={isLoading}>
                    <option value="short">Short (5-10 min)</option>
                    <option value="medium">Medium (15-20 min)</option>
                    <option value="long">Long (30+ min)</option>
                </Select>
            </LabelledInput>
             <LabelledInput label="Tone & Style" icon={<Zap size={16}/>}>
                <Select value={options.tone} onChange={(e) => setOptions(prev => ({...prev, tone: e.target.value as EpisodeTone}))} disabled={isLoading}>
                    <option value="conversational">Conversational (Friendly)</option>
                    <option value="heated-debate">Heated Debate (Intense)</option>
                    <option value="deep-dive">Deep Dive (Analytical)</option>
                    <option value="news-style">News Style (Fast & Formal)</option>
                    <option value="storytelling">Storytelling (Narrative)</option>
                    <option value="motivational">Motivational (Inspiring)</option>
                    <option value="educational">Educational (Structured)</option>
                </Select>
            </LabelledInput>
             <LabelledInput label={options.isTwoHost ? 'Host 1 (Alex)' : 'Host Voice'} icon={<Mic size={16}/>}>
                <Select value={options.voiceStyle} onChange={(e) => {
                     const newVoice = e.target.value as VoiceStyle;
                      setOptions(prev => {
                        const updatedOptions = {...prev, voiceStyle: newVoice};
                        if (prev.isTwoHost && newVoice === prev.secondaryVoiceStyle) {
                            const otherVoice = allVoices.find(v => v.value !== newVoice);
                            if (otherVoice) {
                                updatedOptions.secondaryVoiceStyle = otherVoice.value;
                            }
                        }
                        return updatedOptions;
                    })
                }} disabled={isLoading}>
                    {allVoices.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                </Select>
            </LabelledInput>
            {options.isTwoHost && (
                <LabelledInput label="Host 2 (Ben)" icon={<Mic size={16}/>}>
                    <Select 
                        value={options.secondaryVoiceStyle} 
                        onChange={(e) => setOptions(prev => ({...prev, secondaryVoiceStyle: e.target.value as VoiceStyle}))} 
                        disabled={isLoading}
                    >
                        {allVoices.filter(v => v.value !== options.voiceStyle).map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                    </Select>
                </LabelledInput>
            )}
             <LabelledInput label="Background Music" icon={<Music size={16}/>}>
                <Select value={options.musicMood} onChange={(e) => setOptions(prev => ({...prev, musicMood: e.target.value as MusicMood}))} disabled={isLoading}>
                    <option value="uplifting">Uplifting</option>
                    <option value="calm">Calm</option>
                    <option value="corporate">Corporate</option>
                    <option value="tech">Tech</option>
                    <option value="cinematic">Cinematic</option>
                </Select>
            </LabelledInput>
        </div>

        <div className="flex items-center justify-between">
            <LabelledInput label="Studio Setup" icon={<Users size={16}/>}>
                <div className="flex items-center gap-4 bg-white/10 border border-white/20 rounded-lg p-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="host" checked={!options.isTwoHost} onChange={() => handleHostChange(false)} className="form-radio bg-gray-700" disabled={isLoading}/>
                        Solo Host
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="host" checked={options.isTwoHost} onChange={() => handleHostChange(true)} className="form-radio bg-gray-700" disabled={isLoading}/>
                        Dual Hosts
                    </label>
                </div>
            </LabelledInput>
            <Button type="submit" isLoading={isLoading} className="mt-6 w-1/3">
                {isLoading ? loadingMessage : 'Create Episode'}
            </Button>
        </div>
      </form>
    </GlassCard>
  );
};

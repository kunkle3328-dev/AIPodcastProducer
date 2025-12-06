import React, { useState, useEffect } from 'react';
import type { User, VoiceStyle, EpisodeLength, EpisodeTone, MusicMood } from '../types';
import { GlassCard } from './ui/GlassCard';
import { Button } from './ui/Button';
import { Save, Trash2, User as UserIcon, Settings as SettingsIcon, Bell } from 'lucide-react';
import { api } from '../services/mockApi';

interface SettingsProps {
    user: User;
}

// Reusing options from GenerateForm (Ideally these would be in a constants file)
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

export const Settings: React.FC<SettingsProps> = ({ user }) => {
    const [defaults, setDefaults] = useState({
        length: 'short' as EpisodeLength,
        tone: 'conversational' as EpisodeTone,
        voiceStyle: 'Zephyr' as VoiceStyle,
        musicMood: 'uplifting' as MusicMood,
    });
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    useEffect(() => {
        const saved = localStorage.getItem('default_options');
        if (saved) {
            try {
                setDefaults(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse saved defaults", e);
            }
        }
    }, []);

    const handleSaveDefaults = () => {
        setSaveStatus('saving');
        localStorage.setItem('default_options', JSON.stringify(defaults));
        setTimeout(() => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }, 800);
    };

    const handleClearData = async () => {
        if (confirm("Are you sure you want to delete all your generated episodes? This cannot be undone.")) {
            await api.clearAllData();
            window.location.reload();
        }
    };

    const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
        <select {...props} className="bg-black/20 border border-white/10 rounded-lg p-2.5 text-white focus:ring-cyan-500 focus:border-cyan-500 w-full text-sm">
            {props.children}
        </select>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>

            {/* Account Section */}
            <GlassCard className="p-6">
                <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
                    <div className="bg-cyan-500/20 p-3 rounded-full text-cyan-400">
                        <UserIcon size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Account Information</h3>
                        <p className="text-sm text-gray-400">Manage your profile details</p>
                    </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Display Name</label>
                        <input type="text" value={user.name} disabled className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-gray-300 cursor-not-allowed" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                        <input type="email" value={user.email} disabled className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-gray-300 cursor-not-allowed" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Current Plan</label>
                        <div className="w-full bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-3 text-cyan-300 font-medium uppercase text-sm">
                            {user.plan}
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Credits</label>
                         <div className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white">
                            {user.credits} remaining
                        </div>
                    </div>
                </div>
            </GlassCard>

            {/* Generation Defaults */}
            <GlassCard className="p-6">
                 <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
                    <div className="bg-fuchsia-500/20 p-3 rounded-full text-fuchsia-400">
                        <SettingsIcon size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Generation Defaults</h3>
                        <p className="text-sm text-gray-400">Set your preferred default options for new episodes</p>
                    </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                     <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Default Length</label>
                        <Select value={defaults.length} onChange={(e) => setDefaults({...defaults, length: e.target.value as EpisodeLength})}>
                            <option value="short">Short (5-10 min)</option>
                            <option value="medium">Medium (15-20 min)</option>
                            <option value="long">Long (30+ min)</option>
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Default Tone</label>
                        <Select value={defaults.tone} onChange={(e) => setDefaults({...defaults, tone: e.target.value as EpisodeTone})}>
                            <option value="educational">Educational</option>
                            <option value="conversational">Conversational</option>
                            <option value="storytelling">Storytelling</option>
                            <option value="motivational">Motivational</option>
                            <option value="branded">Branded</option>
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Default Voice</label>
                        <Select value={defaults.voiceStyle} onChange={(e) => setDefaults({...defaults, voiceStyle: e.target.value as VoiceStyle})}>
                             {allVoices.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Default Music</label>
                        <Select value={defaults.musicMood} onChange={(e) => setDefaults({...defaults, musicMood: e.target.value as MusicMood})}>
                            <option value="uplifting">Uplifting</option>
                            <option value="calm">Calm</option>
                            <option value="corporate">Corporate</option>
                            <option value="tech">Tech</option>
                            <option value="cinematic">Cinematic</option>
                        </Select>
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <Button onClick={handleSaveDefaults} disabled={saveStatus === 'saving'}>
                        <Save size={18} />
                        {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Defaults'}
                    </Button>
                </div>
            </GlassCard>

             {/* Danger Zone */}
             <GlassCard className="p-6 border-red-500/20">
                <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
                    <div className="bg-red-500/20 p-3 rounded-full text-red-400">
                        <Trash2 size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Danger Zone</h3>
                        <p className="text-sm text-gray-400">Irreversible actions</p>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white font-medium">Clear All Data</p>
                        <p className="text-sm text-gray-400">Delete all your generated episodes and scripts locally.</p>
                    </div>
                    <button 
                        onClick={handleClearData}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        Clear Data
                    </button>
                </div>
            </GlassCard>
        </div>
    );
};

import React, { useState, useRef } from 'react';
import type { User, Episode, ShowNotes } from '../types';
import { GlassCard } from './ui/GlassCard';
import { AudioPlayer } from './AudioPlayer';
import { TranscriptViewer } from './TranscriptViewer';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { AskHostModal } from './AskHostModal';
import { generateShowNotes, generateSpinoffs } from '../services/geminiService';
import { Download, Share2, Clock, MicVocal, Sparkles, Clapperboard, Coins, Bot, FileText, ClipboardCopy, MessageCircle, Lightbulb } from 'lucide-react';

interface DashboardProps {
  user: User;
  episodes: Episode[];
  onCreateEpisode: () => void;
  onUseSpinoff: (topic: string) => void;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <GlassCard className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors duration-300">
        <div className="p-3 bg-cyan-500/20 rounded-lg text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">{icon}</div>
        <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-xl font-bold text-white">{value}</p>
        </div>
    </GlassCard>
);

const EpisodeCard: React.FC<{ episode: Episode; onUseSpinoff: (topic: string) => void }> = ({ episode, onUseSpinoff }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isTranscriptVisible, setIsTranscriptVisible] = useState(false);
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isSpinoffsOpen, setIsSpinoffsOpen] = useState(false);
    
    const [showNotes, setShowNotes] = useState<ShowNotes | null>(null);
    const [spinoffs, setSpinoffs] = useState<Array<{title: string, description: string}>>([]);
    
    const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
    const [isGeneratingSpinoffs, setIsGeneratingSpinoffs] = useState(false);
    
    const [shareText, setShareText] = useState('Share');
    const [copySocialText, setCopySocialText] = useState('Copy');
    
    const handleDownload = () => {
        const blob = new Blob([episode.script], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${episode.title.replace(/ /g, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleShare = () => {
        navigator.clipboard.writeText(`https://aipodcast.example.com/episode/${episode.id}`);
        setShareText('Copied!');
        setTimeout(() => setShareText('Share'), 2000);
    };

    const handleGenerateNotes = async () => {
        setIsGeneratingNotes(true);
        try {
            const notes = await generateShowNotes(episode.title, episode.script);
            setShowNotes(notes);
            setIsNotesModalOpen(true);
        } catch (error) {
            console.error("Failed to generate show notes", error);
            alert("Sorry, we couldn't generate show notes for this episode.");
        } finally {
            setIsGeneratingNotes(false);
        }
    };

    const handleGenerateSpinoffs = async () => {
        if (spinoffs.length > 0) {
            setIsSpinoffsOpen(true);
            return;
        }
        setIsGeneratingSpinoffs(true);
        try {
            const ideas = await generateSpinoffs(episode.title, episode.script);
            setSpinoffs(ideas);
            setIsSpinoffsOpen(true);
        } catch (error) {
             console.error("Failed to generate spinoffs", error);
        } finally {
            setIsGeneratingSpinoffs(false);
        }
    };
    
    const handleCopySocial = () => {
        if(showNotes?.socialPost) {
            navigator.clipboard.writeText(showNotes.socialPost);
            setCopySocialText('Copied!');
            setTimeout(() => setCopySocialText('Copy'), 2000);
        }
    }

    return (
        <GlassCard className="p-4 flex flex-col gap-4 overflow-hidden group hover:border-white/20 transition-all duration-300">
            <div className="flex flex-col md:flex-row gap-6">
                {/* Fixed aspect ratio container for cover art */}
                <div className="relative w-full md:w-56 aspect-square flex-shrink-0 rounded-xl overflow-hidden shadow-2xl bg-black">
                    <img 
                        src={episode.coverArtURL ? `data:image/png;base64,${episode.coverArtURL}` : "https://placehold.co/600x600/0f172a/38bdf8/png?text=Art"}
                        alt={`${episode.title} cover art`}
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                </div>
                
                <div className="flex-1 flex flex-col justify-between">
                    <div>
                        <div className="flex items-start justify-between">
                             <h3 className="text-2xl font-bold text-white leading-tight">{episode.title}</h3>
                             <span className="bg-cyan-500/10 text-cyan-400 text-xs px-2 py-1 rounded border border-cyan-500/20">{episode.lengthInMinutes}m</span>
                        </div>
                       
                        <div className="flex items-center gap-4 text-sm text-gray-400 mt-2">
                            <span className="flex items-center gap-1"><Clock size={14} /> {new Date(episode.createdAt).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><MicVocal size={14} /> {episode.voiceStyle}</span>
                        </div>
                    </div>
                    
                    <div className="mt-6 mb-4">
                        {episode.audioURL ? <AudioPlayer ref={audioRef} base64Audio={episode.audioURL} /> : (
                            <div className="text-center text-gray-500 p-4 bg-white/5 rounded-lg border border-white/5 border-dashed">Audio not available.</div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <Button onClick={handleGenerateNotes} isLoading={isGeneratingNotes} variant="secondary" className="text-xs py-2 h-auto">
                            <Bot size={14}/> Show Notes
                        </Button>
                        <Button onClick={() => setIsChatOpen(true)} variant="secondary" className="text-xs py-2 h-auto">
                             <MessageCircle size={14}/> Ask Host
                        </Button>
                        <Button onClick={handleGenerateSpinoffs} isLoading={isGeneratingSpinoffs} variant="secondary" className="text-xs py-2 h-auto">
                            <Lightbulb size={14}/> Spinoff Ideas
                        </Button>
                        <Button onClick={() => setIsTranscriptVisible(!isTranscriptVisible)} variant="secondary" className="text-xs py-2 h-auto">
                            <FileText size={14}/> {isTranscriptVisible ? 'Hide' : 'Show'} Script
                        </Button>
                    </div>
                     <div className="flex gap-4 mt-3 pt-3 border-t border-white/5">
                        <button onClick={handleDownload} className="text-gray-400 hover:text-white text-xs flex items-center gap-1 transition-colors"><Download size={12}/> Download TXT</button>
                        <button onClick={handleShare} className="text-gray-400 hover:text-white text-xs flex items-center gap-1 transition-colors"><Share2 size={12}/> {shareText}</button>
                    </div>
                </div>
            </div>

            {isTranscriptVisible && episode.audioURL && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <TranscriptViewer script={episode.script} audioRef={audioRef} />
                </div>
            )}

            {/* Modals */}
            <Modal isOpen={isNotesModalOpen} onClose={() => setIsNotesModalOpen(false)} title="AI-Generated Show Notes">
                {showNotes && (
                    <div className="space-y-6 text-gray-300">
                        <div className="bg-white/5 p-4 rounded-lg">
                            <h3 className="font-semibold text-lg text-white mb-2 flex items-center gap-2"><Sparkles size={18} className="text-cyan-400"/> Summary</h3>
                            <p className="leading-relaxed">{showNotes.summary}</p>
                        </div>
                         <div>
                            <h3 className="font-semibold text-lg text-white mb-3">Key Takeaways</h3>
                            <ul className="space-y-2">
                                {showNotes.takeaways.map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 bg-black/20 p-3 rounded-lg">
                                        <span className="bg-cyan-500/20 text-cyan-400 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0">{i + 1}</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                         <div>
                            <h3 className="font-semibold text-lg text-white mb-2">Social Media Post</h3>
                            <div className="bg-gradient-to-r from-cyan-900/20 to-fuchsia-900/20 p-4 rounded-lg italic border border-white/10 relative group">
                                {showNotes.socialPost}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button onClick={handleCopySocial} variant="secondary" className="text-xs py-1 px-2 h-auto">
                                        <ClipboardCopy size={12}/> {copySocialText}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={isSpinoffsOpen} onClose={() => setIsSpinoffsOpen(false)} title="Future Episode Ideas">
                <div className="space-y-4">
                    <p className="text-gray-400">Based on "{episode.title}", here are 3 great ideas for your next episode:</p>
                    {spinoffs.map((idea, i) => (
                        <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/10 hover:border-cyan-500/50 transition-colors">
                            <h4 className="text-lg font-bold text-cyan-400 mb-2">{idea.title}</h4>
                            <p className="text-gray-300 text-sm">{idea.description}</p>
                            <div className="mt-3 flex justify-end">
                                <button 
                                    onClick={() => onUseSpinoff(`${idea.title}: ${idea.description}`)}
                                    className="text-xs text-fuchsia-400 hover:text-fuchsia-300 font-medium hover:underline"
                                >
                                    Use this idea →
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>

            <AskHostModal 
                isOpen={isChatOpen} 
                onClose={() => setIsChatOpen(false)} 
                script={episode.script}
                hostName="Alex" 
                voiceStyle={episode.voiceStyle}
                mainAudioRef={audioRef}
            />
        </GlassCard>
    );
};


export const Dashboard: React.FC<DashboardProps> = ({ user, episodes, onCreateEpisode, onUseSpinoff }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard title="Plan" value={user.plan.charAt(0).toUpperCase() + user.plan.slice(1)} icon={<Sparkles size={24} />} />
          <StatCard title="Episodes Generated" value={episodes.length} icon={<Clapperboard size={24} />} />
          <StatCard title="Credits Remaining" value={user.credits} icon={<Coins size={24} />} />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Clapperboard className="text-fuchsia-500" /> Recent Episodes</h2>
        <div className="space-y-6">
            {episodes.length > 0 ? (
                episodes.map(ep => <EpisodeCard key={ep.id} episode={ep} onUseSpinoff={onUseSpinoff} />)
            ) : (
                <GlassCard className="p-12 text-center text-gray-400 flex flex-col items-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                        <MicVocal size={32} className="text-gray-600" />
                    </div>
                    <p className="text-lg font-medium text-white">Your studio is empty</p>
                    <p className="mb-6">Start creating your first AI-powered podcast episode.</p>
                    <Button onClick={onCreateEpisode} variant="primary">
                        Create Episode
                    </Button>
                </GlassCard>
            )}
        </div>
      </div>
    </div>
  );
};

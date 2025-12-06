
import React, { useState, useEffect, useMemo, useRef } from 'react';

interface TranscriptViewerProps {
  script: string;
  audioRef: React.RefObject<HTMLAudioElement>;
}

interface Word {
  text: string;
  startTime: number;
  endTime: number;
}

interface LineSegment {
    type: 'header' | 'direction' | 'dialogue';
    speaker?: string;
    words: number[]; // Indices into the global words array
    rawText: string;
    estimatedDuration?: number; // Used for non-dialogue lines like music cues
}

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({ script, audioRef }) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLSpanElement>(null);

  // Parse script and calculate timing using robust heuristics for directions + punctuation
  const { lines, allWords } = useMemo(() => {
    const rawLines = script.split('\n');
    const flatWords: Word[] = [];
    const segments: LineSegment[] = [];
    
    let globalWordCounter = 0;

    // 1. Parsing Phase
    rawLines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Headers
        if (trimmed.startsWith('#')) {
            segments.push({ type: 'header', rawText: trimmed.replace(/^#+\s*/, ''), words: [] });
            return;
        }

        // Stage Directions (Music, SFX)
        // These take up REAL TIME in the audio, so we must account for them.
        if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('(') && trimmed.endsWith(')'))) {
             segments.push({ 
                 type: 'direction', 
                 rawText: trimmed, 
                 words: [],
                 estimatedDuration: 4.0 // Estimate 4 seconds for music transitions/intros
             });
             return;
        }

        // Dialogue Parsing
        // Handle "Alex:", "Ben:", "**Alex**:", "Alex (Host):"
        let speaker = '';
        let content = trimmed;
        
        // Robust regex for speaker detection
        const speakerMatch = trimmed.match(/^(\*\*?)?([A-Za-z0-9 ]+?)(\*\*?)?(\s*\(.*?\))?:\s*(.*)/);
        
        if (speakerMatch) {
            speaker = speakerMatch[2].trim();
            content = speakerMatch[5].trim();
        }

        const lineWords = content.split(/\s+/).filter(w => w.length > 0);
        const wordIndices: number[] = [];

        lineWords.forEach(w => {
            flatWords.push({ text: w, startTime: 0, endTime: 0 }); 
            wordIndices.push(globalWordCounter++);
        });

        segments.push({
            type: 'dialogue',
            speaker,
            words: wordIndices,
            rawText: content
        });
    });

    // 2. Timing Phase
    // Goal: Map estimated "weight" to actual audio duration.
    const audioDuration = audioRef.current?.duration || 0;
    
    if (flatWords.length > 0 && isFinite(audioDuration) && audioDuration > 0) {
        
        // Calculate total "weight" of the entire script
        // Weight = Sum of Word Weights + Sum of Direction Durations (converted to weight units)
        
        const wordWeights = flatWords.map(w => {
            let weight = 1.0; // Base weight
            
            // Character length impact
            weight += w.text.length * 0.1;
            
            // Significant pauses for punctuation
            if (w.text.match(/[.!?]+$/)) weight += 2.5; // End of sentence = long pause
            else if (w.text.match(/[,;:]+$/)) weight += 1.0; // Comma = medium pause
            
            return weight;
        });

        const totalWordWeight = wordWeights.reduce((a, b) => a + b, 0);
        
        // Calculate duration reserved for stage directions (music, sfx)
        const totalDirectionDuration = segments.reduce((acc, seg) => {
            return acc + (seg.estimatedDuration || 0);
        }, 0);

        // Remaining time for actual dialogue
        const availableDialogueTime = Math.max(0, audioDuration - totalDirectionDuration);
        
        // Time per unit of weight
        const timePerWeightUnit = availableDialogueTime / totalWordWeight;

        let currentTime = 0;
        
        // Apply timing to words and account for gaps (directions)
        let wordIdx = 0;
        
        segments.forEach(seg => {
            if (seg.type === 'direction' && seg.estimatedDuration) {
                // Advance time without assigning to words
                currentTime += seg.estimatedDuration;
            } else if (seg.type === 'dialogue') {
                seg.words.forEach(() => {
                    const w = flatWords[wordIdx];
                    const weight = wordWeights[wordIdx];
                    const duration = weight * timePerWeightUnit;
                    
                    w.startTime = currentTime;
                    w.endTime = currentTime + duration;
                    currentTime += duration;
                    wordIdx++;
                });
            }
        });
    }

    return { lines: segments, allWords: flatWords };
  }, [script, audioRef.current?.duration]);

  // Sync Audio Time to Word Index
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime;
      // Find the word that contains the current time
      const activeIndex = allWords.findIndex(word => currentTime >= word.startTime && currentTime < word.endTime);
      
      if (activeIndex !== -1 && activeIndex !== currentWordIndex) {
          setCurrentWordIndex(activeIndex);
      }
    };
    
    const handlePlaybackEnd = () => setCurrentWordIndex(-1);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handlePlaybackEnd);
    audio.addEventListener('pause', handlePlaybackEnd);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handlePlaybackEnd);
      audio.removeEventListener('pause', handlePlaybackEnd);
    };
  }, [audioRef, allWords, currentWordIndex]);

  // Auto-scroll logic
  useEffect(() => {
      if (activeWordRef.current && containerRef.current) {
          const container = containerRef.current;
          const element = activeWordRef.current;
          
          const containerRect = container.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();

          const relativeTop = elementRect.top - containerRect.top;
          // Keep active word in the middle third
          if (relativeTop < containerRect.height * 0.3 || relativeTop > containerRect.height * 0.7) {
               element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
      }
  }, [currentWordIndex]);

  if (allWords.length === 0) {
      return <div className="text-gray-500 italic p-4 text-center">Waiting for audio calibration... (Play audio to sync)</div>;
  }

  return (
    <div ref={containerRef} className="bg-black/20 rounded-lg max-h-[400px] overflow-y-auto border border-white/5 scroll-smooth custom-scrollbar">
      <div className="p-6 space-y-6">
        {lines.map((line, lineIndex) => {
            if (line.type === 'header') {
                return <h3 key={lineIndex} className="text-lg font-bold text-cyan-400 mt-4 border-b border-cyan-500/20 pb-2">{line.rawText}</h3>;
            }
            
            if (line.type === 'direction') {
                return <div key={lineIndex} className="text-gray-500 italic text-sm text-center py-2 bg-white/5 rounded-full mx-auto w-fit px-4 border border-white/5">{line.rawText}</div>;
            }

            return (
                <div key={lineIndex} className={`flex flex-col gap-1 ${line.speaker ? 'pl-4 border-l-2 border-white/10 hover:bg-white/5 transition-colors rounded-r-lg p-2' : ''}`}>
                    {line.speaker && (
                        <div className="text-xs font-bold uppercase tracking-wider text-fuchsia-400 mb-1 flex items-center gap-2">
                           <span className="w-2 h-2 rounded-full bg-fuchsia-500"></span> {line.speaker}
                        </div>
                    )}
                    <p className="text-gray-300 leading-relaxed text-base">
                        {line.words.map((wordIdx) => {
                            const isActive = wordIdx === currentWordIndex;
                            return (
                                <span
                                    key={wordIdx}
                                    ref={isActive ? activeWordRef : null}
                                    className={`transition-all duration-200 inline-block mr-1 rounded px-0.5 ${
                                        isActive 
                                            ? 'text-white bg-cyan-600/50 font-semibold scale-105 transform shadow-sm' 
                                            : 'text-gray-300'
                                    }`}
                                >
                                    {allWords[wordIdx].text}
                                </span>
                            );
                        })}
                    </p>
                </div>
            );
        })}
      </div>
    </div>
  );
};

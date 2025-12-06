import React, { useState, useRef, useEffect, useCallback, useMemo, forwardRef } from 'react';
import { Play, Pause, Rewind } from 'lucide-react';

interface AudioPlayerProps {
  base64Audio: string;
}

const pcmToWavBase64 = (base64Pcm: string, sampleRate: number = 24000): string => {
    if (!base64Pcm) return '';
    const binaryString = atob(base64Pcm);
    const len = binaryString.length;
    const pcmData = new Uint8Array(len);
    for (let i = 0; i < len; i++) { pcmData[i] = binaryString.charCodeAt(i); }
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    const numChannels = 1;
    const bitsPerSample = 16;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmData.length;
    view.setUint32(0, 1380533830, false); // "RIFF"
    view.setUint32(4, 36 + dataSize, true);
    view.setUint32(8, 1463899717, false); // "WAVE"
    view.setUint32(12, 1718449184, false); // "fmt "
    view.setUint32(16, 16, true); // 16 for PCM
    view.setUint16(20, 1, true); // Audio format 1 for PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    view.setUint32(36, 1684108385, false); // "data"
    view.setUint32(40, dataSize, true);
    const wavBytes = new Uint8Array(44 + pcmData.length);
    wavBytes.set(new Uint8Array(header), 0);
    wavBytes.set(pcmData, 44);
    let binaryWav = '';
    for (let i = 0; i < wavBytes.byteLength; i++) { binaryWav += String.fromCharCode(wavBytes[i]); }
    return btoa(binaryWav);
};

export const AudioPlayer = forwardRef<HTMLAudioElement, AudioPlayerProps>(({ base64Audio }, ref) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const audioRef = ref as React.RefObject<HTMLAudioElement>;

  const wavAudioSrc = useMemo(() => {
    if (!base64Audio) return '';
    try {
        const wavBase64 = pcmToWavBase64(base64Audio);
        return `data:audio/wav;base64,${wavBase64}`;
    } catch (e) {
        console.error("Failed to convert PCM audio to WAV format", e);
        return '';
    }
  }, [base64Audio]);


  useEffect(() => {
    const audio = audioRef.current;
    if (audio && wavAudioSrc) {
        if (audio.src !== wavAudioSrc) {
            audio.src = wavAudioSrc;
            setIsPlaying(false);
            setCurrentTime(0);
        }

        const setAudioData = () => { if (isFinite(audio.duration)) { setDuration(audio.duration); } setCurrentTime(audio.currentTime); };
        const setAudioTime = () => { setCurrentTime(audio.currentTime); };
        
        audio.addEventListener("loadeddata", setAudioData);
        audio.addEventListener("timeupdate", setAudioTime);

        return () => {
            audio.removeEventListener("loadeddata", setAudioData);
            audio.removeEventListener("timeupdate", setAudioTime);
        };
    }
  }, [wavAudioSrc, audioRef]);

  const togglePlayPause = useCallback(() => {
    if (audioRef.current) {
      const prevValue = isPlaying;
      setIsPlaying(!prevValue);
      if (!prevValue) {
        audioRef.current.play().catch(e => {
            console.error("Audio play failed", e);
            setIsPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, audioRef]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Number(e.target.value);
      setCurrentTime(audioRef.current.currentTime);
    }
  };
  
  const handleRewind = () => {
    if(audioRef.current) {
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-4 w-full bg-white/10 p-3 rounded-lg">
      <audio ref={audioRef} preload="metadata" onEnded={() => setIsPlaying(false)} />
      <button onClick={handleRewind} className="text-white hover:text-cyan-400 transition-colors">
        <Rewind size={24} />
      </button>
      <button onClick={togglePlayPause} className="text-white bg-cyan-500 rounded-full p-2 hover:bg-cyan-400 transition-colors">
        {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1"/>}
      </button>
      <div className="text-sm text-gray-300 w-12 text-center">{formatTime(currentTime)}</div>
      <input
        type="range"
        value={currentTime}
        max={duration || 0}
        onChange={handleSeek}
        className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-500"
      />
      <div className="text-sm text-gray-300 w-12 text-center">{formatTime(duration)}</div>
    </div>
  );
});

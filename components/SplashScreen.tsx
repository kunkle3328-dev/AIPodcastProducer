
import React, { useEffect, useState } from 'react';
import { Mic, Sparkles, Waves } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const steps = [
      () => setStep(1), // Initial
      () => setStep(2), // "Calibrating Neural Voices"
      () => setStep(3), // "Syncing Studio"
      () => {
        setIsFading(true);
        setTimeout(onComplete, 800); // Wait for fade out
      }
    ];

    const timeouts = [
      setTimeout(steps[0], 100),
      setTimeout(steps[1], 1200),
      setTimeout(steps[2], 2400),
      setTimeout(steps[3], 3600),
    ];

    return () => timeouts.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center transition-opacity duration-800 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
      <div className="relative">
        {/* Animated Rings */}
        <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl animate-ping duration-[3s]"></div>
        <div className="absolute inset-0 bg-fuchsia-500/20 rounded-full blur-xl animate-pulse duration-[2s]"></div>
        
        {/* Main Logo Container */}
        <div className="relative z-10 bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl transform transition-all duration-700 hover:scale-105">
            <div className="flex items-center justify-center mb-4">
                <div className={`transition-all duration-700 transform ${step >= 1 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
                    <Mic size={64} className="text-cyan-400" />
                </div>
                <div className={`absolute transition-all duration-700 delay-100 transform ${step >= 1 ? 'translate-x-8 -translate-y-8 scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
                    <Sparkles size={32} className="text-fuchsia-400 animate-spin-slow" />
                </div>
            </div>
            
            <h1 className={`text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 tracking-tight transition-all duration-700 ${step >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              AI STUDIO
            </h1>
        </div>
      </div>

      {/* Loading States */}
      <div className="mt-12 h-8 flex flex-col items-center justify-center overflow-hidden">
        <div className={`transition-all duration-500 flex items-center gap-3 ${step === 1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full absolute'}`}>
            <Waves className="animate-pulse text-cyan-400" />
            <span className="text-gray-400 font-medium tracking-widest text-sm uppercase">Initializing Audio Engine</span>
        </div>
         <div className={`transition-all duration-500 flex items-center gap-3 ${step === 2 ? 'opacity-100 translate-y-0' : step < 2 ? 'opacity-0 translate-y-full absolute' : 'opacity-0 -translate-y-full absolute'}`}>
            <div className="flex gap-1">
                <span className="w-1 h-4 bg-fuchsia-500 animate-[bounce_1s_infinite]"></span>
                <span className="w-1 h-4 bg-fuchsia-500 animate-[bounce_1s_infinite_0.2s]"></span>
                <span className="w-1 h-4 bg-fuchsia-500 animate-[bounce_1s_infinite_0.4s]"></span>
            </div>
            <span className="text-gray-400 font-medium tracking-widest text-sm uppercase">Calibrating Voices</span>
        </div>
        <div className={`transition-all duration-500 flex items-center gap-3 ${step === 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full absolute'}`}>
            <Sparkles className="text-cyan-400" />
            <span className="text-white font-bold tracking-widest text-sm uppercase">Studio Ready</span>
        </div>
      </div>
      
      {/* Progress Bar */}
       <div className="mt-8 w-64 h-1 bg-gray-800 rounded-full overflow-hidden">
            <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 transition-all duration-1000 ease-out"
                style={{ width: `${(step / 3) * 100}%` }}
            ></div>
       </div>
    </div>
  );
};

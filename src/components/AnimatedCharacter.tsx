import { useEffect, useState } from "react";

interface AnimatedCharacterProps {
  isSpeaking?: boolean;
  mood?: "happy" | "thinking" | "excited";
}

export const AnimatedCharacter = ({ isSpeaking = false, mood = "happy" }: AnimatedCharacterProps) => {
  const [bouncePhase, setBouncePhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setBouncePhase((prev) => (prev + 1) % 3);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const getMoodEmoji = () => {
    switch (mood) {
      case "thinking":
        return "🤔";
      case "excited":
        return "🌟";
      default:
        return "😊";
    }
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* Animated background glow */}
      <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
      
      {/* Main character container */}
      <div className={`relative transition-transform duration-500 ${
        bouncePhase === 1 ? "translate-y-[-8px]" : bouncePhase === 2 ? "translate-y-[-4px]" : ""
      }`}>
        {/* Character body */}
        <div className="relative">
          {/* Main circle */}
          <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-2xl transition-all duration-300 ${
            isSpeaking ? "scale-110 shadow-primary/50" : ""
          }`}>
            {/* Face */}
            <div className="text-6xl animate-fade-in">
              🌤️
            </div>
          </div>
          
          {/* Mood indicator */}
          <div className="absolute -bottom-2 -right-2 text-2xl animate-scale-in">
            {getMoodEmoji()}
          </div>
          
          {/* Speaking indicator */}
          {isSpeaking && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
            </div>
          )}
          
          {/* Orbiting particles */}
          <div className="absolute inset-0 animate-[spin_8s_linear_infinite]">
            <div className="absolute top-0 left-1/2 w-3 h-3 bg-primary/60 rounded-full -translate-x-1/2" />
          </div>
          <div className="absolute inset-0 animate-[spin_6s_linear_infinite_reverse]">
            <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-primary/40 rounded-full -translate-x-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
};

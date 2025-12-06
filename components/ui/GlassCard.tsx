
import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 shadow-lg ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

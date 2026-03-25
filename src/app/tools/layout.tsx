import React from 'react';
import CandidateToolsTopBar from '@/components/CandidateToolsTopBar';

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <CandidateToolsTopBar />
      {children}
    </div>
  );
}

import React from 'react';

interface ReasoningBoxProps {
  reasoning: string;
  defaultExpanded?: boolean;
  className?: string;
}

export const ReasoningBox: React.FC<ReasoningBoxProps> = () => {
  // Reasoning is kept purely internal and never rendered to users
  return null;
};

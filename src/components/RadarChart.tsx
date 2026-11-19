import React from 'react';
import { RadarCore } from './radar/RadarCore';
import { LifeAreaId } from '../types/lifeBalance';

export interface RadarChartProps {
  scores: Record<LifeAreaId, number>;
  onSelectArea?: (areaId: LifeAreaId) => void;
  selectedAreaId?: LifeAreaId | null;
  size?: number;
  theme?: 'light' | 'dark';
}

export const RadarChart: React.FC<RadarChartProps> = ({
  scores,
  onSelectArea,
  selectedAreaId,
  size = 460,
  theme = 'light',
}) => {
  return (
    <RadarCore
      variant="single"
      series={[
        {
          id: 'current',
          name: 'التقييم الحالي',
          color: '#0B6E72',
          scores,
        },
      ]}
      selectedAreaId={selectedAreaId}
      onSelectArea={onSelectArea}
      size={size}
      theme={theme}
    />
  );
};

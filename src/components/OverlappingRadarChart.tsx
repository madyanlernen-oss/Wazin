import React from 'react';
import { RadarCore, getRadarCoordinates } from './radar/RadarCore';
import { LifeAreaId } from '../types/lifeBalance';

export interface ComparisonPeriod {
  id: string;
  name: string;
  color: string;
  scores: Record<LifeAreaId, number>;
  averageScore?: number;
}

export interface OverlappingRadarChartProps {
  periods: ComparisonPeriod[];
  selectedAreaId: LifeAreaId;
  onSelectArea: (areaId: LifeAreaId) => void;
  size?: number;
  theme?: 'light' | 'dark';
}

export { getRadarCoordinates };

export const OverlappingRadarChart: React.FC<OverlappingRadarChartProps> = ({
  periods,
  selectedAreaId,
  onSelectArea,
  size = 460,
  theme = 'light',
}) => {
  return (
    <RadarCore
      variant="compare"
      series={periods}
      selectedAreaId={selectedAreaId}
      onSelectArea={onSelectArea}
      size={size}
      theme={theme}
    />
  );
};

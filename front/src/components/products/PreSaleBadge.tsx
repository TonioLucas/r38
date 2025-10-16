'use client';

import { Chip } from '@mui/material';
import { Rocket } from '@mui/icons-material';
import { formatLaunchDate } from '@/lib/utils/dates';

interface PreSaleBadgeProps {
  launchDate: Date | { toDate: () => Date } | null;
}

export function PreSaleBadge({ launchDate }: PreSaleBadgeProps) {
  if (!launchDate) return null;

  return (
    <Chip
      icon={<Rocket />}
      label={`Lança em ${formatLaunchDate(launchDate)}`}
      color="warning"
      size="small"
      sx={{
        fontWeight: 600,
        fontSize: '0.875rem',
      }}
    />
  );
}

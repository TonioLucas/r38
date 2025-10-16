'use client';

import { Stepper, Step, StepLabel, Box, useTheme, useMediaQuery } from '@mui/material';
import { CHECKOUT_STEPS } from '@/types/checkout';

interface CheckoutStepperProps {
  activeStep: number;
}

export function CheckoutStepper({ activeStep }: CheckoutStepperProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      <Stepper
        activeStep={activeStep}
        alternativeLabel={!isMobile}
        orientation={isMobile ? 'vertical' : 'horizontal'}
      >
        {CHECKOUT_STEPS.map((step) => (
          <Step key={step.label}>
            <StepLabel>
              {step.label}
              {!isMobile && (
                <Box component="span" sx={{ display: 'block', fontSize: '0.75rem', color: 'text.secondary' }}>
                  {step.description}
                </Box>
              )}
            </StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
}

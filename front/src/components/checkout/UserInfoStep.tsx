'use client';

import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Stack,
  Alert,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { MuiTelInput, matchIsValidTel } from 'mui-tel-input';

interface UserInfoFormData {
  email: string;
  name: string;
  phone?: string;
}

interface UserInfoStepProps {
  initialData?: Partial<UserInfoFormData>;
  onNext: (data: UserInfoFormData) => void;
  onBack: () => void;
}

// Validation schema
const schema = yup.object().shape({
  email: yup
    .string()
    .required('Email é obrigatório')
    .email('Email inválido'),
  name: yup
    .string()
    .required('Nome é obrigatório')
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras'),
  phone: yup
    .string()
    .optional()
    .test('valid-phone', 'Telefone inválido', (value) => {
      if (!value || value === '') return true;
      return matchIsValidTel(value);
    }),
});

export function UserInfoStep({ initialData, onNext, onBack }: UserInfoStepProps) {
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UserInfoFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      email: initialData?.email || '',
      name: initialData?.name || '',
      phone: initialData?.phone || '',
    },
  });

  const handleFormSubmit = async (data: UserInfoFormData) => {
    setLoading(true);
    try {
      onNext(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Stack spacing={3}>
          <Typography variant="h5" fontWeight={700}>
            Suas Informações
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            Após o pagamento, você receberá um email com suas credenciais de acesso. Não é necessário criar senha agora.
          </Alert>

          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Email"
                type="email"
                variant="outlined"
                error={!!errors.email}
                helperText={errors.email?.message}
                disabled={loading}
                required
                inputProps={{
                  autoComplete: 'email',
                }}
              />
            )}
          />

          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Nome completo"
                variant="outlined"
                error={!!errors.name}
                helperText={errors.name?.message}
                disabled={loading}
                required
                inputProps={{
                  autoComplete: 'name',
                }}
              />
            )}
          />

          <Controller
            name="phone"
            control={control}
            render={({ field: { ref: fieldRef, value, ...fieldProps }, fieldState }) => (
              <MuiTelInput
                {...fieldProps}
                value={value ?? ''}
                inputRef={fieldRef}
                defaultCountry="BR"
                fullWidth
                label="Telefone (opcional)"
                variant="outlined"
                error={fieldState.invalid}
                helperText={
                  fieldState.invalid
                    ? errors.phone?.message
                    : 'Ex: +55 11 98888-7777'
                }
                disabled={loading}
              />
            )}
          />
        </Stack>
      </Paper>

      {/* Navigation Buttons */}
      <Box display="flex" justifyContent="space-between">
        <Button
          variant="outlined"
          onClick={onBack}
          size="large"
          disabled={loading}
        >
          Voltar
        </Button>
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading}
          sx={{ px: 4 }}
        >
          Continuar
        </Button>
      </Box>
    </Box>
  );
}

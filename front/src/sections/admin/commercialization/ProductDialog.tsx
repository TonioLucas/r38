"use client";

import { useEffect } from "react";
import { useForm, Controller, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  CircularProgress,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { ProductDoc } from "@/types/firestore";
import { productSchema, ProductFormData } from "@/lib/validations/product";

interface ProductDialogProps {
  open: boolean;
  onClose: () => void;
  product?: ProductDoc | null;
  onSave: (data: ProductFormData) => Promise<void>;
}

export function ProductDialog({ open, onClose, product, onSave }: ProductDialogProps) {
  const isEditMode = Boolean(product);

  const methods = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product || {
      name: '',
      slug: '',
      description: '',
      status: 'active',
      launch_date: null,
      astron_club_id: '',
      base_entitlements: {
        platform_months: 12,
        support_months: 12,
        mentorship_included: false,
      },
      metadata: {},
    },
  });

  const { control, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = methods;
  const status = watch('status');
  const name = watch('name');

  // Auto-generate slug from name (only in create mode)
  useEffect(() => {
    if (!isEditMode && name) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setValue('slug', slug);
    }
  }, [name, isEditMode, setValue]);

  // Reset form when product changes
  useEffect(() => {
    if (product) {
      reset(product);
    } else {
      reset({
        name: '',
        slug: '',
        description: '',
        status: 'active',
        launch_date: null,
        astron_club_id: '',
        base_entitlements: {
          platform_months: 12,
          support_months: 12,
          mentorship_included: false,
        },
        metadata: {},
      });
    }
  }, [product, reset]);

  const onSubmit = async (data: ProductFormData) => {
    try {
      await onSave(data);
      reset();
      onClose();
    } catch {
      // Error handling is done in onSave
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditMode ? 'Editar Produto' : 'Criar Produto'}
      </DialogTitle>
      <DialogContent>
        <FormProvider {...methods}>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Nome do Produto"
                  fullWidth
                  required
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              )}
            />

            <Controller
              name="slug"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Slug (URL)"
                  fullWidth
                  required
                  disabled={isEditMode}
                  error={!!errors.slug}
                  helperText={errors.slug?.message || "Gerado automaticamente do nome"}
                />
              )}
            />

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Descrição"
                  fullWidth
                  required
                  multiline
                  rows={4}
                  error={!!errors.description}
                  helperText={errors.description?.message}
                />
              )}
            />

            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.status}>
                  <InputLabel>Status</InputLabel>
                  <Select {...field} label="Status">
                    <MenuItem value="active">Ativo</MenuItem>
                    <MenuItem value="pre_sale">Pré-venda</MenuItem>
                    <MenuItem value="inactive">Inativo</MenuItem>
                  </Select>
                  {errors.status && <FormHelperText>{errors.status.message}</FormHelperText>}
                </FormControl>
              )}
            />

            {status === 'pre_sale' && (
              <Controller
                name="launch_date"
                control={control}
                render={({ field }) => (
                  <TextField
                    label="Data de Lançamento"
                    type="date"
                    fullWidth
                    required
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.launch_date}
                    helperText={errors.launch_date?.message}
                    value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                  />
                )}
              />
            )}

            <Controller
              name="astron_club_id"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="ID do Clube Astron"
                  fullWidth
                  required
                  error={!!errors.astron_club_id}
                  helperText={errors.astron_club_id?.message || "Necessário para integração automática com a plataforma Astron Members."}
                />
              )}
            />

            <Typography variant="h6" sx={{ mt: 2 }}>Entitlements Base</Typography>

            <Controller
              name="base_entitlements.platform_months"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Meses de Acesso à Plataforma (vazio = vitalício)"
                  type="number"
                  fullWidth
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  helperText="Deixe vazio para acesso vitalício"
                />
              )}
            />

            <Controller
              name="base_entitlements.support_months"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Meses de Suporte"
                  type="number"
                  fullWidth
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                />
              )}
            />

            <Controller
              name="base_entitlements.mentorship_included"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      {...field}
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  }
                  label="Mentoria Incluída por Padrão"
                />
              )}
            />
          </Stack>
        </FormProvider>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          disabled={isSubmitting}
        >
          {isSubmitting ? <CircularProgress size={24} /> : (isEditMode ? 'Atualizar' : 'Criar')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

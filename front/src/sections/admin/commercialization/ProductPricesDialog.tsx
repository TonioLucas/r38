"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Box,
  Chip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { ProductDoc, ProductPriceDoc } from "@/types/firestore";
import { priceSchema, PriceFormData } from "@/lib/validations/product";
import { useProductPrices } from "@/hooks/useProductPrices";

interface ProductPricesDialogProps {
  open: boolean;
  onClose: () => void;
  product: ProductDoc;
}

export function ProductPricesDialog({ open, onClose, product }: ProductPricesDialogProps) {
  const { prices, loading, createPrice, updatePrice, deletePrice } = useProductPrices(
    open ? product.id : null
  );
  const [showPriceForm, setShowPriceForm] = useState(false);
  const [editingPrice, setEditingPrice] = useState<ProductPriceDoc | null>(null);

  const methods = useForm<PriceFormData>({
    resolver: zodResolver(priceSchema),
    defaultValues: {
      product_id: product.id,
      payment_method: 'pix',
      amount: 0,
      display_amount: 0,
      currency: 'BRL',
      installments: null,
      installment_amount: null,
      includes_mentorship: false,
      active: true,
    },
  });

  const { control, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = methods;
  const displayAmount = watch('display_amount');
  const installments = watch('installments');
  const paymentMethod = watch('payment_method');

  // Auto-calculate amount (centavos) from display_amount (reais)
  useEffect(() => {
    if (displayAmount !== undefined) {
      const amountInCentavos = Math.round(displayAmount * 100);
      setValue('amount', amountInCentavos);

      // Auto-calculate installment_amount if installments is set
      if (installments && installments > 0) {
        const installmentAmountValue = Math.round(amountInCentavos / installments);
        setValue('installment_amount', installmentAmountValue);
      }
    }
  }, [displayAmount, installments, setValue]);

  // Clear installments when payment method is not credit_card
  useEffect(() => {
    if (paymentMethod !== 'credit_card') {
      setValue('installments', null);
      setValue('installment_amount', null);
    }
  }, [paymentMethod, setValue]);

  const handleAddPrice = () => {
    reset({
      product_id: product.id,
      payment_method: 'pix',
      amount: 0,
      display_amount: 0,
      currency: 'BRL',
      installments: null,
      installment_amount: null,
      includes_mentorship: false,
      active: true,
    });
    setEditingPrice(null);
    setShowPriceForm(true);
  };

  const handleEditPrice = (price: ProductPriceDoc) => {
    reset({
      product_id: price.product_id,
      payment_method: price.payment_method,
      amount: price.amount,
      display_amount: price.display_amount,
      currency: price.currency,
      installments: price.installments,
      installment_amount: price.installment_amount,
      includes_mentorship: price.includes_mentorship,
      active: price.active,
    });
    setEditingPrice(price);
    setShowPriceForm(true);
  };

  const handleDeletePrice = async (priceId: string) => {
    if (confirm('Tem certeza que deseja deletar este preço?')) {
      await deletePrice(priceId);
    }
  };

  const onSubmit = async (data: PriceFormData) => {
    try {
      if (editingPrice) {
        await updatePrice(editingPrice.id, data);
      } else {
        await createPrice(data);
      }
      setShowPriceForm(false);
      setEditingPrice(null);
      reset();
    } catch {
      // Error handling is done in the hook
    }
  };

  const handleCancelForm = () => {
    setShowPriceForm(false);
    setEditingPrice(null);
    reset();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      btc: 'Bitcoin',
      pix: 'PIX',
      credit_card: 'Cartão de Crédito',
    };
    return labels[method] || method;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Gerenciar Preços - {product.name}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          {/* Prices Table */}
          {!showPriceForm && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Preços Cadastrados</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddPrice}
                >
                  Adicionar Preço
                </Button>
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Método de Pagamento</TableCell>
                        <TableCell>Valor</TableCell>
                        <TableCell>Parcelas</TableCell>
                        <TableCell>Mentoria</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="center">Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {prices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            Nenhum preço cadastrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        prices.map((price) => (
                          <TableRow key={price.id}>
                            <TableCell>{getPaymentMethodLabel(price.payment_method)}</TableCell>
                            <TableCell>{formatCurrency(price.display_amount)}</TableCell>
                            <TableCell>
                              {price.installments ? (
                                <>
                                  {price.installments}x de {formatCurrency((price.installment_amount || 0) / 100)}
                                </>
                              ) : (
                                'À vista'
                              )}
                            </TableCell>
                            <TableCell>
                              {price.includes_mentorship ? (
                                <Chip label="Sim" size="small" color="success" />
                              ) : (
                                <Chip label="Não" size="small" />
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={price.active ? 'Ativo' : 'Inativo'}
                                size="small"
                                color={price.active ? 'success' : 'default'}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Tooltip title="Editar">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditPrice(price)}
                                  color="primary"
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Deletar">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeletePrice(price.id)}
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}

          {/* Price Form */}
          {showPriceForm && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {editingPrice ? 'Editar Preço' : 'Adicionar Preço'}
              </Typography>
              <Stack spacing={3}>
                <Controller
                  name="payment_method"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.payment_method}>
                      <InputLabel>Método de Pagamento</InputLabel>
                      <Select {...field} label="Método de Pagamento">
                        <MenuItem value="btc">Bitcoin</MenuItem>
                        <MenuItem value="pix">PIX</MenuItem>
                        <MenuItem value="credit_card">Cartão de Crédito</MenuItem>
                      </Select>
                      {errors.payment_method && (
                        <FormHelperText>{errors.payment_method.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />

                <Controller
                  name="display_amount"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Valor (R$)"
                      type="number"
                      fullWidth
                      required
                      inputProps={{ step: "0.01", min: "0" }}
                      error={!!errors.display_amount}
                      helperText={errors.display_amount?.message}
                    />
                  )}
                />

                {paymentMethod === 'credit_card' && (
                  <Controller
                    name="installments"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Número de Parcelas"
                        type="number"
                        fullWidth
                        inputProps={{ min: "1", max: "12" }}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        error={!!errors.installments}
                        helperText={errors.installments?.message || "1 a 12 parcelas"}
                      />
                    )}
                  />
                )}

                <Controller
                  name="includes_mentorship"
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
                      label="Inclui Mentoria"
                    />
                  )}
                />

                <Controller
                  name="active"
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
                      label="Preço Ativo"
                    />
                  )}
                />

                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button onClick={handleCancelForm} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSubmit(onSubmit)}
                    variant="contained"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <CircularProgress size={24} />
                    ) : (
                      editingPrice ? 'Atualizar' : 'Criar'
                    )}
                  </Button>
                </Stack>
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}

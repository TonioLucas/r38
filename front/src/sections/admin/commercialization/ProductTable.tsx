"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  TextField,
  Stack,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  AttachMoney as PriceIcon,
  Archive as ArchiveIcon,
} from "@mui/icons-material";
import { useAdminProducts } from "@/hooks/useAdminProducts";
import { ProductDialog } from "./ProductDialog";
import { ProductPricesDialog } from "./ProductPricesDialog";
import { ProductDoc, ProductStatus } from "@/types/firestore";
import { ProductFormData } from "@/lib/validations/product";

export function ProductTable() {
  const {
    products,
    loading,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    totalCount,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    createProduct,
    updateProduct,
    archiveProduct,
  } = useAdminProducts();

  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [pricesDialogOpen, setPricesDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductDoc | null>(null);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setProductDialogOpen(true);
  };

  const handleEditProduct = (product: ProductDoc) => {
    setSelectedProduct(product);
    setProductDialogOpen(true);
  };

  const handleManagePrices = (product: ProductDoc) => {
    setSelectedProduct(product);
    setPricesDialogOpen(true);
  };

  const handleArchiveProduct = async (product: ProductDoc) => {
    if (confirm(`Tem certeza que deseja arquivar o produto "${product.name}"?`)) {
      await archiveProduct(product.id);
    }
  };

  const handleSaveProduct = async (data: ProductFormData) => {
    if (selectedProduct) {
      await updateProduct(selectedProduct.id, data);
    } else {
      await createProduct(data);
    }
  };

  const getStatusColor = (status: ProductStatus): "success" | "warning" | "default" => {
    switch (status) {
      case "active":
        return "success";
      case "pre_sale":
        return "warning";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: ProductStatus): string => {
    switch (status) {
      case "active":
        return "Ativo";
      case "pre_sale":
        return "Pré-venda";
      case "inactive":
        return "Inativo";
      default:
        return status;
    }
  };

  const paginatedProducts = products.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h6">Produtos</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Total: {totalCount}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddProduct}
            >
              Adicionar Produto
            </Button>
          </Box>
        </Box>

        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <TextField
            size="small"
            placeholder="Buscar por nome ou slug"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flexGrow: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ProductStatus | "all")}
              label="Status"
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="active">Ativo</MenuItem>
              <MenuItem value="pre_sale">Pré-venda</MenuItem>
              <MenuItem value="inactive">Inativo</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Slug</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Astron Club ID</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : paginatedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Nenhum produto encontrado
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProducts.map((product) => (
                  <TableRow key={product.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {product.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {product.description.substring(0, 60)}
                        {product.description.length > 60 && '...'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                        {product.slug || 'no-slug'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(product.status)}
                        size="small"
                        color={getStatusColor(product.status)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                        {product.astron_club_id?.substring(0, 12) || 'N/A'}
                        {product.astron_club_id && product.astron_club_id.length > 12 && '...'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Editar">
                        <IconButton
                          size="small"
                          onClick={() => handleEditProduct(product)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Gerenciar Preços">
                        <IconButton
                          size="small"
                          onClick={() => handleManagePrices(product)}
                          color="success"
                        >
                          <PriceIcon />
                        </IconButton>
                      </Tooltip>
                      {product.status !== 'inactive' && (
                        <Tooltip title="Arquivar">
                          <IconButton
                            size="small"
                            onClick={() => handleArchiveProduct(product)}
                            color="error"
                          >
                            <ArchiveIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </Paper>

      {/* Product Create/Edit Dialog */}
      <ProductDialog
        open={productDialogOpen}
        onClose={() => {
          setProductDialogOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onSave={handleSaveProduct}
      />

      {/* Product Prices Dialog */}
      {selectedProduct && (
        <ProductPricesDialog
          open={pricesDialogOpen}
          onClose={() => {
            setPricesDialogOpen(false);
            setSelectedProduct(null);
          }}
          product={selectedProduct}
        />
      )}
    </>
  );
}

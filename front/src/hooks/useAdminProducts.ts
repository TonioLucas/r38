import { useState, useEffect, useCallback } from "react";
import { useSnackbar } from "notistack";
import { productOperations } from "@/lib/firestore";
import { ProductDoc, ProductStatus } from "@/types/firestore";
import { ProductFormData } from "@/lib/validations/product";

interface UseAdminProductsOptions {
  status?: ProductStatus;
}

export function useAdminProducts(options?: UseAdminProductsOptions) {
  const [products, setProducts] = useState<ProductDoc[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "all">("all");
  const { enqueueSnackbar } = useSnackbar();

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = options?.status ? { status: options.status } : undefined;
      const data = await productOperations.getAll(filters);
      setProducts(data);
    } catch (err) {
      const message = "Erro ao carregar produtos";
      setError(message);
      enqueueSnackbar(message, { variant: "error" });
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  }, [options?.status, enqueueSnackbar]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Filter products based on search and status
  useEffect(() => {
    let filtered = [...products];

    // Apply search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.slug.toLowerCase().includes(lowerQuery)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, statusFilter]);

  const createProduct = async (data: ProductFormData) => {
    try {
      await productOperations.create(data);
      enqueueSnackbar("Produto criado com sucesso", { variant: "success" });
      await fetchProducts();
    } catch (err) {
      enqueueSnackbar("Erro ao criar produto", { variant: "error" });
      throw err;
    }
  };

  const updateProduct = async (id: string, data: Partial<ProductFormData>) => {
    try {
      await productOperations.update(id, data);
      enqueueSnackbar("Produto atualizado com sucesso", { variant: "success" });
      await fetchProducts();
    } catch (err) {
      enqueueSnackbar("Erro ao atualizar produto", { variant: "error" });
      throw err;
    }
  };

  const archiveProduct = async (id: string) => {
    try {
      await productOperations.archive(id);
      enqueueSnackbar("Produto arquivado com sucesso", { variant: "success" });
      await fetchProducts();
    } catch (err) {
      enqueueSnackbar("Erro ao arquivar produto", { variant: "error" });
      throw err;
    }
  };

  return {
    products: filteredProducts,
    loading,
    error,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    totalCount: filteredProducts.length,
    createProduct,
    updateProduct,
    archiveProduct,
    reload: fetchProducts,
  };
}

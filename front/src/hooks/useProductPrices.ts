import { useState, useEffect, useCallback } from "react";
import { useSnackbar } from "notistack";
import { priceOperations } from "@/lib/firestore";
import { ProductPriceDoc } from "@/types/firestore";
import { PriceFormData } from "@/lib/validations/product";

export function useProductPrices(productId: string | null) {
  const [prices, setPrices] = useState<ProductPriceDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  const fetchPrices = useCallback(async () => {
    if (!productId) {
      setPrices([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await priceOperations.getByProductId(productId);
      setPrices(data);
    } catch (err) {
      const message = "Erro ao carregar preços";
      setError(message);
      enqueueSnackbar(message, { variant: "error" });
      console.error("Error fetching prices:", err);
    } finally {
      setLoading(false);
    }
  }, [productId, enqueueSnackbar]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const createPrice = async (data: PriceFormData) => {
    try {
      await priceOperations.create(data);
      enqueueSnackbar("Preço criado com sucesso", { variant: "success" });
      await fetchPrices();
    } catch (err) {
      enqueueSnackbar("Erro ao criar preço", { variant: "error" });
      throw err;
    }
  };

  const updatePrice = async (id: string, data: Partial<PriceFormData>) => {
    try {
      await priceOperations.update(id, data);
      enqueueSnackbar("Preço atualizado com sucesso", { variant: "success" });
      await fetchPrices();
    } catch (err) {
      enqueueSnackbar("Erro ao atualizar preço", { variant: "error" });
      throw err;
    }
  };

  const deletePrice = async (id: string) => {
    try {
      await priceOperations.delete(id);
      enqueueSnackbar("Preço deletado com sucesso", { variant: "success" });
      await fetchPrices();
    } catch (err) {
      enqueueSnackbar("Erro ao deletar preço", { variant: "error" });
      throw err;
    }
  };

  return {
    prices,
    loading,
    error,
    createPrice,
    updatePrice,
    deletePrice,
    reload: fetchPrices,
  };
}

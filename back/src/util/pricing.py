"""Pricing calculation utilities."""

from src.models.firestore_types import ProductPriceDoc


def calculate_final_price(base_price: ProductPriceDoc, mentorship_enabled: bool) -> int:
    """Calculate final price with mentorship modifier.

    Args:
        base_price: Base product price document
        mentorship_enabled: Whether mentorship is enabled for this purchase

    Returns:
        Final price in centavos
    """
    base_amount = base_price.amount  # Centavos
    if mentorship_enabled and not base_price.includes_mentorship:
        return base_amount * 2
    return base_amount


def calculate_installments(total_amount: int, installment_count: int) -> dict:
    """Calculate installment breakdown.

    Args:
        total_amount: Total amount in centavos
        installment_count: Number of installments

    Returns:
        Dictionary with installment details
    """
    installment_amount = total_amount // installment_count
    return {
        'installment_amount': installment_amount,
        'total': total_amount,
        'count': installment_count
    }


def format_brl_price(centavos: int) -> str:
    """Format centavos as Brazilian Real (R$ 300,00).

    Args:
        centavos: Amount in centavos

    Returns:
        Formatted price string
    """
    reais = centavos / 100.0
    return f"R$ {reais:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')


def reais_to_centavos(reais: float) -> int:
    """Convert reais to centavos.

    Args:
        reais: Amount in reais

    Returns:
        Amount in centavos
    """
    return int(reais * 100)


def centavos_to_reais(centavos: int) -> float:
    """Convert centavos to reais.

    Args:
        centavos: Amount in centavos

    Returns:
        Amount in reais
    """
    return centavos / 100.0

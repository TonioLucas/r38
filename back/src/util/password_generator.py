"""PT-BR readable password generator."""

import random
from datetime import datetime


PORTUGUESE_WORDS = [
    'casa', 'mesa', 'cafe', 'livro', 'porta', 'janela', 'carro', 'moto',
    'praia', 'sol', 'lua', 'estrela', 'flor', 'arvore', 'verde', 'azul',
    'vermelho', 'amarelo', 'branco', 'preto', 'gato', 'cachorro', 'passaro',
    'peixe', 'agua', 'fogo', 'terra', 'vento', 'pedra', 'mar', 'rio', 'lago',
    'montanha', 'vale', 'cidade', 'rua', 'ponte', 'escola', 'parque', 'jardim'
]


def generate_readable_password() -> str:
    """Generate PT-BR readable password (e.g., cafe-mesa-livro-2024).

    Returns:
        Generated password string
    """
    words = random.sample(PORTUGUESE_WORDS, 3)
    year = datetime.now().year
    return f"{'-'.join(words)}-{year}"


def validate_password_strength(password: str) -> bool:
    """Validate generated password meets requirements.

    Args:
        password: Password to validate

    Returns:
        True if password is valid, False otherwise
    """
    parts = password.split('-')
    return (
        len(parts) == 4 and
        all(word in PORTUGUESE_WORDS for word in parts[:3]) and
        parts[3].isdigit() and len(parts[3]) == 4
    )

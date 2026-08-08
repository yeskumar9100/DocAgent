"""
Encryption utilities for DocAgent API key storage.

Security design:
  - Uses Fernet (AES-128-CBC + HMAC-SHA256) — authenticated encryption
  - SECRET_KEY lives ONLY in the .env file, never in the database
  - Database stores only ciphertext — meaningless without SECRET_KEY
  - Each encrypt() call uses a random IV — safe to encrypt the same plaintext repeatedly
  - Frontend never receives the raw key — only a masked representation

To generate a valid SECRET_KEY:
  python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

Threat model:
  ✅ Protected: DB stolen without .env  → keys unrecoverable
  ✅ Protected: Same key encrypted twice → ciphertexts differ (random IV)
  ⚠️  NOT protected: Both .env and DB stolen simultaneously → keys recoverable
     (This is the baseline assumption for any symmetric encryption scheme)
"""

from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings


def _fernet() -> Fernet:
    """Return a Fernet instance using the SECRET_KEY from environment."""
    settings = get_settings()
    try:
        return Fernet(settings.secret_key.encode())
    except Exception as exc:
        raise ValueError(
            "SECRET_KEY is invalid. Generate one with: "
            "python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        ) from exc


def encrypt_key(plaintext: str) -> str:
    """Encrypt a plaintext API key. Returns URL-safe base64 ciphertext."""
    if not plaintext:
        raise ValueError("Cannot encrypt an empty key")
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt_key(ciphertext: str) -> str:
    """Decrypt a stored API key ciphertext. Raises ValueError on tampered data."""
    try:
        return _fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken as exc:
        raise ValueError(
            "Failed to decrypt API key — ciphertext may be corrupted or SECRET_KEY changed"
        ) from exc


def mask_key(plaintext: str) -> str:
    """
    Return a masked representation showing only the last 4 characters.
    E.g. 'sk-abc123XYZ' → '•••••••XYZ'  (always at least 12 bullets)
    """
    if not plaintext:
        return ""
    visible = plaintext[-4:]
    bullets = "•" * max(12, len(plaintext) - 4)
    return bullets + visible

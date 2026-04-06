# core/crypto.py

import os
import hashlib
import base64
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes, padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

SALT_SIZE = 16    # 16 bytes salt for PBKDF2
IV_SIZE = 16      # 16 bytes IV for AES CBC mode
ITERATIONS = 480000  # PBKDF2 iterations — high = slow brute force


# ── PBKDF2 Key Derivation ──────────────────────────────────────────────────

def derive_key(password: str, salt: bytes) -> bytes:
    """
    Turns a plain password into a strong 256-bit AES key.
    Same password + same salt = same key every time.
    """
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,          # 32 bytes = 256 bits
        salt=salt,
        iterations=ITERATIONS,
        backend=default_backend()
    )
    return kdf.derive(password.encode())


# ── AES-256 Encryption ─────────────────────────────────────────────────────

def encrypt_message(message: str, password: str) -> str:
    """
    Encrypts a message using AES-256 CBC.
    Returns a base64 string: salt + iv + ciphertext
    (all three packed together so we can unpack on decrypt)
    """
    salt = os.urandom(SALT_SIZE)
    iv = os.urandom(IV_SIZE)
    key = derive_key(password, salt)

    # AES requires message length to be a multiple of 16 bytes — padding fixes that
    padder = padding.PKCS7(128).padder()
    padded_data = padder.update(message.encode()) + padder.finalize()

    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(padded_data) + encryptor.finalize()

    # Pack salt + iv + ciphertext together, encode to base64 string
    packed = salt + iv + ciphertext
    return base64.b64encode(packed).decode()


def decrypt_message(encrypted_b64: str, password: str) -> str:
    """
    Decrypts a base64-encoded AES-256 encrypted message.
    Unpacks salt + iv + ciphertext, derives key, decrypts.
    """
    packed = base64.b64decode(encrypted_b64.encode())

    # Unpack the three parts
    salt = packed[:SALT_SIZE]
    iv = packed[SALT_SIZE:SALT_SIZE + IV_SIZE]
    ciphertext = packed[SALT_SIZE + IV_SIZE:]

    key = derive_key(password, salt)

    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()
    padded_plaintext = decryptor.update(ciphertext) + decryptor.finalize()

    # Remove padding to get original message back
    unpadder = padding.PKCS7(128).unpadder()
    plaintext = unpadder.update(padded_plaintext) + unpadder.finalize()

    return plaintext.decode()


# ── SHA-256 Integrity Check ────────────────────────────────────────────────

def hash_message(message: str) -> str:
    """
    Creates a SHA-256 fingerprint of the message.
    Stored alongside the hidden message in the OBJ.
    """
    return hashlib.sha256(message.encode()).hexdigest()


def verify_integrity(message: str, stored_hash: str) -> bool:
    """
    Recomputes the hash of the decoded message and compares
    it to the stored hash. Returns True if file is untampered.
    """
    return hash_message(message) == stored_hash

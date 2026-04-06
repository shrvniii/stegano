DELIMITER = "1111111111111110"  # 16-bit end marker

def text_to_bits(text):
    """Convert a string to a flat list of bits (0s and 1s)"""
    bits = []
    for char in text:
        # Each character becomes 8 bits
        byte = format(ord(char), '08b')
        bits.extend([int(b) for b in byte])
    return bits


def bits_to_text(bits):
    """Convert a flat list of bits back to a string"""
    chars = []
    for i in range(0, len(bits), 8):
        byte = bits[i:i+8]
        if len(byte) < 8:
            break
        chars.append(chr(int("".join(map(str, byte)), 2)))
    return "".join(chars)


def encode_message(vertices, message):
    """
    Hides the message inside vertex color LSBs.
    Returns modified vertices.
    Raises ValueError if model doesn't have enough capacity.
    """
    # Convert message + delimiter to bits
    message_bits = text_to_bits(message) + [int(b) for b in DELIMITER]

    # Check capacity: each vertex has 3 color channels (R, G, B) = 3 bits
    total_bits_available = len(vertices) * 3
    if len(message_bits) > total_bits_available:
        raise ValueError(
            f"Message too long! Need {len(message_bits)} bits, "
            f"model only has {total_bits_available} bits capacity."
        )

    bit_index = 0
    for vertex in vertices:
        for channel in range(3, 6):  # indices 3,4,5 = R, G, B
            if bit_index >= len(message_bits):
                break
            # Convert color (0.0-1.0) to integer (0-255)
            color_val = int(vertex[channel] * 255)
            # Replace the last bit with our message bit
            color_val = (color_val & 0xFE) | message_bits[bit_index]
            # Convert back to 0.0-1.0
            vertex[channel] = color_val / 255.0
            bit_index += 1

    return vertices


def decode_message(vertices):
    """
    Extracts the hidden message from vertex color LSBs.
    Reads LSBs until it finds the delimiter, then stops.
    """
    bits = []

    for vertex in vertices:
        for channel in range(3, 6):  # R, G, B
            color_val = int(vertex[channel] * 255)
            # Extract the last bit
            bits.append(color_val & 1)

            # Check if last 16 bits match the delimiter
            if len(bits) >= 16:
                last_16 = "".join(map(str, bits[-16:]))
                if last_16 == DELIMITER:
                    # Remove delimiter bits and decode
                    message_bits = bits[:-16]
                    return bits_to_text(message_bits)

    raise ValueError("No hidden message found in this file.")

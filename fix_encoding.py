import re

filepath = r"g:/FINANCE/src/components/desktop/Dashboard.tsx"

with open(filepath, "rb") as f:
    raw = f.read()

# The file has UTF-8 bytes but they were re-interpreted as latin-1 and saved back,
# creating double-encoded garbage. Strategy: decode as latin-1 to recover original
# byte values, then re-encode as utf-8.
try:
    # If file is still valid UTF-8 with garbled sequences, decode as latin-1 first
    text_latin = raw.decode("latin-1")
    # Re-encode as latin-1 bytes, then decode as utf-8 to recover original Portuguese
    text_fixed = text_latin.encode("latin-1").decode("utf-8")
    print("Recovered via latin-1 -> utf-8 round-trip")
except Exception as e:
    print(f"Round-trip failed: {e}")
    text_fixed = raw.decode("utf-8", errors="replace")

with open(filepath, "w", encoding="utf-8", newline="\n") as f:
    f.write(text_fixed)

print("File written successfully")

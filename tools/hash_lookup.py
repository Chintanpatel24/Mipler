"""Hash Lookup Tool."""
import re
import hashlib
from .base_tool import BaseTool


class HashLookupTool(BaseTool):
    id = 'hash_lookup'
    name = 'Hash Analyzer'
    description = 'Identify hash types and generate hashes for comparison'
    category = 'Cryptography'
    icon = 'hash'
    color = '#bc6c25'
    inputs = [
        {'name': 'input_text', 'type': 'string', 'label': 'Hash or Text', 'required': True,
         'placeholder': 'Enter a hash to identify or text to hash'},
        {'name': 'mode', 'type': 'select', 'label': 'Mode',
         'options': ['identify', 'generate'], 'default': 'identify'},
    ]
    outputs = [
        {'name': 'hash_data', 'type': 'object', 'label': 'Hash Analysis'},
    ]

    HASH_PATTERNS = {
        'MD5': (r'^[a-fA-F0-9]{32}$', 32),
        'SHA-1': (r'^[a-fA-F0-9]{40}$', 40),
        'SHA-224': (r'^[a-fA-F0-9]{56}$', 56),
        'SHA-256': (r'^[a-fA-F0-9]{64}$', 64),
        'SHA-384': (r'^[a-fA-F0-9]{96}$', 96),
        'SHA-512': (r'^[a-fA-F0-9]{128}$', 128),
        'NTLM': (r'^[a-fA-F0-9]{32}$', 32),
        'MySQL (old)': (r'^[a-fA-F0-9]{16}$', 16),
        'CRC32': (r'^[a-fA-F0-9]{8}$', 8),
        'RIPEMD-160': (r'^[a-fA-F0-9]{40}$', 40),
    }

    def run(self, params):
        input_text = params.get('input_text', '').strip()
        mode = params.get('mode', 'identify')

        if not input_text:
            return self._result(None, 'error', 'Input is required')

        if mode == 'generate':
            return self._generate_hashes(input_text)
        else:
            return self._identify_hash(input_text)

    def _identify_hash(self, hash_str):
        """Identify possible hash types."""
        matches = []
        clean = hash_str.strip()

        for name, (pattern, length) in self.HASH_PATTERNS.items():
            if re.match(pattern, clean):
                confidence = 'high' if len(clean) == length else 'medium'
                matches.append({
                    'type': name,
                    'confidence': confidence,
                    'length': len(clean),
                })

        return self._result({
            'hash': clean,
            'length': len(clean),
            'possible_types': matches,
            'is_hex': bool(re.match(r'^[a-fA-F0-9]+$', clean)),
        })

    def _generate_hashes(self, text):
        """Generate multiple hash types from text."""
        encoded = text.encode('utf-8')
        hashes = {
            'MD5': hashlib.md5(encoded).hexdigest(),
            'SHA-1': hashlib.sha1(encoded).hexdigest(),
            'SHA-224': hashlib.sha224(encoded).hexdigest(),
            'SHA-256': hashlib.sha256(encoded).hexdigest(),
            'SHA-384': hashlib.sha384(encoded).hexdigest(),
            'SHA-512': hashlib.sha512(encoded).hexdigest(),
        }

        return self._result({
            'input': text,
            'hashes': hashes,
        })
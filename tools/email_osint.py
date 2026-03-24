"""Email OSINT Tool."""
import re
import dns.resolver
import hashlib
from .base_tool import BaseTool


class EmailOSINTTool(BaseTool):
    id = 'email_osint'
    name = 'Email OSINT'
    description = 'Analyze email addresses - validate, extract info, check patterns'
    category = 'Email'
    icon = 'email'
    color = '#e07a5f'
    inputs = [
        {'name': 'email', 'type': 'string', 'label': 'Email Address', 'required': True,
         'placeholder': 'user@example.com'},
    ]
    outputs = [
        {'name': 'email_data', 'type': 'object', 'label': 'Email Analysis'},
    ]

    def run(self, params):
        email = params.get('email', '').strip().lower()
        if not email:
            return self._result(None, 'error', 'Email is required')

        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            return self._result(None, 'error', 'Invalid email format')

        local_part, domain = email.split('@')

        result = {
            'email': email,
            'local_part': local_part,
            'domain': domain,
            'gravatar_hash': hashlib.md5(email.encode()).hexdigest(),
            'gravatar_url': f"https://www.gravatar.com/avatar/{hashlib.md5(email.encode()).hexdigest()}?d=404",
        }

        # Check MX records
        try:
            mx_records = dns.resolver.resolve(domain, 'MX')
            result['mx_records'] = [str(r.exchange) for r in mx_records]
            result['mail_server_valid'] = True

            # Detect provider
            mx_str = ' '.join(result['mx_records']).lower()
            if 'google' in mx_str or 'gmail' in mx_str:
                result['provider'] = 'Google Workspace / Gmail'
            elif 'outlook' in mx_str or 'microsoft' in mx_str:
                result['provider'] = 'Microsoft 365 / Outlook'
            elif 'yahoo' in mx_str:
                result['provider'] = 'Yahoo Mail'
            elif 'protonmail' in mx_str or 'proton' in mx_str:
                result['provider'] = 'ProtonMail'
            else:
                result['provider'] = 'Custom / Other'

        except Exception:
            result['mx_records'] = []
            result['mail_server_valid'] = False
            result['provider'] = 'Unknown'

        # Pattern analysis
        result['patterns'] = {
            'has_numbers': bool(re.search(r'\d', local_part)),
            'has_dots': '.' in local_part,
            'has_plus': '+' in local_part,
            'length': len(local_part),
        }

        # Generate possible related formats
        parts = re.split(r'[._]', local_part)
        if len(parts) >= 2:
            result['possible_name'] = {
                'first': parts[0].capitalize(),
                'last': parts[-1].capitalize(),
            }

        return self._result(result)
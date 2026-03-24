"""WHOIS Lookup Tool."""
import whois
from .base_tool import BaseTool


class WhoisLookupTool(BaseTool):
    id = 'whois_lookup'
    name = 'WHOIS Lookup'
    description = 'Get domain registration and ownership information'
    category = 'Reconnaissance'
    icon = 'whois'
    color = '#6b5b95'
    inputs = [
        {'name': 'domain', 'type': 'string', 'label': 'Domain Name', 'required': True,
         'placeholder': 'example.com'},
    ]
    outputs = [
        {'name': 'whois_data', 'type': 'object', 'label': 'WHOIS Data'},
    ]

    def run(self, params):
        domain = params.get('domain', '').strip()
        if not domain:
            return self._result(None, 'error', 'Domain is required')

        try:
            w = whois.whois(domain)
            data = {}
            for key in ['domain_name', 'registrar', 'whois_server', 'creation_date',
                         'expiration_date', 'updated_date', 'name_servers',
                         'status', 'emails', 'name', 'org', 'address',
                         'city', 'state', 'zipcode', 'country']:
                val = getattr(w, key, None)
                if val is not None:
                    if isinstance(val, list):
                        data[key] = [str(v) for v in val]
                    else:
                        data[key] = str(val)

            return self._result({
                'domain': domain,
                'whois': data,
            })
        except Exception as e:
            return self._result(None, 'error', str(e))
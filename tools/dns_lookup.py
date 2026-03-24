"""DNS Lookup Tool."""
import dns.resolver
import socket
from .base_tool import BaseTool


class DNSLookupTool(BaseTool):
    id = 'dns_lookup'
    name = 'DNS Lookup'
    description = 'Resolve domain names to IP addresses, MX, NS, TXT records'
    category = 'Reconnaissance'
    icon = 'dns'
    color = '#4a6fa5'
    inputs = [
        {'name': 'domain', 'type': 'string', 'label': 'Domain Name', 'required': True,
         'placeholder': 'example.com'},
        {'name': 'record_types', 'type': 'multiselect', 'label': 'Record Types',
         'options': ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA', 'PTR'],
         'default': ['A', 'MX', 'NS', 'TXT']},
    ]
    outputs = [
        {'name': 'records', 'type': 'object', 'label': 'DNS Records'},
    ]

    def run(self, params):
        domain = params.get('domain', '').strip()
        if not domain:
            return self._result(None, 'error', 'Domain is required')

        record_types = params.get('record_types', ['A', 'MX', 'NS', 'TXT'])
        results = {}

        for rtype in record_types:
            try:
                answers = dns.resolver.resolve(domain, rtype)
                records = []
                for rdata in answers:
                    record = {'value': str(rdata)}
                    if rtype == 'MX':
                        record['priority'] = rdata.preference
                        record['exchange'] = str(rdata.exchange)
                    records.append(record)
                results[rtype] = records
            except dns.resolver.NoAnswer:
                results[rtype] = []
            except dns.resolver.NXDOMAIN:
                return self._result(None, 'error', f'Domain {domain} does not exist')
            except Exception as e:
                results[rtype] = {'error': str(e)}

        # Also try basic socket resolution
        try:
            ip = socket.gethostbyname(domain)
            results['resolved_ip'] = ip
        except Exception:
            pass

        return self._result({
            'domain': domain,
            'records': results,
        })
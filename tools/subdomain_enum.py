"""Subdomain Enumeration Tool."""
import dns.resolver
import requests
import concurrent.futures
from .base_tool import BaseTool


class SubdomainEnumTool(BaseTool):
    id = 'subdomain_enum'
    name = 'Subdomain Finder'
    description = 'Discover subdomains using DNS brute-force and public sources'
    category = 'Reconnaissance'
    icon = 'subdomain'
    color = '#457b9d'
    inputs = [
        {'name': 'domain', 'type': 'string', 'label': 'Domain', 'required': True,
         'placeholder': 'example.com'},
        {'name': 'method', 'type': 'select', 'label': 'Method',
         'options': ['quick', 'thorough'], 'default': 'quick'},
    ]
    outputs = [
        {'name': 'subdomains', 'type': 'array', 'label': 'Found Subdomains'},
    ]

    COMMON_SUBDOMAINS = [
        'www', 'mail', 'ftp', 'cpanel', 'webmail', 'smtp', 'pop', 'imap',
        'blog', 'forum', 'shop', 'store', 'api', 'dev', 'staging', 'test',
        'admin', 'portal', 'vpn', 'remote', 'ns1', 'ns2', 'ns3', 'dns',
        'mx', 'email', 'cloud', 'cdn', 'static', 'assets', 'img', 'images',
        'media', 'docs', 'wiki', 'support', 'help', 'status', 'monitor',
        'app', 'mobile', 'm', 'login', 'auth', 'sso', 'id', 'account',
        'git', 'gitlab', 'jenkins', 'ci', 'jira', 'confluence', 'slack',
        'beta', 'alpha', 'demo', 'sandbox', 'preview', 'stage', 'uat',
        'db', 'database', 'mysql', 'postgres', 'redis', 'mongo', 'elastic',
        'proxy', 'gateway', 'lb', 'load', 'cache', 'backup', 'old', 'new',
        'secure', 'ssl', 'web', 'www2', 'www3', 'intranet', 'internal',
    ]

    def _check_subdomain(self, subdomain, domain):
        """Check if a subdomain exists."""
        full = f"{subdomain}.{domain}"
        try:
            answers = dns.resolver.resolve(full, 'A')
            ips = [str(r) for r in answers]
            return {'subdomain': full, 'ips': ips, 'exists': True}
        except Exception:
            return None

    def _query_crtsh(self, domain):
        """Query crt.sh for certificate transparency logs."""
        try:
            resp = requests.get(
                f'https://crt.sh/?q=%.{domain}&output=json',
                timeout=15,
                headers={'User-Agent': 'OSINT-Workspace/1.0'}
            )
            if resp.status_code == 200:
                data = resp.json()
                subs = set()
                for entry in data:
                    name = entry.get('name_value', '')
                    for n in name.split('\n'):
                        n = n.strip().lower()
                        if n.endswith(domain) and '*' not in n:
                            subs.add(n)
                return list(subs)
        except Exception:
            pass
        return []

    def run(self, params):
        domain = params.get('domain', '').strip()
        method = params.get('method', 'quick')

        if not domain:
            return self._result(None, 'error', 'Domain is required')

        found = []
        found_set = set()

        # DNS brute force
        wordlist = self.COMMON_SUBDOMAINS if method == 'quick' else self.COMMON_SUBDOMAINS * 1
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            futures = {
                executor.submit(self._check_subdomain, sub, domain): sub
                for sub in wordlist
            }
            for future in concurrent.futures.as_completed(futures):
                result = future.result()
                if result and result['subdomain'] not in found_set:
                    found.append(result)
                    found_set.add(result['subdomain'])

        # Certificate Transparency
        ct_subs = self._query_crtsh(domain)
        for sub in ct_subs:
            if sub not in found_set:
                found.append({'subdomain': sub, 'ips': [], 'exists': True, 'source': 'crt.sh'})
                found_set.add(sub)

        found.sort(key=lambda x: x['subdomain'])

        return self._result({
            'domain': domain,
            'total_found': len(found),
            'subdomains': found,
        })
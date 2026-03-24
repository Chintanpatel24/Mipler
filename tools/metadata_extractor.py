"""Metadata Extractor Tool."""
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from .base_tool import BaseTool


class MetadataExtractorTool(BaseTool):
    id = 'metadata_extractor'
    name = 'Metadata Extractor'
    description = 'Extract metadata from URLs - headers, technologies, meta tags'
    category = 'Analysis'
    icon = 'metadata'
    color = '#a8dadc'
    inputs = [
        {'name': 'url', 'type': 'string', 'label': 'URL', 'required': True,
         'placeholder': 'https://example.com'},
    ]
    outputs = [
        {'name': 'metadata', 'type': 'object', 'label': 'Extracted Metadata'},
    ]

    def run(self, params):
        url = params.get('url', '').strip()
        if not url:
            return self._result(None, 'error', 'URL is required')

        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url

        try:
            resp = requests.get(url, timeout=15, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }, verify=True)

            parsed = urlparse(url)
            result = {
                'url': url,
                'final_url': resp.url,
                'status_code': resp.status_code,
                'domain': parsed.netloc,
            }

            # Headers analysis
            headers = dict(resp.headers)
            result['headers'] = headers
            result['server'] = headers.get('Server', 'Unknown')
            result['powered_by'] = headers.get('X-Powered-By', 'Unknown')

            # Security headers
            security = {}
            for h in ['Strict-Transport-Security', 'Content-Security-Policy',
                       'X-Frame-Options', 'X-Content-Type-Options',
                       'X-XSS-Protection', 'Referrer-Policy']:
                security[h] = headers.get(h, 'Not Set')
            result['security_headers'] = security

            # Parse HTML
            soup = BeautifulSoup(resp.text, 'lxml')

            result['title'] = soup.title.string if soup.title else None

            # Meta tags
            meta_tags = {}
            for tag in soup.find_all('meta'):
                name = tag.get('name') or tag.get('property', '')
                content = tag.get('content', '')
                if name and content:
                    meta_tags[name] = content
            result['meta_tags'] = meta_tags

            # Technologies detection
            techs = []
            page_text = resp.text.lower()
            tech_signatures = {
                'WordPress': ['wp-content', 'wp-includes', 'wordpress'],
                'React': ['react', '_reactroot', '__next'],
                'Vue.js': ['vue.js', 'vue.min.js', '__vue__'],
                'Angular': ['ng-version', 'angular'],
                'jQuery': ['jquery'],
                'Bootstrap': ['bootstrap'],
                'Cloudflare': ['cloudflare'],
                'Nginx': [],
                'Apache': [],
            }

            for tech, sigs in tech_signatures.items():
                for sig in sigs:
                    if sig in page_text:
                        techs.append(tech)
                        break

            if 'nginx' in result['server'].lower():
                techs.append('Nginx')
            if 'apache' in result['server'].lower():
                techs.append('Apache')

            result['technologies'] = list(set(techs))

            # Links
            links = []
            for a in soup.find_all('a', href=True)[:50]:
                links.append(a['href'])
            result['links_count'] = len(soup.find_all('a', href=True))
            result['sample_links'] = links

            return self._result(result)

        except requests.RequestException as e:
            return self._result(None, 'error', str(e))
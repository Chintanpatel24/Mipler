"""Web Scraper Tool."""
import requests
import re
from bs4 import BeautifulSoup
from .base_tool import BaseTool


class WebScraperTool(BaseTool):
    id = 'web_scraper'
    name = 'Web Scraper'
    description = 'Scrape and extract emails, phones, links, and text from web pages'
    category = 'Analysis'
    icon = 'scraper'
    color = '#606c38'
    inputs = [
        {'name': 'url', 'type': 'string', 'label': 'URL', 'required': True,
         'placeholder': 'https://example.com'},
        {'name': 'extract', 'type': 'multiselect', 'label': 'Extract',
         'options': ['emails', 'phones', 'links', 'images', 'text', 'social'],
         'default': ['emails', 'phones', 'links']},
    ]
    outputs = [
        {'name': 'scraped_data', 'type': 'object', 'label': 'Scraped Data'},
    ]

    SOCIAL_PATTERNS = {
        'twitter': r'(?:https?://)?(?:www\.)?(?:twitter\.com|x\.com)/([a-zA-Z0-9_]+)',
        'facebook': r'(?:https?://)?(?:www\.)?facebook\.com/([a-zA-Z0-9.]+)',
        'instagram': r'(?:https?://)?(?:www\.)?instagram\.com/([a-zA-Z0-9_.]+)',
        'linkedin': r'(?:https?://)?(?:www\.)?linkedin\.com/in/([a-zA-Z0-9-]+)',
        'youtube': r'(?:https?://)?(?:www\.)?youtube\.com/(?:c/|channel/|@)([a-zA-Z0-9_-]+)',
        'github': r'(?:https?://)?(?:www\.)?github\.com/([a-zA-Z0-9-]+)',
        'telegram': r'(?:https?://)?(?:t\.me|telegram\.me)/([a-zA-Z0-9_]+)',
    }

    def run(self, params):
        url = params.get('url', '').strip()
        extract = params.get('extract', ['emails', 'phones', 'links'])

        if not url:
            return self._result(None, 'error', 'URL is required')

        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url

        try:
            resp = requests.get(url, timeout=15, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            soup = BeautifulSoup(resp.text, 'lxml')
            page_text = resp.text

            result = {'url': url}

            if 'emails' in extract:
                emails = set(re.findall(
                    r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
                    page_text
                ))
                result['emails'] = sorted(list(emails))

            if 'phones' in extract:
                phones = set(re.findall(
                    r'[\+]?[1-9]?[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}',
                    page_text
                ))
                result['phones'] = sorted(list(phones))[:20]

            if 'links' in extract:
                links = []
                for a in soup.find_all('a', href=True):
                    href = a['href']
                    text = a.get_text(strip=True)[:100]
                    links.append({'href': href, 'text': text})
                result['links'] = links[:100]

            if 'images' in extract:
                images = []
                for img in soup.find_all('img', src=True):
                    images.append({
                        'src': img['src'],
                        'alt': img.get('alt', ''),
                    })
                result['images'] = images[:50]

            if 'text' in extract:
                text = soup.get_text(separator='\n', strip=True)
                result['text'] = text[:5000]
                result['word_count'] = len(text.split())

            if 'social' in extract:
                social = {}
                for platform, pattern in self.SOCIAL_PATTERNS.items():
                    matches = re.findall(pattern, page_text)
                    if matches:
                        social[platform] = list(set(matches))
                result['social_profiles'] = social

            return self._result(result)

        except requests.RequestException as e:
            return self._result(None, 'error', str(e))
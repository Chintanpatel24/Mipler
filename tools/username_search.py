"""Username Search Tool."""
import requests
import concurrent.futures
from .base_tool import BaseTool


class UsernameSearchTool(BaseTool):
    id = 'username_search'
    name = 'Username Search'
    description = 'Check username availability across multiple platforms'
    category = 'Social Media'
    icon = 'person'
    color = '#f2cc8f'
    inputs = [
        {'name': 'username', 'type': 'string', 'label': 'Username', 'required': True,
         'placeholder': 'johndoe'},
    ]
    outputs = [
        {'name': 'results', 'type': 'array', 'label': 'Platform Results'},
    ]

    PLATFORMS = {
        'GitHub': 'https://github.com/{}',
        'Twitter/X': 'https://x.com/{}',
        'Instagram': 'https://www.instagram.com/{}/',
        'Reddit': 'https://www.reddit.com/user/{}',
        'LinkedIn': 'https://www.linkedin.com/in/{}',
        'YouTube': 'https://www.youtube.com/@{}',
        'TikTok': 'https://www.tiktok.com/@{}',
        'Pinterest': 'https://www.pinterest.com/{}/',
        'Tumblr': 'https://{}.tumblr.com',
        'Medium': 'https://medium.com/@{}',
        'DevTo': 'https://dev.to/{}',
        'HackerNews': 'https://news.ycombinator.com/user?id={}',
        'Keybase': 'https://keybase.io/{}',
        'GitLab': 'https://gitlab.com/{}',
        'Bitbucket': 'https://bitbucket.org/{}/',
        'Twitch': 'https://www.twitch.tv/{}',
        'Steam': 'https://steamcommunity.com/id/{}',
        'Spotify': 'https://open.spotify.com/user/{}',
        'SoundCloud': 'https://soundcloud.com/{}',
        'Flickr': 'https://www.flickr.com/people/{}',
        'Vimeo': 'https://vimeo.com/{}',
        'Dribbble': 'https://dribbble.com/{}',
        'Behance': 'https://www.behance.net/{}',
        'About.me': 'https://about.me/{}',
        'Gravatar': 'https://gravatar.com/{}',
        'HackerOne': 'https://hackerone.com/{}',
        'BugCrowd': 'https://bugcrowd.com/{}',
        'Replit': 'https://replit.com/@{}',
        'CodePen': 'https://codepen.io/{}',
        'StackOverflow': 'https://stackoverflow.com/users/?tab=Accounts&SearchOn=DisplayName&SearchText={}',
    }

    def _check_platform(self, platform, url, username):
        """Check if username exists on platform."""
        try:
            formatted_url = url.format(username)
            resp = requests.get(
                formatted_url,
                timeout=8,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                allow_redirects=True,
            )
            exists = resp.status_code == 200
            return {
                'platform': platform,
                'url': formatted_url,
                'exists': exists,
                'status_code': resp.status_code,
            }
        except Exception:
            return {
                'platform': platform,
                'url': url.format(username),
                'exists': None,
                'status_code': None,
                'error': 'timeout/blocked',
            }

    def run(self, params):
        username = params.get('username', '').strip()
        if not username:
            return self._result(None, 'error', 'Username is required')

        results = []
        found_count = 0

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = {
                executor.submit(self._check_platform, platform, url, username): platform
                for platform, url in self.PLATFORMS.items()
            }
            for future in concurrent.futures.as_completed(futures):
                result = future.result()
                results.append(result)
                if result.get('exists'):
                    found_count += 1

        results.sort(key=lambda x: (not x.get('exists', False), x['platform']))

        return self._result({
            'username': username,
            'total_checked': len(results),
            'found_count': found_count,
            'results': results,
        })
"""IP Geolocation Tool."""
import requests
import socket
from .base_tool import BaseTool


class IPGeolocationTool(BaseTool):
    id = 'ip_geolocation'
    name = 'IP Geolocation'
    description = 'Geolocate IP addresses using free services (no API key)'
    category = 'Network'
    icon = 'location'
    color = '#81b29a'
    inputs = [
        {'name': 'ip', 'type': 'string', 'label': 'IP Address or Domain', 'required': True,
         'placeholder': '8.8.8.8 or example.com'},
    ]
    outputs = [
        {'name': 'geo_data', 'type': 'object', 'label': 'Geolocation Data'},
    ]

    def run(self, params):
        target = params.get('ip', '').strip()
        if not target:
            return self._result(None, 'error', 'IP address or domain is required')

        # Resolve domain to IP if needed
        ip = target
        resolved_domain = None
        try:
            socket.inet_aton(target)
        except socket.error:
            try:
                ip = socket.gethostbyname(target)
                resolved_domain = target
            except socket.gaierror:
                return self._result(None, 'error', f'Cannot resolve {target}')

        # Use free ip-api.com (no key needed, 45 req/min)
        try:
            resp = requests.get(
                f'http://ip-api.com/json/{ip}?fields=status,message,country,countryCode,'
                f'region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,query',
                timeout=10
            )
            data = resp.json()

            if data.get('status') == 'fail':
                return self._result(None, 'error', data.get('message', 'Lookup failed'))

            result = {
                'ip': ip,
                'country': data.get('country'),
                'country_code': data.get('countryCode'),
                'region': data.get('regionName'),
                'city': data.get('city'),
                'zip': data.get('zip'),
                'latitude': data.get('lat'),
                'longitude': data.get('lon'),
                'timezone': data.get('timezone'),
                'isp': data.get('isp'),
                'organization': data.get('org'),
                'as_number': data.get('as'),
                'as_name': data.get('asname'),
            }

            if resolved_domain:
                result['resolved_from'] = resolved_domain

            return self._result(result)

        except requests.RequestException as e:
            return self._result(None, 'error', f'Request failed: {str(e)}')
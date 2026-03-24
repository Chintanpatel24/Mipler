"""Passive Recon Tool (no API key required - uses public data only)."""
import requests
import socket
import ssl
from datetime import datetime
from .base_tool import BaseTool


# Note: This file exists for the registry but we won't use Shodan API
# Instead we do passive recon with free methods
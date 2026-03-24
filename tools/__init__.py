"""OSINT Tools Registry."""
from .base_tool import BaseTool
from .dns_lookup import DNSLookupTool
from .whois_lookup import WhoisLookupTool
from .email_osint import EmailOSINTTool
from .ip_geolocation import IPGeolocationTool
from .username_search import UsernameSearchTool
from .hash_lookup import HashLookupTool
from .subdomain_enum import SubdomainEnumTool
from .metadata_extractor import MetadataExtractorTool
from .web_scraper import WebScraperTool


class ToolRegistry:
    """Registry that manages all available OSINT tools."""

    def __init__(self):
        self.tools = {}
        self._register_defaults()

    def _register_defaults(self):
        """Register all default tools."""
        defaults = [
            DNSLookupTool(),
            WhoisLookupTool(),
            EmailOSINTTool(),
            IPGeolocationTool(),
            UsernameSearchTool(),
            HashLookupTool(),
            SubdomainEnumTool(),
            MetadataExtractorTool(),
            WebScraperTool(),
        ]
        for tool in defaults:
            self.tools[tool.id] = tool

    def register(self, tool):
        """Register a new tool."""
        self.tools[tool.id] = tool

    def list_tools(self):
        """List all available tools."""
        return [tool.to_dict() for tool in self.tools.values()]

    def run_tool(self, tool_id, params):
        """Run a specific tool."""
        if tool_id not in self.tools:
            raise ValueError(f"Tool '{tool_id}' not found")
        return self.tools[tool_id].run(params)

    def get_tool_schema(self, tool_id):
        """Get tool input/output schema."""
        if tool_id not in self.tools:
            return None
        return self.tools[tool_id].to_dict()
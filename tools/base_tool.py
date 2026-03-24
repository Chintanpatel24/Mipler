"""Base class for all OSINT tools."""
from abc import ABC, abstractmethod
from datetime import datetime


class BaseTool(ABC):
    """Base OSINT tool class."""

    id = ''
    name = ''
    description = ''
    category = ''
    icon = ''
    color = '#444444'
    inputs = []
    outputs = []

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'icon': self.icon,
            'color': self.color,
            'inputs': self.inputs,
            'outputs': self.outputs,
        }

    @abstractmethod
    def run(self, params):
        """Execute the tool and return results."""
        pass

    def _result(self, data, status='success', error=None):
        return {
            'tool_id': self.id,
            'timestamp': datetime.utcnow().isoformat(),
            'status': status,
            'data': data,
            'error': error,
        }
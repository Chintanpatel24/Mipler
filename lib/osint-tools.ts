// OSINT tools and utilities

import CryptoJS from 'crypto-js';

export interface OSINTTool {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  execute: (input: string) => Promise<any>;
}

// URL Utilities
export const URLDecoder: OSINTTool = {
  id: 'url_decoder',
  name: 'URL Decoder',
  category: 'Encoding',
  description: 'Decode URL-encoded strings',
  icon: 'FileJson',
  execute: async (input: string) => {
    try {
      return {
        success: true,
        original: input,
        decoded: decodeURIComponent(input),
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
};

export const URLEncoder: OSINTTool = {
  id: 'url_encoder',
  name: 'URL Encoder',
  category: 'Encoding',
  description: 'Encode strings as URL-safe format',
  icon: 'FileJson',
  execute: async (input: string) => {
    try {
      return {
        success: true,
        original: input,
        encoded: encodeURIComponent(input),
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
};

// Hash tools
export const MD5Hash: OSINTTool = {
  id: 'md5_hash',
  name: 'MD5 Hash',
  category: 'Hashing',
  description: 'Generate MD5 hash of input',
  icon: 'Lock',
  execute: async (input: string) => {
    try {
      const hash = CryptoJS.MD5(input).toString();
      return {
        success: true,
        original: input,
        hash,
        algorithm: 'MD5',
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
};

export const SHA256Hash: OSINTTool = {
  id: 'sha256_hash',
  name: 'SHA256 Hash',
  category: 'Hashing',
  description: 'Generate SHA256 hash of input',
  icon: 'Lock',
  execute: async (input: string) => {
    try {
      const hash = CryptoJS.SHA256(input).toString();
      return {
        success: true,
        original: input,
        hash,
        algorithm: 'SHA256',
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
};

// Email tools
export const EmailValidator: OSINTTool = {
  id: 'email_validator',
  name: 'Email Validator',
  category: 'Email',
  description: 'Validate email format',
  icon: 'Mail',
  execute: async (input: string) => {
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValid = emailRegex.test(input);
      return {
        success: true,
        email: input,
        isValid,
        format: isValid ? 'Valid' : 'Invalid',
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
};

export const EmailExtractor: OSINTTool = {
  id: 'email_extractor',
  name: 'Email Extractor',
  category: 'Email',
  description: 'Extract emails from text',
  icon: 'Mail',
  execute: async (input: string) => {
    try {
      const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
      const emails = input.match(emailRegex) || [];
      return {
        success: true,
        total: emails.length,
        emails: [...new Set(emails)],
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
};

// IP Tools
export const IPValidator: OSINTTool = {
  id: 'ip_validator',
  name: 'IP Validator',
  category: 'Network',
  description: 'Validate IPv4 and IPv6 addresses',
  icon: 'Globe',
  execute: async (input: string) => {
    try {
      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
      const ipv6Regex = /^([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}$/;
      
      const isIPv4 = ipv4Regex.test(input);
      const isIPv6 = ipv6Regex.test(input);
      
      return {
        success: true,
        input,
        isIPv4,
        isIPv6,
        isValid: isIPv4 || isIPv6,
        type: isIPv4 ? 'IPv4' : isIPv6 ? 'IPv6' : 'Invalid',
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
};

export const IPExtractor: OSINTTool = {
  id: 'ip_extractor',
  name: 'IP Extractor',
  category: 'Network',
  description: 'Extract IP addresses from text',
  icon: 'Globe',
  execute: async (input: string) => {
    try {
      const ipv4Regex = /\b(\d{1,3}\.){3}\d{1,3}\b/g;
      const ipv6Regex = /(?:[0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}/g;
      
      const ipv4s = input.match(ipv4Regex) || [];
      const ipv6s = input.match(ipv6Regex) || [];
      
      return {
        success: true,
        ipv4: [...new Set(ipv4s)],
        ipv6: [...new Set(ipv6s)],
        total: new Set([...ipv4s, ...ipv6s]).size,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
};

// Domain tools
export const DomainExtractor: OSINTTool = {
  id: 'domain_extractor',
  name: 'Domain Extractor',
  category: 'Domain',
  description: 'Extract domains from text',
  icon: 'Globe',
  execute: async (input: string) => {
    try {
      const domainRegex = /(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/gi;
      const domains = input.match(domainRegex) || [];
      return {
        success: true,
        total: domains.length,
        domains: [...new Set(domains.map(d => d.toLowerCase()))],
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
};

export const DomainValidator: OSINTTool = {
  id: 'domain_validator',
  name: 'Domain Validator',
  category: 'Domain',
  description: 'Validate domain format',
  icon: 'Globe',
  execute: async (input: string) => {
    try {
      const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;
      const isValid = domainRegex.test(input);
      return {
        success: true,
        domain: input,
        isValid,
        format: isValid ? 'Valid' : 'Invalid',
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
};

// Text tools
export const Base64Encoder: OSINTTool = {
  id: 'base64_encoder',
  name: 'Base64 Encoder',
  category: 'Encoding',
  description: 'Encode text to Base64',
  icon: 'FileText',
  execute: async (input: string) => {
    try {
      const encoded = btoa(input);
      return {
        success: true,
        original: input,
        encoded,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
};

export const Base64Decoder: OSINTTool = {
  id: 'base64_decoder',
  name: 'Base64 Decoder',
  category: 'Encoding',
  description: 'Decode Base64 to text',
  icon: 'FileText',
  execute: async (input: string) => {
    try {
      const decoded = atob(input);
      return {
        success: true,
        original: input,
        decoded,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
};

export const JSONFormatter: OSINTTool = {
  id: 'json_formatter',
  name: 'JSON Formatter',
  category: 'Formatting',
  description: 'Format and validate JSON',
  icon: 'Braces',
  execute: async (input: string) => {
    try {
      const parsed = JSON.parse(input);
      const formatted = JSON.stringify(parsed, null, 2);
      return {
        success: true,
        isValid: true,
        formatted,
        keys: Object.keys(parsed),
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
};

export const PhoneExtractor: OSINTTool = {
  id: 'phone_extractor',
  name: 'Phone Extractor',
  category: 'Contact',
  description: 'Extract phone numbers from text',
  icon: 'Phone',
  execute: async (input: string) => {
    try {
      const phoneRegex = /(\+?1?\s?)?(\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
      const phones = input.match(phoneRegex) || [];
      return {
        success: true,
        total: phones.length,
        phones: [...new Set(phones)],
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
};

// All tools registry
export const OSINT_TOOLS: OSINTTool[] = [
  URLDecoder,
  URLEncoder,
  MD5Hash,
  SHA256Hash,
  EmailValidator,
  EmailExtractor,
  IPValidator,
  IPExtractor,
  DomainExtractor,
  DomainValidator,
  Base64Encoder,
  Base64Decoder,
  JSONFormatter,
  PhoneExtractor,
];

export const getToolById = (id: string): OSINTTool | undefined => {
  return OSINT_TOOLS.find(tool => tool.id === id);
};

export const getToolsByCategory = (category: string): OSINTTool[] => {
  return OSINT_TOOLS.filter(tool => tool.category === category);
};

export const getAllCategories = (): string[] => {
  return [...new Set(OSINT_TOOLS.map(tool => tool.category))];
};

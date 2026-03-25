// Custom OSINT Tool Integration Framework with Encrypted Credentials
import CryptoJS from 'crypto-js';

export interface CustomTool {
  id: string;
  name: string;
  description: string;
  category: string;
  apiEndpoint?: string;
  apiMethod?: 'GET' | 'POST';
  apiHeaders?: Record<string, string>;
  credentials?: Record<string, any>;
  parameterMapping?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface StoredCredentials {
  toolId: string;
  encrypted: string;
  iv: string; // Initialization vector for AES encryption
}

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_MIPLER_KEY || 'mipler-default-key-change-in-production';

export class CustomToolManager {
  private storagePrefix = 'custom_tools_';

  /**
   * Encrypt credentials using AES encryption
   */
  encryptCredentials(credentials: Record<string, any>, key: string = ENCRYPTION_KEY): string {
    const jsonString = JSON.stringify(credentials);
    return CryptoJS.AES.encrypt(jsonString, key).toString();
  }

  /**
   * Decrypt credentials using AES decryption
   */
  decryptCredentials(encrypted: string, key: string = ENCRYPTION_KEY): Record<string, any> {
    try {
      const bytes = CryptoJS.AES.decrypt(encrypted, key);
      const jsonString = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Failed to decrypt credentials:', error);
      throw new Error('Failed to decrypt credentials. The key may be incorrect.');
    }
  }

  /**
   * Create a new custom tool
   */
  async createCustomTool(tool: Omit<CustomTool, 'id' | 'created_at' | 'updated_at'>): Promise<CustomTool> {
    const newTool: CustomTool = {
      ...tool,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Encrypt credentials before storing
    if (newTool.credentials) {
      const encrypted = this.encryptCredentials(newTool.credentials);
      // Store encrypted credentials separately
      this.storeEncryptedCredentials(newTool.id, encrypted);
      // Remove plain credentials from the tool object
      newTool.credentials = undefined;
    }

    // Store tool in localStorage
    await (window as any).electron?.writeFile(
      `custom_tools/${newTool.id}.json`,
      JSON.stringify(newTool, null, 2)
    );

    return newTool;
  }

  /**
   * Get a custom tool with decrypted credentials
   */
  async getCustomTool(toolId: string): Promise<CustomTool | null> {
    try {
      const result = await (window as any).electron?.readFile(`custom_tools/${toolId}.json`);
      if (!result?.success) return null;

      const tool: CustomTool = JSON.parse(result.data);

      // Decrypt credentials if they exist
      const encryptedCreds = this.getEncryptedCredentials(toolId);
      if (encryptedCreds) {
        tool.credentials = this.decryptCredentials(encryptedCreds);
      }

      return tool;
    } catch (error) {
      console.error('Failed to get custom tool:', error);
      return null;
    }
  }

  /**
   * List all custom tools
   */
  async listCustomTools(): Promise<CustomTool[]> {
    try {
      const files = await (window as any).electron?.listFiles('custom_tools');
      const tools: CustomTool[] = [];

      for (const file of files || []) {
        if (file.endsWith('.json')) {
          const toolId = file.replace('.json', '');
          const tool = await this.getCustomTool(toolId);
          if (tool) tools.push(tool);
        }
      }

      return tools;
    } catch (error) {
      console.error('Failed to list custom tools:', error);
      return [];
    }
  }

  /**
   * Update a custom tool
   */
  async updateCustomTool(toolId: string, updates: Partial<CustomTool>): Promise<CustomTool | null> {
    try {
      const tool = await this.getCustomTool(toolId);
      if (!tool) return null;

      const updatedTool: CustomTool = {
        ...tool,
        ...updates,
        id: tool.id,
        created_at: tool.created_at,
        updated_at: new Date().toISOString(),
      };

      // Re-encrypt credentials if provided
      if (updates.credentials) {
        const encrypted = this.encryptCredentials(updates.credentials);
        this.storeEncryptedCredentials(toolId, encrypted);
        updatedTool.credentials = undefined;
      }

      await (window as any).electron?.writeFile(
        `custom_tools/${toolId}.json`,
        JSON.stringify(updatedTool, null, 2)
      );

      return updatedTool;
    } catch (error) {
      console.error('Failed to update custom tool:', error);
      return null;
    }
  }

  /**
   * Delete a custom tool
   */
  async deleteCustomTool(toolId: string): Promise<boolean> {
    try {
      await (window as any).electron?.deleteFile(`custom_tools/${toolId}.json`);
      this.clearEncryptedCredentials(toolId);
      return true;
    } catch (error) {
      console.error('Failed to delete custom tool:', error);
      return false;
    }
  }

  /**
   * Execute a custom tool with API call
   */
  async executeCustomTool(
    toolId: string,
    input: string,
    timeout: number = 30000
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      const tool = await this.getCustomTool(toolId);
      if (!tool) {
        return { success: false, error: 'Tool not found' };
      }

      if (!tool.apiEndpoint) {
        return { success: false, error: 'No API endpoint configured' };
      }

      // Build request URL with parameter mapping
      let url = tool.apiEndpoint;
      let body: any = null;

      if (tool.parameterMapping) {
        const params = new URLSearchParams();
        Object.entries(tool.parameterMapping).forEach(([key, value]) => {
          if (value === '{input}') {
            params.append(key, input);
          } else if (tool.credentials?.[value]) {
            params.append(key, tool.credentials[value]);
          }
        });

        if (tool.apiMethod === 'GET') {
          url = `${url}?${params.toString()}`;
        } else if (tool.apiMethod === 'POST') {
          body = params;
        }
      }

      // Create abort controller for timeout
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), timeout);

      try {
        const response = await fetch(url, {
          method: tool.apiMethod || 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...tool.apiHeaders,
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          return {
            success: false,
            error: `API returned status ${response.status}: ${response.statusText}`,
          };
        }

        const result = await response.json();
        return { success: true, result };
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          return { success: false, error: 'Request timeout' };
        }
        return { success: false, error: error.message };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate API endpoint (test connection)
   */
  async validateApiEndpoint(
    endpoint: string,
    method: string = 'GET',
    headers?: Record<string, string>
  ): Promise<boolean> {
    try {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 5000);

      const response = await fetch(endpoint, {
        method,
        headers: headers || {},
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);
      return response.ok || response.status === 401; // 401 might mean auth is needed but endpoint exists
    } catch (error) {
      return false;
    }
  }

  /**
   * Store encrypted credentials in browser storage
   */
  private storeEncryptedCredentials(toolId: string, encrypted: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`${this.storagePrefix}${toolId}`, encrypted);
      }
    } catch (error) {
      console.error('Failed to store encrypted credentials:', error);
    }
  }

  /**
   * Retrieve encrypted credentials from browser storage
   */
  private getEncryptedCredentials(toolId: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(`${this.storagePrefix}${toolId}`);
      }
    } catch (error) {
      console.error('Failed to retrieve encrypted credentials:', error);
    }
    return null;
  }

  /**
   * Clear encrypted credentials from browser storage
   */
  private clearEncryptedCredentials(toolId: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(`${this.storagePrefix}${toolId}`);
      }
    } catch (error) {
      console.error('Failed to clear encrypted credentials:', error);
    }
  }
}

// Singleton instance
export const customToolManager = new CustomToolManager();

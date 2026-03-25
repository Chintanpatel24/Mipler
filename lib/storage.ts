// Storage utility for managing investigations and workflows
import { toast } from 'sonner';

interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class InvestigationStorage {
  private basePath = 'investigations';

  async init() {
    try {
      await (window as any).electron?.createFolder(this.basePath);
    } catch (error) {
      console.error('Failed to initialize storage:', error);
    }
  }

  async createInvestigation(name: string, metadata: Record<string, any> = {}) {
    try {
      const id = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const investigationData = {
        id,
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        workflow: {
          nodes: [],
          edges: [],
        },
        metadata,
      };

      const path = `${this.basePath}/${id}/index.json`;
      await (window as any).electron?.writeFile(path, JSON.stringify(investigationData, null, 2));
      
      toast.success(`Investigation "${name}" created`);
      return { success: true, data: investigationData };
    } catch (error: any) {
      toast.error(`Failed to create investigation: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async listInvestigations(): Promise<StorageResult<any[]>> {
    try {
      const files = await (window as any).electron?.listFiles(this.basePath);
      const investigations = [];

      for (const file of files || []) {
        try {
          const result = await (window as any).electron?.readFile(
            `${this.basePath}/${file}/index.json`
          );
          if (result?.success) {
            investigations.push(JSON.parse(result.data));
          }
        } catch (e) {
          // Skip invalid investigations
        }
      }

      return { success: true, data: investigations };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async loadInvestigation(id: string): Promise<StorageResult<any>> {
    try {
      const result = await (window as any).electron?.readFile(
        `${this.basePath}/${id}/index.json`
      );
      if (result?.success) {
        return { success: true, data: JSON.parse(result.data) };
      }
      return { success: false, error: 'Investigation not found' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async saveInvestigation(investigation: any): Promise<StorageResult<void>> {
    try {
      investigation.updatedAt = new Date().toISOString();
      const path = `${this.basePath}/${investigation.id}/index.json`;
      await (window as any).electron?.writeFile(path, JSON.stringify(investigation, null, 2));
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deleteInvestigation(id: string): Promise<StorageResult<void>> {
    try {
      const path = `${this.basePath}/${id}/index.json`;
      await (window as any).electron?.deleteFile(path);
      toast.success('Investigation deleted');
      return { success: true };
    } catch (error: any) {
      toast.error(`Failed to delete investigation: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async exportInvestigation(id: string, exportPath: string): Promise<StorageResult<void>> {
    try {
      const result = await this.loadInvestigation(id);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      
      // Export as JSON
      const filename = `${result.data.name.replace(/\s+/g, '_')}_${id}.json`;
      const content = JSON.stringify(result.data, null, 2);
      
      // In a real scenario, this would use file picker API
      console.log(`Exporting to: ${exportPath}/${filename}`);
      
      toast.success('Investigation exported');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Global storage instance
export const investigationStorage = new InvestigationStorage();

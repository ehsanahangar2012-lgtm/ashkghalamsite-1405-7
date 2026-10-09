import { DielineTemplate } from '../metadata/types';

export type DielineParams = Record<string, any>;
export type DielineGeometryResult = any; // Will define in geometry types

export type DielineEngine = (params: DielineParams) => DielineGeometryResult;

export class TemplateRegistry {
  private templates: Map<string, DielineTemplate> = new Map();
  private engines: Map<string, DielineEngine> = new Map();

  registerTemplate(template: DielineTemplate, engine: DielineEngine) {
    this.templates.set(template.id, template);
    this.engines.set(template.engine, engine); // Map the engine string identifier to the actual engine
  }

  getTemplate(id: string): DielineTemplate | undefined {
    return this.templates.get(id);
  }

  getEngine(engineId: string): DielineEngine | undefined {
    return this.engines.get(engineId);
  }

  getAllTemplates(): DielineTemplate[] {
    return Array.from(this.templates.values());
  }

  async loadEngineDynamically(engineId: string): Promise<DielineEngine> {
    // In a real application, this might use dynamic imports based on the engineId
    // e.g., const module = await import(`../engines/${engineId}.ts`);
    // return module.default;
    
    const engine = this.engines.get(engineId);
    if (!engine) {
      throw new Error(`Engine ${engineId} not found in registry.`);
    }
    return engine;
  }
}

export const globalRegistry = new TemplateRegistry();

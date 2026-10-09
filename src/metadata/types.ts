export interface DielineTemplate {
  id: string;
  slug: string;
  name: string;
  category: string;
  subcategory: string;
  fefco: string;
  engine: string;
  thumbnail: string;
  preview: string;
  difficulty: string;
  industry: string[];
  materials: string[];
  applications: string[];
  outputs: string[];
  parameters: ParameterDefinition[];
  seo: SeoDefinition;
}

export interface ParameterDefinition {
  id: string;
  name: string;
  type: 'number' | 'string' | 'boolean' | 'enum';
  defaultValue: any;
  min?: number;
  max?: number;
  options?: string[];
  description?: string;
}

export interface SeoDefinition {
  title: string;
  description: string;
  keywords: string[];
  faq: { question: string; answer: string }[];
  schemaType?: string;
}

import { Router } from 'express';
import { globalRegistry } from '../registry/TemplateRegistry';
import { RuleEngine } from '../rules/RuleEngine';
import { SVGExporter } from '../exporters/SVGExporter';
import workflowRouter from '../workflow/workflowRouter';

const router = Router();

// Mount Ashk24 Production Workflow Router
router.use('/workflow', workflowRouter);

router.post('/generate', async (req, res) => {
  try {
    const { templateId, params, format } = req.body;
    
    // 1. Get Template
    const template = globalRegistry.getTemplate(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // 2. Execute Rules (this would typically be bound to the template metadata)
    const ruleEngine = new RuleEngine();
    // Add template-specific rules here...
    const evaluatedParams = ruleEngine.evaluate(params);

    // 3. Load Engine dynamically
    const engine = await globalRegistry.loadEngineDynamically(template.engine);

    // 4. Generate Geometry Primitives via Engine
    const primitives = engine(evaluatedParams);

    // 5. Export
    if (format === 'svg') {
      const exporter = new SVGExporter();
      const svg = exporter.export(primitives);
      return res.type('svg').send(svg);
    }
    
    // Other formats (dxf, pdf...)
    return res.json({ primitives });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;

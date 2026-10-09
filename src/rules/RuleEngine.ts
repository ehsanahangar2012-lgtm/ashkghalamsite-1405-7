export interface RuleContext {
  params: Record<string, any>;
  constants: Record<string, any>;
}

export type RuleCondition = (context: RuleContext) => boolean;
export type RuleAction = (context: RuleContext) => void;

export interface Rule {
  id: string;
  condition?: RuleCondition; // if undefined, always applies
  action: RuleAction;
}

export class RuleEngine {
  private rules: Rule[] = [];

  addRule(rule: Rule) {
    this.rules.push(rule);
  }

  evaluate(initialParams: Record<string, any>, constants: Record<string, any> = {}): Record<string, any> {
    const context: RuleContext = {
      params: { ...initialParams },
      constants,
    };

    for (const rule of this.rules) {
      if (!rule.condition || rule.condition(context)) {
        rule.action(context);
      }
    }

    return context.params;
  }
}

// Example usage:
// const engine = new RuleEngine();
// engine.addRule({
//   id: 'glue-tab-size',
//   condition: (ctx) => ctx.params.width < 150,
//   action: (ctx) => { ctx.params.glueTab = 18; }
// });

export class PatternLearningEngine {
  static savePattern(pattern: any) {
    try {
      const stored = localStorage.getItem('ashk_learned_patterns') || '[]';
      const list = JSON.parse(stored);
      list.push(pattern);
      localStorage.setItem('ashk_learned_patterns', JSON.stringify(list));
    } catch {}
  }

  static getPatterns(): any[] {
    try {
      const stored = localStorage.getItem('ashk_learned_patterns');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
}

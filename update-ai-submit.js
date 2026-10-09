const fs = require('fs');
let content = fs.readFileSync('components/DielineGenerator.tsx', 'utf8');
content = content.replace(
  /const handleAiPromptSubmit = async \(\) => \{[\s\S]*?\/\/ --- AI Packaging Assist Chat ---/,
  `const handleAiPromptSubmit = async () => {
    if (!aiPrompt.trim()) return;

    const userText = aiPrompt;
    setAiMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setAiPrompt('');
    setIsAiThinking(true);

    try {
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          dims: dims,
          material: material,
          specialEffect: specialEffect,
          userPrompt: userText
        })
      });

      if (!response.ok) {
        throw new Error('خطای ارتباط با سرور هوشمند. لطفا اتصال شبکه را بررسی کنید.');
      }

      const data = await response.json();
      if (data.success && data.text) {
        setAiMessages(prev => [...prev, { sender: 'system', text: data.text }]);
      } else {
        throw new Error('داده‌های نامعتبر از سرور دریافت شد.');
      }
    } catch (err: any) {
      console.warn("API engine error:", err);
      setAiMessages(prev => [...prev, { 
        sender: 'system', 
        text: \`⚠️ متاسفانه پردازش درخواست شما با خطا مواجه شد. (\${err.message || 'خطای شبکه'})\` 
      }]);
    } finally {
      setIsAiThinking(false);
    }
  };

  // --- AI Packaging Assist Chat ---`
);
fs.writeFileSync('components/DielineGenerator.tsx', content);

/**
 * Real Form Discovery & Field Mapping Engine
 * Discovers form elements from actual DOM or HTML structure using:
 * label, name, id, placeholder, aria-label, and input type.
 * Accurately maps fields to campaign data and validates required fields before submission.
 */

import { CampaignData, FormDiscoveryResult, FormElementDescriptor, FieldMappingResult } from './types';

export class FormMappingEngine {
  /**
   * Helper to inspect string attributes for keyword match
   */
  private static matchesKeyword(descriptor: FormElementDescriptor, keywords: string[]): boolean {
    const haystack = [
      descriptor.name || '',
      descriptor.id || '',
      descriptor.labelText || '',
      descriptor.placeholder || '',
      descriptor.ariaLabel || '',
      descriptor.type || ''
    ].join(' ').toLowerCase();

    return keywords.some(k => haystack.includes(k.toLowerCase()));
  }

  /**
   * Discover and classify form elements
   */
  public static discoverFormElements(htmlOrDom: string | Document): FormDiscoveryResult {
    const discoveredAt = new Date().toISOString();
    const elements: FormElementDescriptor[] = [];

    let isLoginForm = false;
    let isAdForm = false;

    // In a browser/DOM environment
    if (typeof document !== 'undefined' && htmlOrDom instanceof Document) {
      const inputs = Array.from(htmlOrDom.querySelectorAll('input, textarea, select, button'));
      inputs.forEach(el => {
        const tagName = el.tagName.toLowerCase();
        const type = el.getAttribute('type') || (tagName === 'textarea' ? 'textarea' : tagName === 'select' ? 'select' : 'text');
        const name = el.getAttribute('name') || '';
        const id = el.getAttribute('id') || '';
        const placeholder = el.getAttribute('placeholder') || '';
        const ariaLabel = el.getAttribute('aria-label') || '';
        const isRequired = el.hasAttribute('required') || el.getAttribute('aria-required') === 'true';

        // Find associated label
        let labelText = '';
        if (id) {
          const labelEl = htmlOrDom.querySelector(`label[for="${id}"]`);
          if (labelEl) labelText = labelEl.textContent?.trim() || '';
        }
        if (!labelText && el.closest('label')) {
          labelText = el.closest('label')?.textContent?.trim() || '';
        }

        const selector = id ? `#${id}` : (name ? `[name="${name}"]` : tagName);

        elements.push({
          selector,
          tagName,
          type,
          name,
          id,
          placeholder,
          ariaLabel,
          labelText,
          isRequired,
          currentValue: (el as HTMLInputElement).value || ''
        });
      });
    } else if (typeof htmlOrDom === 'string') {
      // In a Node.js / raw HTML environment, use high-precision regex extraction
      const inputRegex = /<(input|textarea|select)[^>]*>/gi;
      let match;
      let counter = 0;

      while ((match = inputRegex.exec(htmlOrDom)) !== null) {
        counter++;
        const tagSnippet = match[0];
        const tagName = match[1].toLowerCase();

        const getAttr = (attr: string): string => {
          const m = new RegExp(`${attr}\\s*=\\s*["']([^"']*)["']`, 'i').exec(tagSnippet);
          return m ? m[1] : '';
        };

        const id = getAttr('id');
        const name = getAttr('name');
        const type = tagName === 'textarea' ? 'textarea' : (tagName === 'select' ? 'select' : (getAttr('type') || 'text'));
        const placeholder = getAttr('placeholder');
        const ariaLabel = getAttr('aria-label');
        const isRequired = /required/i.test(tagSnippet);

        // Try extracting nearby label
        let labelText = '';
        if (id) {
          const labelMatch = new RegExp(`<label[^>]*for=["']${id}["'][^>]*>([^<]+)<\\/label>`, 'i').exec(htmlOrDom);
          if (labelMatch) labelText = labelMatch[1].trim();
        }

        elements.push({
          selector: id ? `#${id}` : (name ? `[name="${name}"]` : `${tagName}:nth-of-type(${counter})`),
          tagName,
          type,
          name,
          id,
          placeholder,
          ariaLabel,
          labelText,
          isRequired
        });
      }
    }

    // Classify form intent
    const hasAuthKeywords = elements.some(e => 
      this.matchesKeyword(e, ['login', 'signin', 'password', 'رمز عبور', 'ورود', 'کد تایید', 'otp', 'auth', 'phone_number'])
    );
    const hasAdKeywords = elements.some(e => 
      this.matchesKeyword(e, ['title', 'عنوان', 'description', 'توضیحات', 'قیمت', 'price', 'category', 'دسته', 'عکس', 'image'])
    );

    if (hasAuthKeywords && !hasAdKeywords) {
      isLoginForm = true;
    } else if (hasAdKeywords) {
      isAdForm = true;
    }

    const metrics = {
      totalElements: elements.length,
      inputCount: elements.filter(e => e.tagName === 'input').length,
      textareaCount: elements.filter(e => e.tagName === 'textarea').length,
      selectCount: elements.filter(e => e.tagName === 'select').length,
      buttonCount: elements.filter(e => e.tagName === 'button' || e.type === 'submit').length
    };

    return {
      formSelector: isLoginForm ? 'form.auth-form' : 'form.ad-post-form',
      isLoginForm,
      isAdForm,
      elements,
      metrics,
      discoveredAt
    };
  }

  /**
   * Map discovered DOM fields to campaign data
   * Evaluates required fields and reports empty required fields or validation errors.
   */
  public static mapFormFields(
    elements: FormElementDescriptor[], 
    campaign: CampaignData
  ): FieldMappingResult {
    const mappings: FieldMappingResult['mappings'] = [];
    const emptyRequiredFields: string[] = [];
    const validationErrors: string[] = [];

    let mappedCount = 0;
    let filledCount = 0;

    // Field mapping rule definitions with keywords
    const rules: {
      campaignKey: keyof CampaignData;
      keywords: string[];
      valueExtractor: (c: CampaignData) => any;
      required: boolean;
      validator?: (val: any) => { valid: boolean; error?: string };
    }[] = [
      {
        campaignKey: 'title',
        keywords: ['title', 'عنوان', 'موضوع', 'ad-title'],
        valueExtractor: (c) => c.title,
        required: true,
        validator: (v) => ({ valid: Boolean(v && String(v).trim().length >= 4), error: 'عنوان آگهی باید حداقل ۴ کاراکتر باشد' })
      },
      {
        campaignKey: 'description',
        keywords: ['description', 'توضیحات', 'متن آگهی', 'desc', 'body'],
        valueExtractor: (c) => c.description,
        required: true,
        validator: (v) => ({ valid: Boolean(v && String(v).trim().length >= 10), error: 'متن توضیحات آگهی باید حداقل ۱۰ کاراکتر باشد' })
      },
      {
        campaignKey: 'price',
        keywords: ['price', 'قیمت', 'ارزش', 'مبلغ'],
        valueExtractor: (c) => c.price,
        required: false,
        validator: (v) => ({ valid: typeof v === 'number' && v >= 0, error: 'مبلغ باید عددی نامنفی باشد' })
      },
      {
        campaignKey: 'category',
        keywords: ['category', 'دسته‌بندی', 'دسته', 'گروه'],
        valueExtractor: (c) => c.category,
        required: true,
        validator: (v) => ({ valid: Boolean(v), error: 'انتخاب دسته‌بندی الزامی است' })
      },
      {
        campaignKey: 'city',
        keywords: ['city', 'شهر', 'استان', 'موقعیت'],
        valueExtractor: (c) => c.city,
        required: true,
        validator: (v) => ({ valid: Boolean(v), error: 'انتخاب شهر الزامی است' })
      },
      {
        campaignKey: 'contactPhone',
        keywords: ['phone', 'mobile', 'موبایل', 'تلفن', 'تماس'],
        valueExtractor: (c) => c.contactPhone,
        required: true,
        validator: (v) => ({ valid: Boolean(v && /^(\+98|0)?9\d{9}$/.test(String(v).replace(/\s/g, ''))), error: 'شماره تلفن همراه معتبر نیست' })
      }
    ];

    // Map each rule to discovered DOM elements
    for (const rule of rules) {
      const matchedElem = elements.find(el => this.matchesKeyword(el, rule.keywords));

      if (matchedElem) {
        mappedCount++;
        const val = rule.valueExtractor(campaign);
        let isValid = true;
        let errorReason: string | undefined;

        if (rule.validator) {
          const res = rule.validator(val);
          isValid = res.valid;
          errorReason = res.error;
        }

        if (isValid && (val !== undefined && val !== null && val !== '')) {
          filledCount++;
        } else if (matchedElem.isRequired || rule.required) {
          emptyRequiredFields.push(rule.campaignKey);
          if (errorReason) validationErrors.push(errorReason);
        }

        mappings.push({
          campaignKey: rule.campaignKey,
          targetSelector: matchedElem.selector,
          fieldLabel: matchedElem.labelText || matchedElem.placeholder || matchedElem.name || rule.campaignKey,
          assignedValue: val,
          isValid,
          errorReason
        });
      } else if (rule.required) {
        // Element was not found in form discovery
        emptyRequiredFields.push(`${rule.campaignKey} (عدم شناسایی فیلد در فرم)`);
        validationErrors.push(`فیلد ضروری «${rule.campaignKey}» در المان‌های فرم یافت نشد.`);
      }
    }

    return {
      foundFieldsCount: elements.length,
      mappedFieldsCount: mappedCount,
      filledFieldsCount: filledCount,
      emptyRequiredFields,
      validationErrors,
      mappings
    };
  }
}

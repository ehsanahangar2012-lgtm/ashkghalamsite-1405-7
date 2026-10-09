/**
 * Real End-to-End Ad Publishing Workflow Engine
 * Orchestrates campaign publication across platforms from login detection to verified ad link.
 */

import { 
  CampaignData, 
  WorkflowIdentifiers, 
  WorkflowPhase, 
  WorkerTask, 
  WorkerType, 
  AuthStateResult, 
  OtpChallengeState, 
  VerificationResult,
  FormDiscoveryResult,
  FieldMappingResult
} from './types';
import { FormMappingEngine } from './FormMappingEngine';
import { WorkerCoordinator } from './WorkerCoordinator';
import { WorkflowVerificationService } from './VerificationService';

export interface WorkflowExecutionState {
  identifiers: WorkflowIdentifiers;
  campaign: CampaignData;
  targetPlatform: string;
  currentPhase: WorkflowPhase;
  activeWorker: WorkerType;
  currentTaskId?: string;
  authState: AuthStateResult;
  formDiscovery?: FormDiscoveryResult;
  fieldMapping?: FieldMappingResult;
  otpState: OtpChallengeState;
  submissionResult?: {
    submitClicked: boolean;
    responsePayload?: any;
    rawAdUrl?: string;
    rawAdId?: string;
    formErrors?: string[];
  };
  verificationResult?: VerificationResult;
  phaseTimestamps: Record<string, { iso: string; shamsi: string }>;
  logs: string[];
}

export class WorkflowEngine {
  private coordinator: WorkerCoordinator;
  private verificationService: WorkflowVerificationService;

  constructor() {
    this.coordinator = WorkerCoordinator.getInstance();
    this.verificationService = WorkflowVerificationService.getInstance();
  }

  private recordPhase(state: WorkflowExecutionState, phase: WorkflowPhase, logMessage: string): void {
    const now = new Date();
    const iso = now.toISOString();
    const shamsi = this.verificationService.getShamsiTimestamp(now);

    state.currentPhase = phase;
    state.phaseTimestamps[phase] = { iso, shamsi };
    state.logs.push(`[${shamsi}] [${phase}] ${logMessage}`);
  }

  /**
   * Initialize a new End-to-End Workflow Execution
   */
  public initializeWorkflow(
    campaign: CampaignData,
    targetPlatform: string = 'Divar / B2B Industrial Ads',
    preferredWorker: WorkerType = 'github_worker'
  ): WorkflowExecutionState {
    const identifiers: WorkflowIdentifiers = {
      workflowId: `wf-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      executionId: `exec-${Date.now()}`,
      jobId: `job-ad-publish-${campaign.campaignId}`,
      actionId: `act-submit-${Date.now()}`
    };

    const initialAuthState: AuthStateResult = {
      isAuthenticated: false,
      requiresLogin: true,
      requiresRegistration: false,
      requiresOtp: false,
      pageUrl: `https://${targetPlatform.toLowerCase().replace(/[^a-z0-9]/g, '')}.ir/new`,
      evidence: {
        timestamp: new Date().toISOString(),
        timestampShamsi: this.verificationService.getShamsiTimestamp(),
        phase: 'INIT',
        description: 'گردش کار انتشار آگهی مقداردهی اولیه شد.'
      }
    };

    const initialOtpState: OtpChallengeState = {
      isChallenged: false,
      status: 'NONE',
      evidence: []
    };

    const state: WorkflowExecutionState = {
      identifiers,
      campaign,
      targetPlatform,
      currentPhase: 'INITIALIZED',
      activeWorker: preferredWorker,
      authState: initialAuthState,
      otpState: initialOtpState,
      phaseTimestamps: {},
      logs: []
    };

    this.recordPhase(state, 'INITIALIZED', `گردش کار برای کمپین «${campaign.title}» روی پلتفرم ${targetPlatform} آغاز گردید.`);
    return state;
  }

  /**
   * Phase 1 & 2: Evaluate Real Browser Authentication State
   */
  public evaluateAuthentication(
    state: WorkflowExecutionState,
    pageHtml: string,
    cookiesOrSession?: Record<string, string>
  ): WorkflowExecutionState {
    this.recordPhase(state, 'LOGIN_CHECK', 'بررسی وضعیت ورود به سامانه از مرورگر و سشن...');

    // Separate discovery for login form vs ad form
    const discovery = FormMappingEngine.discoverFormElements(pageHtml);
    state.formDiscovery = discovery;

    const hasAuthToken = Boolean(cookiesOrSession?.token || cookiesOrSession?.auth || cookiesOrSession?.sessionid);
    const userProfileFound = /class=["'][^"']*(?:user-profile|user-menu|dashboard-account|my-account)[^"']*["']/i.test(pageHtml);
    const hasActiveLoginForm = discovery.isLoginForm;

    if (hasAuthToken || (userProfileFound && !hasActiveLoginForm)) {
      state.authState.isAuthenticated = true;
      state.authState.requiresLogin = false;
      this.recordPhase(state, 'AUTH_VERIFIED', 'وضعیت کاربر لاگین‌شده تأیید شد. سشن و منوی کاربری فعال است.');
    } else {
      state.authState.isAuthenticated = false;
      state.authState.requiresLogin = true;

      // Check if phone or registration needed
      const isRegistration = /ثبت‌نام|حساب کاربری جدید|register/i.test(pageHtml);
      if (isRegistration) {
        state.authState.requiresRegistration = true;
        this.recordPhase(state, 'REGISTRATION_REQUIRED', 'کاربر در پلتفرم عضو نیست؛ نیاز به تکمیل ثبت‌نام اولیه.');
      } else {
        this.recordPhase(state, 'LOGIN_REQUIRED', 'فرم ورود تشخیص داده شد. تا پیش از احراز هویت، ورود به فرم آگهی متوقف است.');
      }
    }

    return state;
  }

  /**
   * Complete Login Step & Move to Ad Form
   */
  public completeLogin(
    state: WorkflowExecutionState, 
    confirmedUserId: string,
    sessionToken: string
  ): WorkflowExecutionState {
    state.authState.isAuthenticated = true;
    state.authState.currentUserId = confirmedUserId;
    state.authState.sessionToken = sessionToken;
    state.authState.requiresLogin = false;

    this.recordPhase(state, 'AUTH_VERIFIED', `ورود با شناسه ${confirmedUserId} به صورت قطعی تأیید شد.`);
    return state;
  }

  /**
   * Phase 3: Discover Ad Form and Map Campaign Fields
   */
  public discoverAndMapAdForm(
    state: WorkflowExecutionState,
    adPageHtml: string
  ): WorkflowExecutionState {
    if (!state.authState.isAuthenticated) {
      this.recordPhase(state, 'BLOCKED', 'خطای توقف: امکان ورود به فرم آگهی قبل از احراز هویت وجود ندارد.');
      return state;
    }

    this.recordPhase(state, 'AD_FORM_DISCOVERY', 'استخراج و شناسایی فیلدهای فرم درج آگهی از DOM واقعی...');
    const discovery = FormMappingEngine.discoverFormElements(adPageHtml);
    state.formDiscovery = discovery;

    this.recordPhase(state, 'FIELD_MAPPING', `نگاشت ${discovery.elements.length} المان یافته‌شده به داده‌های کمپین...`);
    const mapping = FormMappingEngine.mapFormFields(discovery.elements, state.campaign);
    state.fieldMapping = mapping;

    this.recordPhase(state, 'FORM_VALIDATION', 
      `گزارش فیلدها: یافته‌شده: ${mapping.foundFieldsCount} | نگاشت‌شده: ${mapping.mappedFieldsCount} | پرشده: ${mapping.filledFieldsCount} | خطاهای اعتبارسنجی: ${mapping.validationErrors.length}`
    );

    if (mapping.emptyRequiredFields.length > 0 || mapping.validationErrors.length > 0) {
      const errList = [...mapping.emptyRequiredFields, ...mapping.validationErrors].join(', ');
      this.recordPhase(state, 'FAILED', `اعتبارسنجی فرم متوقف شد. فیلدهای ضروری خالی یا نامعتبر: ${errList}`);
    } else {
      this.recordPhase(state, 'FORM_FILLED', 'تمامی فیلدهای ضروری با موفقیت نگاشت و پر شدند. آماده ارسال.');
    }

    return state;
  }

  /**
   * Phase 5: Trigger OTP Challenge
   */
  public triggerOtpChallenge(
    state: WorkflowExecutionState,
    otpInputSelector: string = '#otp-input',
    expirySeconds: number = 120
  ): WorkflowExecutionState {
    const now = new Date();
    const iso = now.toISOString();
    const shamsi = this.verificationService.getShamsiTimestamp(now);

    state.otpState = {
      isChallenged: true,
      status: 'OTP_REQUESTED',
      otpInputSelector,
      expirySeconds,
      requestedAt: iso,
      evidence: [
        {
          timestamp: iso,
          timestampShamsi: shamsi,
          phase: 'OTP_REQUESTED',
          description: `چالش OTP فعال گردید. پیامک ارسال شد و ورودی ${otpInputSelector} منتظر کد است.`
        }
      ]
    };

    this.recordPhase(state, 'AWAITING_OTP', `سامانه نیازمند کد تایید یکبارمصرف است. مهلت انقضا: ${expirySeconds} ثانیه.`);
    return state;
  }

  /**
   * Submit OTP Code and Verify Acceptance
   */
  public submitAndVerifyOtp(
    state: WorkflowExecutionState,
    code: string,
    isAcceptedByServer: boolean
  ): WorkflowExecutionState {
    const now = new Date();
    const iso = now.toISOString();
    const shamsi = this.verificationService.getShamsiTimestamp(now);

    state.otpState.code = code;
    state.otpState.submittedAt = iso;
    state.otpState.status = 'OTP_SUBMITTED';
    state.otpState.evidence.push({
      timestamp: iso,
      timestampShamsi: shamsi,
      phase: 'OTP_SUBMITTED',
      description: `کد یکبارمصرف وارد گردید و درخواست تایید به سرور ارسال شد.`
    });

    if (isAcceptedByServer) {
      state.otpState.status = 'OTP_VERIFIED';
      state.otpState.verifiedAt = iso;
      state.otpState.isChallenged = false;
      state.otpState.evidence.push({
        timestamp: iso,
        timestampShamsi: shamsi,
        phase: 'OTP_VERIFIED',
        description: 'کد تایید توسط سرور پذیرفته شد و مانع احراز هویت برطرف گردید.'
      });
      this.recordPhase(state, 'SUBMISSION_PENDING', 'کد تایید پذیرفته شد. آماده کلیک بر دکمه انتشار آگهی.');
    } else {
      state.otpState.status = 'REJECTED';
      this.recordPhase(state, 'FAILED', 'کد تایید توسط پلتفرم رد شد یا منقضی گردیده است.');
    }

    return state;
  }

  /**
   * Submit Ad Form and Collect Platform Result
   */
  public submitAdForm(
    state: WorkflowExecutionState,
    clickSucceeded: boolean,
    rawResponse: any
  ): WorkflowExecutionState {
    if (state.currentPhase === 'AWAITING_OTP' || state.otpState.isChallenged) {
      this.recordPhase(state, 'BLOCKED', 'خطا: امکان ارسال فرم قبل از تکمیل موفق چالش OTP وجود ندارد.');
      return state;
    }

    if (!state.fieldMapping || state.fieldMapping.emptyRequiredFields.length > 0) {
      this.recordPhase(state, 'FAILED', 'خطا: فیلدهای ضروری تکمیل نشده است. دکمه ارسال کلیک نخواهد شد.');
      return state;
    }

    this.recordPhase(state, 'SUBMISSION_CLICKED', 'دکمه ارسال آگهی با موفقیت فشرده شد. در انتظار پاسخ پلتفرم...');

    const extracted = this.verificationService.extractAdLinkFromResponse(rawResponse);

    state.submissionResult = {
      submitClicked: clickSucceeded,
      responsePayload: rawResponse,
      rawAdUrl: extracted?.url,
      rawAdId: extracted?.adId
    };

    if (extracted?.url) {
      this.recordPhase(state, 'VERIFICATION_PENDING', `آدرس خام آگهی استخراج گردید: ${extracted.url}. شروع تطبیق نهایی...`);
    } else {
      this.recordPhase(state, 'UNKNOWN', 'پاسخ ارسال دریافت شد اما لینک معتبری استخراج نگردید.');
    }

    return state;
  }

  /**
   * Phase 6: Final Verification against Real Public Ad Page
   */
  public async performFinalVerification(
    state: WorkflowExecutionState,
    publicPageHtml?: string,
    httpStatus: number = 200
  ): Promise<WorkflowExecutionState> {
    const rawUrl = state.submissionResult?.rawAdUrl;
    const rawId = state.submissionResult?.rawAdId;

    const verification = await this.verificationService.verifyAd({
      adUrl: rawUrl,
      adId: rawId,
      expectedTitle: state.campaign.title,
      campaignId: state.campaign.campaignId,
      platformName: state.targetPlatform,
      htmlContent: publicPageHtml,
      pageStatus: httpStatus
    });

    state.verificationResult = verification;

    if (verification.status === 'PUBLISHED') {
      this.recordPhase(state, 'PUBLISHED', 
        `انتشار قطعی با امتیاز ${verification.verificationScore}% احراز شد! لینک عمومی: ${verification.adUrl}`
      );
    } else {
      this.recordPhase(state, verification.status, 
        `وضعیت نهایی ${verification.status} ثبت شد. دلایل: ${verification.evidenceReasons.join(' | ')}`
      );
    }

    return state;
  }
}

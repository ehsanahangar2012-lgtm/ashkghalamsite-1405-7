/**
 * Ashk24 Production Workflow Architecture Types
 * Defines data structures for the End-to-End Ad Publishing & Distribution Workflow
 */

export type WorkerType = 'github_worker' | 'extension_worker' | 'local_worker';

export type TaskStatus = 
  | 'QUEUED' 
  | 'CLAIMED' 
  | 'PENDING_RUNNER_PICKUP' 
  | 'RUNNING' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'BLOCKED';

export type WorkflowPhase = 
  | 'INITIALIZED'
  | 'PLATFORM_NAVIGATED'
  | 'LOGIN_CHECK'
  | 'LOGIN_REQUIRED'
  | 'REGISTRATION_REQUIRED'
  | 'AWAITING_HUMAN_ACTION'
  | 'AUTH_VERIFIED'
  | 'AD_FORM_DISCOVERY'
  | 'FIELD_MAPPING'
  | 'FORM_VALIDATION'
  | 'FORM_FILLED'
  | 'AWAITING_OTP'
  | 'SUBMISSION_PENDING'
  | 'SUBMISSION_CLICKED'
  | 'VERIFICATION_PENDING'
  | 'PUBLISHED'
  | 'UNKNOWN'
  | 'REJECTED'
  | 'FAILED'
  | 'BLOCKED';

export interface WorkflowIdentifiers {
  workflowId: string;
  executionId: string;
  jobId: string;
  actionId: string;
  githubRunId?: string;
  githubRunNumber?: string;
}

export interface WorkerTask<TPayload = any, TResult = any> {
  taskId: string;
  identifiers: WorkflowIdentifiers;
  type: 'ashk24-worker-task' | string;
  targetWorker: WorkerType;
  assignedWorker?: WorkerType;
  status: TaskStatus;
  queuedAt: string;
  claimedAt?: string;
  startedAt?: string;
  completedAt?: string;
  payload: TPayload;
  result?: TResult;
  error?: string;
  evidence: TaskEvidence[];
}

export interface TaskEvidence {
  timestamp: string;
  timestampShamsi: string;
  phase: string;
  description: string;
  metadata?: Record<string, any>;
  snapshotHtml?: string;
  selector?: string;
  httpStatus?: number;
}

export interface CampaignData {
  campaignId: string;
  title: string;
  category: string;
  description: string;
  price: number; // Toman
  priceType: 'fixed' | 'negotiable' | 'quote';
  city: string;
  district?: string;
  contactPhone: string;
  images: string[];
  attributes: Record<string, string | number | boolean>;
}

export interface FormElementDescriptor {
  selector: string;
  tagName: string;
  type?: string;
  name?: string;
  id?: string;
  placeholder?: string;
  ariaLabel?: string;
  labelText?: string;
  isRequired: boolean;
  currentValue?: string;
  options?: { value: string; text: string }[];
}

export interface FormDiscoveryResult {
  formSelector: string;
  isLoginForm: boolean;
  isAdForm: boolean;
  elements: FormElementDescriptor[];
  metrics: {
    totalElements: number;
    inputCount: number;
    textareaCount: number;
    selectCount: number;
    buttonCount: number;
  };
  discoveredAt: string;
}

export interface FieldMappingResult {
  foundFieldsCount: number;
  mappedFieldsCount: number;
  filledFieldsCount: number;
  emptyRequiredFields: string[];
  validationErrors: string[];
  mappings: {
    campaignKey: keyof CampaignData | string;
    targetSelector: string;
    fieldLabel: string;
    assignedValue: any;
    isValid: boolean;
    errorReason?: string;
  }[];
}

export interface AuthStateResult {
  isAuthenticated: boolean;
  currentUserId?: string;
  currentUserName?: string;
  requiresLogin: boolean;
  requiresRegistration: boolean;
  requiresOtp: boolean;
  sessionToken?: string;
  pageUrl: string;
  evidence: TaskEvidence;
}

export interface OtpChallengeState {
  isChallenged: boolean;
  otpInputSelector?: string;
  submitOtpSelector?: string;
  expirySeconds?: number;
  requestedAt?: string;
  submittedAt?: string;
  verifiedAt?: string;
  code?: string;
  status: 'NONE' | 'OTP_REQUESTED' | 'OTP_SUBMITTED' | 'OTP_VERIFIED' | 'EXPIRED' | 'REJECTED';
  evidence: TaskEvidence[];
}

export interface VerificationRequest {
  adUrl?: string;
  adId?: string;
  expectedTitle: string;
  campaignId: string;
  platformName: string;
  htmlContent?: string;
  pageStatus?: number;
}

export interface VerificationResult {
  status: 'PUBLISHED' | 'UNKNOWN' | 'REJECTED' | 'BLOCKED';
  adUrl: string;
  adId?: string;
  titleMatch: boolean;
  adIdMatch: boolean;
  verificationScore: number; // 0 to 100
  evidenceReasons: string[];
  verifiedAt: string;
  verifiedAtShamsi: string;
}

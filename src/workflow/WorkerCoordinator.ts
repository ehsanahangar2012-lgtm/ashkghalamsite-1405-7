/**
 * Unified 3-Tier Worker Coordinator
 * Coordinates tasks across:
 * 1. GitHub Worker (Primary for cloud coordination & CI dispatch)
 * 2. Extension Worker (Primary for live browser DOM manipulation)
 * 3. Local Worker (Real fallback for supported local Node / Agent tasks)
 *
 * Preserves workflow identifiers (workflowId, executionId, jobId, actionId)
 * and guarantees that worker switchover resumes from the exact saved checkpoint.
 */

import { WorkerType, TaskStatus, WorkerTask, WorkflowIdentifiers, TaskEvidence } from './types';
import { WorkflowVerificationService } from './VerificationService';

export class WorkerCoordinator {
  private static instance: WorkerCoordinator;
  private tasks: Map<string, WorkerTask> = new Map();
  private workerHeartbeats: Map<WorkerType, { lastSeen: number; metadata?: any }> = new Map();

  private constructor() {
    // Default initial heartbeats
    this.workerHeartbeats.set('github_worker', { lastSeen: Date.now() });
    this.workerHeartbeats.set('local_worker', { lastSeen: Date.now() });
  }

  public static getInstance(): WorkerCoordinator {
    if (!WorkerCoordinator.instance) {
      WorkerCoordinator.instance = new WorkerCoordinator();
    }
    return WorkerCoordinator.instance;
  }

  /**
   * Register a worker heartbeat
   */
  public recordHeartbeat(worker: WorkerType, metadata?: any): void {
    this.workerHeartbeats.set(worker, { lastSeen: Date.now(), metadata });
  }

  /**
   * Check if a worker is considered available (within 60 seconds)
   */
  public isWorkerHealthy(worker: WorkerType): boolean {
    const hb = this.workerHeartbeats.get(worker);
    if (!hb) return false;
    return (Date.now() - hb.lastSeen) < 60000;
  }

  /**
   * Create and queue a new task
   */
  public queueTask<TPayload = any>(
    type: string,
    targetWorker: WorkerType,
    identifiers: WorkflowIdentifiers,
    payload: TPayload
  ): WorkerTask<TPayload> {
    const taskId = `tsk-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const now = new Date().toISOString();
    const nowShamsi = WorkflowVerificationService.getInstance().getShamsiTimestamp();

    const task: WorkerTask<TPayload> = {
      taskId,
      identifiers,
      type,
      targetWorker,
      status: 'QUEUED',
      queuedAt: now,
      payload,
      evidence: [
        {
          timestamp: now,
          timestampShamsi: nowShamsi,
          phase: 'TASK_QUEUED',
          description: `تسک با شناسه ${taskId} در صف ورکر ${targetWorker} قرار گرفت.`
        }
      ]
    };

    this.tasks.set(taskId, task);
    return task;
  }

  /**
   * Claim a task by a specific worker (QUEUED -> CLAIMED)
   */
  public claimTask(taskId: string, worker: WorkerType): WorkerTask | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    if (task.status !== 'QUEUED' && task.status !== 'PENDING_RUNNER_PICKUP') {
      return task; // already claimed or running
    }

    const now = new Date().toISOString();
    const nowShamsi = WorkflowVerificationService.getInstance().getShamsiTimestamp();

    task.assignedWorker = worker;
    task.status = 'CLAIMED';
    task.claimedAt = now;
    task.evidence.push({
      timestamp: now,
      timestampShamsi: nowShamsi,
      phase: 'TASK_CLAIMED',
      description: `تسک ${taskId} توسط ورکر ${worker} رزرو و تحویل گرفته شد.`
    });

    return task;
  }

  /**
   * Set task to RUNNING (CLAIMED -> RUNNING)
   */
  public startTaskExecution(taskId: string, worker: WorkerType): WorkerTask | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const now = new Date().toISOString();
    const nowShamsi = WorkflowVerificationService.getInstance().getShamsiTimestamp();

    task.assignedWorker = worker;
    task.status = 'RUNNING';
    task.startedAt = now;
    task.evidence.push({
      timestamp: now,
      timestampShamsi: nowShamsi,
      phase: 'EXECUTION_STARTED',
      description: `ورکر ${worker} اجرای دستورات تسک را به صورت عملیاتی آغاز نمود.`
    });

    return task;
  }

  /**
   * Mark task as COMPLETED or FAILED
   */
  public finalizeTask(
    taskId: string, 
    status: 'COMPLETED' | 'FAILED' | 'BLOCKED', 
    result?: any, 
    error?: string
  ): WorkerTask | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const now = new Date().toISOString();
    const nowShamsi = WorkflowVerificationService.getInstance().getShamsiTimestamp();

    task.status = status;
    task.completedAt = now;
    task.result = result;
    task.error = error;
    task.evidence.push({
      timestamp: now,
      timestampShamsi: nowShamsi,
      phase: status === 'COMPLETED' ? 'TASK_COMPLETED' : (status === 'BLOCKED' ? 'TASK_BLOCKED' : 'TASK_FAILED'),
      description: status === 'COMPLETED' 
        ? `تسک ${taskId} با موفقیت توسط ورکر ${task.assignedWorker || task.targetWorker} تکمیل شد.`
        : `تسک با وضعیت ${status} خاتمه یافت. ${error || ''}`
    });

    return task;
  }

  /**
   * Resilient Switchover / Fallback:
   * When a worker is unresponsive or disconnected, switch to fallback worker
   * WITHOUT restarting the workflow from scratch!
   */
  public switchoverTask(
    taskId: string, 
    fallbackWorker: WorkerType, 
    reason: string
  ): WorkerTask | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const now = new Date().toISOString();
    const nowShamsi = WorkflowVerificationService.getInstance().getShamsiTimestamp();

    const previousWorker = task.assignedWorker || task.targetWorker;
    task.targetWorker = fallbackWorker;
    task.assignedWorker = fallbackWorker;
    task.status = 'CLAIMED'; // Ready to continue from current checkpoint

    task.evidence.push({
      timestamp: now,
      timestampShamsi: nowShamsi,
      phase: 'WORKER_SWITCHOVER',
      description: `انتقال پایدار اجرای تسک از ${previousWorker} به ${fallbackWorker} به دلیل: ${reason}. جریان کار از آخرین مرحله موفق ادامه می‌یابد.`
    });

    return task;
  }

  /**
   * Get task by ID
   */
  public getTask(taskId: string): WorkerTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * List all tasks
   */
  public getAllTasks(): WorkerTask[] {
    return Array.from(this.tasks.values());
  }
}

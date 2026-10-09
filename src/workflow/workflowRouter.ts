import { Router } from 'express';
import { WorkerCoordinator } from './WorkerCoordinator';
import { WorkflowEngine } from './WorkflowEngine';
import { WorkflowVerificationService } from './VerificationService';
import { CampaignData } from './types';

const router = Router();
const coordinator = WorkerCoordinator.getInstance();
const verificationService = WorkflowVerificationService.getInstance();
const engine = new WorkflowEngine();

// In-memory active workflows registry
const activeWorkflows = new Map<string, any>();

/**
 * POST /api/workflow/start
 * Start an end-to-end publishing workflow for an industrial campaign
 */
router.post('/start', (req, res) => {
  try {
    const { campaign, platform, preferredWorker } = req.body;
    if (!campaign || !campaign.title) {
      return res.status(400).json({ error: 'campaign object with title is required' });
    }

    const state = engine.initializeWorkflow(
      campaign as CampaignData, 
      platform || 'Divar / B2B Industrial Ads',
      preferredWorker || 'github_worker'
    );

    // Also queue task in coordinator
    const task = coordinator.queueTask(
      'ashk24-worker-task',
      state.activeWorker,
      state.identifiers,
      { campaign: state.campaign, platform: state.targetPlatform }
    );

    state.currentTaskId = task.taskId;
    activeWorkflows.set(state.identifiers.workflowId, state);

    res.json({
      success: true,
      workflowId: state.identifiers.workflowId,
      executionId: state.identifiers.executionId,
      taskId: task.taskId,
      status: state.currentPhase,
      identifiers: state.identifiers
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/workflow/worker-callback
 * Webhook called by GitHub Actions worker, Extension, or Local Agent
 */
router.post('/worker-callback', (req, res) => {
  try {
    const { status, taskId, identifiers, startedAt, completedAt, jobStatus, error } = req.body;

    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    if (status === 'TASK_ACCEPTED') {
      coordinator.claimTask(taskId, 'github_worker');
    } else if (status === 'EXECUTION_STARTED') {
      coordinator.startTaskExecution(taskId, 'github_worker');
    } else if (status === 'TASK_COMPLETED') {
      coordinator.finalizeTask(taskId, 'COMPLETED', { jobStatus, completedAt });
    } else if (status === 'TASK_FAILED') {
      coordinator.finalizeTask(taskId, 'FAILED', { jobStatus }, error || 'Execution failed in runner');
    }

    res.json({ success: true, taskId, receivedStatus: status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/workflow/verify
 * Verification API for backend and local agent
 */
router.post('/verify', async (req, res) => {
  try {
    const { adUrl, adId, expectedTitle, campaignId, platformName, htmlContent, pageStatus } = req.body;

    const result = await verificationService.verifyAd({
      adUrl,
      adId,
      expectedTitle,
      campaignId: campaignId || 'cmp-default',
      platformName: platformName || 'Industrial Portal',
      htmlContent,
      pageStatus: pageStatus || 200
    });

    res.json({ success: true, verification: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/workflow/tasks
 * List queued and running worker tasks
 */
router.get('/tasks', (req, res) => {
  res.json({
    tasks: coordinator.getAllTasks()
  });
});

/**
 * POST /api/workflow/tasks/claim
 * Extension or Local Worker claims a queued task
 */
router.post('/tasks/claim', (req, res) => {
  try {
    const { taskId, workerType } = req.body;
    const task = coordinator.claimTask(taskId, workerType || 'extension_worker');
    if (!task) {
      return res.status(404).json({ error: 'Task not found or unavailable' });
    }
    res.json({ success: true, task });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/workflow/status/:workflowId
 */
router.get('/status/:workflowId', (req, res) => {
  const wf = activeWorkflows.get(req.params.workflowId);
  if (!wf) {
    return res.status(404).json({ error: 'Workflow not found' });
  }
  res.json({ workflow: wf });
});

export default router;

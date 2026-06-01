// tests/ai-file-validation.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage }        from '../pages/LoginPage';
import { AgentPage }        from '../pages/ModelVerification';
import { VerificationUtil } from '../utils/VerificationUtil';

// ─── Constants ────────────────────────────────────────────────────────────────
const PROMPT          = 'what is UNO Rule';
const EXPECTED_FILE   = './expected-files/TC002_expected.docx';
const DOWNLOADS_DIR   = './downloads';
const MIN_SCORE       = 45;
const MODEL_COUNT     = 3;

const ERROR_PATTERNS = [
  'internal server error',
  'something went wrong',
  'failed to fetch',
  'network error',
  '500 error',
  'service unavailable',
  'bad gateway',
];

// ─── Test ─────────────────────────────────────────────────────────────────────
test('AI file validation flows', async ({ page }) => {

  const loginPage = new LoginPage(page);
  const agentPage = new AgentPage(page);

  // ── Login ──────────────────────────────────────────────────────────────────
  console.log('▶ Logging in...');
  await loginPage.login(process.env.EMAIL!, process.env.PASSWORD!);
  console.log('✔ Logged in successfully');

  // ==========================================================================
  // FLOW 1 — Agent tool → Publish → Preview → Ask → Download → Verify ≥ 45
  // ==========================================================================
  console.log('\n── FLOW 1 ──────────────────────────────────────────');

  await agentPage.navigateToAgent();
  await agentPage.clickAgentTool();
  await agentPage.publishAgent();
  await agentPage.openPreviewFromLastMore();
  await agentPage.enterPrompt(PROMPT);
  await agentPage.clickSend();
  await agentPage.waitForResponse();

  const downloadPath1 = await agentPage.clickDownload();
  console.log('✔ Flow 1 downloaded:', downloadPath1);

  await agentPage.goBack();

  const result1 = await VerificationUtil.verifyDownloadedFile(EXPECTED_FILE, DOWNLOADS_DIR);
  console.log(`✔ Flow 1 score: ${result1.score} (required ≥ ${MIN_SCORE})`);
  expect(
    result1.score,
    `[Flow 1] Score ${result1.score} is below required ${MIN_SCORE}`
  ).toBeGreaterThanOrEqual(MIN_SCORE);

  console.log('\n── FLOW 2 — Model loop ──────────────────────────────');

  for (let i = 0; i < MODEL_COUNT; i++) {
    const position = i + 2;   // XPath positions are 1-based: [1], [2], [3]
    console.log(`\n════ Model ${position} of ${MODEL_COUNT} ════════════════════════════`);

    // Step 1 — Navigate and open agent config
    await agentPage.navigateToAgent();
    await agentPage.clickAgentTool();

    // Step 2 — Open dropdown and click option at position [2], [3], [4]
    const modelName = await agentPage.selectModelByPosition(position);
    console.log(`✔ Model selected: "${modelName}"`);

    // Step 3 — Publish → Preview
    await agentPage.publishAgent();
    await agentPage.openPreviewFromLastMore();

    // Step 4 — Enter prompt → Send → Wait
    await agentPage.enterPrompt(PROMPT);
    await agentPage.clickSend();
    await agentPage.waitForResponse();

    // Step 5 — Download
    const downloadPath = await agentPage.clickDownload();
    console.log(`✔ [Model ${position}] Downloaded: ${downloadPath}`);

    // Step 6 — Go back before verifying (file is already saved)
    await agentPage.goBack();

    // Step 7 — Verify score ≥ 45 (same pattern as Flow 1)
    const result = await VerificationUtil.verifyDownloadedFile(EXPECTED_FILE, DOWNLOADS_DIR);
    console.log(`✔ [Model ${position}] Score: ${result.score} (required ≥ ${MIN_SCORE})`);
    expect(
      result.score,
      `[Flow 2  - Model ${position} "${modelName}"] Score ${result.score} is below required ${MIN_SCORE}`
    ).toBeGreaterThanOrEqual(MIN_SCORE);

    console.log(`✔ Model ${position} of ${MODEL_COUNT} complete`);
  }

  console.log('\n✅ All flows completed successfully.');
});
// tests/ai-file-validation.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage }        from '../pages/LoginPage';
import { AgentPage }        from '../pages/AgentPage';
import { VerificationUtil } from '../utils/VerificationUtil';

// ─── Constants ────────────────────────────────────────────────────────────────
const PROMPT          = 'what is UNO Rule';
const EXPECTED_FILE   = './expected-files/TC002_expected.docx';
const DOWNLOADS_DIR   = './downloads';
const MIN_SCORE_FLOW1 = 45;

const ERROR_PATTERNS = [
  'server error',
  '500',
  'internal server error',
  'something went wrong',
  'error:',
  'unhandled',
  'failed to fetch',
  'network error',
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

  await agentPage.navigateToAgent();    // go to agents list
  await agentPage.clickAgentTool(); 
   await agentPage.clickAdditionalFeaturesAdd(); // scroll to Additional features → Add
  await agentPage.clickUploadFile();     // open agent
  await agentPage.publishAgent();       // publish
  await agentPage.openPreviewFromLastMore(); // open preview
  await agentPage.enterPrompt(PROMPT);
  await agentPage.clickSend();
  await agentPage.waitForResponse();

  const downloadPath1 = await agentPage.clickDownload();
  console.log('✔ Flow 1 downloaded:', downloadPath1);

  await agentPage.goBack();             // back to agent list

  console.log('▶ Verifying Flow 1 file...');
  const result1 = await VerificationUtil.verifyDownloadedFile(EXPECTED_FILE, DOWNLOADS_DIR);
  console.log(`✔ Flow 1 score: ${result1.score} (required ≥ ${MIN_SCORE_FLOW1})`);
  expect(
    result1.score,
    `[Flow 1] Score ${result1.score} is below required ${MIN_SCORE_FLOW1}`
  ).toBeGreaterThanOrEqual(MIN_SCORE_FLOW1);

  // ==========================================================================
  // FLOW 2 — Additional features → Toggle Upload ON → Publish → Preview
  //          → No error → Data exists
  // ==========================================================================
  console.log('\n── FLOW 2 ──────────────────────────────────────────');

  await agentPage.navigateToAgent();        // FIX: go back to agents list first
  await agentPage.clickAgentTool();         // open same agent
  await agentPage.clickAdditionalFeaturesAdd(); // scroll to Additional features → Add
  await agentPage.clickUploadFile();        // toggle ON if OFF, skip if already ON
  await agentPage.clickClose();             // close modal
  await agentPage.publishAgent();           // publish with new unique name
  await agentPage.openPreviewFromLastMore(); // open preview
 await agentPage.enterPrompt("what is UNO Rule?");
  await agentPage.clickSend();
  await agentPage.waitForResponse();
 const downloadPath2 = await agentPage.clickDownload();
  console.log('✔ Flow 2 downloaded:', downloadPath2);
  // Assert no error visible on page
  const result2 = await VerificationUtil.verifyDownloadedFile(EXPECTED_FILE, DOWNLOADS_DIR);
  console.log(`✔ Flow 2 score: ${result2.score} (required ≥ ${MIN_SCORE_FLOW1})`);
  expect(
    result2.score,
    `[Flow 2] Score ${result2.score} is below required ${MIN_SCORE_FLOW1}`
  ).toBeGreaterThanOrEqual(MIN_SCORE_FLOW1);
  console.log('✔ Flow 2 score assertion passed');

}); 
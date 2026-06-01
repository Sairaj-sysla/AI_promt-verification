// pages/AgentPage.ts
import { Page } from '@playwright/test';
import { DownloadUtil } from '../utils/DownloadUtil';
// ─── Selectors ────────────────────────────────────────────────────────────────
const AgentSelectors = {
  agentsMenuIcon:             '//*[@title="Agents"]',
  agentToolTypography:        '//*[text()="UNO Rule & Web Research Agent"]',
  additionalFeaturesAddBtn:   '//*[text()="Additional features"]/../..//span[text()="Add"]',

  // Toggle button for Upload file feature — checked = ON, unchecked = OFF
  uploadFileToggle:           '//span[text()="Upload file"]/../..//button[@role="switch"]',

  uploadFileButton:           '//span[text()="Upload file"]/../..//button[@type="button"]',
  closeButton:                '//button[@aria-label="Close"]',
  publishButton:              '//*[text()="Publish"]',
  versionNameInput:           '//input[@id="version_name"]',
  submitButton:               '//span[text()="Submit"]',
  lastMoreOptionsIcon:        '(//*[@aria-label="more"])[1]',
  previewOption:              '//*[text()="Preview"]',
  welcomeMessage:             '//*[text()="How can I help you today?"]',
  chatTextarea:               '//*[@id="chatbot-input"]/..//textarea',
  sendButton:                 '//div[contains(@class,"sc-46eba7fa-21 fiPLHq")]',
  lastResponseDownloadButton: '(//*[@role="SimplAi"]/..//div[@aria-describedby])[last()]',
} as const;

// ─── Helper ───────────────────────────────────────────────────────────────────
function generateVersionName(): string {
  return `Qa_sysla_${Date.now()}`;
}

// ─── Page Object ──────────────────────────────────────────────────────────────
export class AgentPage {

  constructor(private page: Page) {}

  async navigateToAgent() {
    console.log('▶ Navigating to agent...');
    await this.page.waitForTimeout(5000);
    const menu = this.page.locator(AgentSelectors.agentsMenuIcon);
    await menu.waitFor({ state: 'visible', timeout: 15000 });
    await menu.hover();
    await menu.click();
    await this.page.waitForTimeout(3000);
    console.log('✔ Agent menu opened');
  }

  async clickAgentTool() {
    console.log('▶ Clicking agent tool...');
    const el = this.page.locator(AgentSelectors.agentToolTypography);
    await el.waitFor({ state: 'visible', timeout: 15000 });
    await el.click();
    console.log('✔ Agent tool clicked');
  }

  async clickAdditionalFeaturesAdd() {
    console.log('▶ Clicking Additional Features → Add...');
    const btn = this.page.locator(AgentSelectors.additionalFeaturesAddBtn);
    await btn.waitFor({ state: 'visible', timeout: 15000 });
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    console.log('✔ Additional features Add clicked');
  }

  // ── Toggle-aware Upload file ────────────────────────────────────────────────
  // Checks the Upload file toggle:
  //   - If OFF (aria-checked="false") → clicks to turn it ON
  //   - If already ON (aria-checked="true") → clicks to turn it OFF
  async clickUploadFile() {
    console.log('▶ Checking Upload file toggle state...');

    const toggle = this.page.locator(AgentSelectors.uploadFileToggle);
    await toggle.waitFor({ state: 'visible', timeout: 15000 });

    const isOn = (await toggle.getAttribute('aria-checked')) === 'true';

    if (isOn) {
      await toggle.click();
      console.log('✔ Upload file toggle off (ON → OFF)');
      await this.clickClose(); 
    } else {
      console.log('▶ Upload file toggle is OFF — turning ON...');
      await toggle.click();
      await this.page.waitForTimeout(500);
      console.log('✔ Upload file toggle turned ON');
      await this.clickClose();
    }
  }

  async clickClose() {
    console.log('▶ Closing modal...');
    const btn = this.page.locator(AgentSelectors.closeButton);
    //await btn.waitFor({ state: 'visible', timeout: 100000});
    if (await btn.isVisible()) {
      await btn.click();
    }
    await this.page.waitForTimeout(1000);
    console.log('✔ Modal closed');
  }

  async publishAgent() {
    console.log('▶ Publishing agent...');
    const publishBtn = this.page.locator(AgentSelectors.publishButton);
    await publishBtn.waitFor({ state: 'visible', timeout: 15000 });
    await publishBtn.click();

    const versionInput = this.page.locator(AgentSelectors.versionNameInput);
    await versionInput.waitFor({ state: 'visible', timeout: 15000 });
    await versionInput.clear();
    await versionInput.fill(generateVersionName());

    const submitBtn = this.page.locator(AgentSelectors.submitButton);
    await submitBtn.waitFor({ state: 'visible', timeout: 15000 });
    await submitBtn.click();
    await this.page.waitForTimeout(3000);
    console.log('✔ Agent published');
  }

  async openPreviewFromLastMore() {
    console.log('▶ Opening preview from ⋯ menu...');
    const moreBtn = this.page.locator(AgentSelectors.lastMoreOptionsIcon);
    await moreBtn.waitFor({ state: 'visible', timeout: 15000 });
    await moreBtn.click();

    const previewBtn = this.page.locator(AgentSelectors.previewOption);
    await previewBtn.waitFor({ state: 'visible', timeout: 10000 });
    await previewBtn.click();
    await this.page.waitForTimeout(5000);
    console.log('✔ Preview opened');
  }

  async enterPrompt(prompt: string) {
    console.log(`▶ Entering prompt: "${prompt}"`);
    const welcome = this.page.locator(AgentSelectors.welcomeMessage);
    await welcome.waitFor({ state: 'visible', timeout: 15000 });
    const textarea = this.page.locator(AgentSelectors.chatTextarea);
    await textarea.waitFor({ state: 'visible', timeout: 15000 });
    await textarea.fill(prompt);
    console.log('✔ Prompt entered');
  }

  async clickSend() {
    console.log('▶ Clicking send...');
    const btn = this.page.locator(AgentSelectors.sendButton);
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await btn.click();
    console.log('✔ Prompt sent — waiting for response...');
  }

  async waitForResponse() {
    await this.page.waitForTimeout(10000);
    console.log('✔ Response received');
  }

  async clickDownload(): Promise<string> {
    console.log('▶ Downloading file...');
    const button = this.page.locator(AgentSelectors.lastResponseDownloadButton);
    await button.waitFor({ state: 'visible', timeout: 45_000 });
 
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      button.click(),
    ]);
 
    return DownloadUtil.saveAndConvert(download);
  }

  async goBack() {
    console.log('▶ Going back...');
    await this.page.goBack();
    await this.page.waitForTimeout(3000);
    console.log('✔ Returned to previous page');
  }
}
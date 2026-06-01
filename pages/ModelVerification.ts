// pages/AgentPage.ts
import { Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { Document, Packer, Paragraph, TextRun } from 'docx';

// ─── Selectors ────────────────────────────────────────────────────────────────
const AgentSelectors = {
  agentsMenuIcon:             '//*[@title="Agents"]',
  agentToolTypography:        '//*[text()="UNO Rule & Web Research Agent"]',
  additionalFeaturesAddBtn:   '//*[text()="Additional features"]/../..//span[text()="Add"]',
  uploadFileToggle:           '//span[text()="Upload file"]/../..//button[@role="switch"]',
  closeButton:                '//button[@aria-label="Close"]',
  publishButton:              '//*[text()="Publish"]',
  versionNameInput:           '//input[@id="version_name"]',
  submitButton:               '//span[text()="Submit"]',
  lastMoreOptionsIcon:        '(//*[@data-icon="more"])[1]',
  previewOption:              '//*[text()="Preview"]',
  welcomeMessage:             '//*[text()="How can I help you today?"]',
  chatTextarea:               '//*[@id="chatbot-input"]/..//textarea',
  sendButton:                 '//div[contains(@class,"sc-46eba7fa-21 fiPLHq")]',
  lastResponseDownloadButton: '(//*[@role="SimplAi"]/..//div[@aria-describedby])[last()]',

  // Model dropdown
  modelDropdown:     '//input[@id="model_detail_model_name"]/../../..',
  modelSelectedItem: '//input[@id="model_detail_model_name"]/../..//span[contains(@class,"ant-select-selection-item")]',
} as const;

// ─── Helper ───────────────────────────────────────────────────────────────────
function generateVersionName(): string {
  return `Qa_sysla_${Date.now()}`;
}

// Returns XPath for nth option (1-based) e.g. position 1, 2, 3
function modelOptionByPosition(position: number): string {
  return `(//div[contains(@class,"ant-select-item ant-select-item-option")])[${position}]`;
}

// ─── Page Object ──────────────────────────────────────────────────────────────
export class AgentPage {

  constructor(private page: Page) {}

  async navigateToAgent() {
    console.log('▶ Navigating to agent...');
    //await this.page.waitForTimeout(5000);
    const menu = this.page.locator(AgentSelectors.agentsMenuIcon);
    await menu.waitFor({ state: 'visible', timeout: 15000 });
    await menu.hover();
    await menu.click();
    //await this.page.waitForTimeout(3000);
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

  async clickUploadFile() {
    console.log('▶ Checking Upload file toggle state...');
    const toggle = this.page.locator(AgentSelectors.uploadFileToggle);
    await toggle.waitFor({ state: 'visible', timeout: 15000 });
    const isOn = (await toggle.getAttribute('aria-checked')) === 'true';
    if (isOn) {
      console.log('✔ Upload file toggle already ON — skipping');
    } else {
      console.log('▶ Upload file toggle is OFF — turning ON...');
      await toggle.click();
      await this.page.waitForTimeout(500);
      console.log('✔ Upload file toggle turned ON');
    }
  }

  async clickClose() {
    console.log('▶ Closing modal...');
    const btn = this.page.locator(AgentSelectors.closeButton);
    await btn.waitFor({ state: 'visible', timeout: 10000 });

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

  // ── Open dropdown and click option at position (1-based) ───────────────────
  async selectModelByPosition(position: number): Promise<string> {
    console.log(`▶ Opening model dropdown (position ${position})...`);

    // Open dropdown
    const dropdown = this.page.locator(AgentSelectors.modelDropdown);
    await dropdown.waitFor({ state: 'visible', timeout: 15000 });
    await dropdown.click();
    await this.page.waitForTimeout(500);

    // Click the nth option using positional XPath e.g. [1], [2], [3]
    const option = this.page.locator(modelOptionByPosition(position));
    await option.waitFor({ state: 'visible', timeout: 10000 });

    const modelName = (await option.innerText()).trim();
    console.log(`▶ Selecting position ${position}: "${modelName}"`);
    await option.click();
    await this.page.waitForTimeout(1000);

    // Confirm from selected item title
    const selectedItem  = this.page.locator(AgentSelectors.modelSelectedItem);
    const confirmedName = (
      await selectedItem.getAttribute('title') ??
      await selectedItem.innerText()
    ).trim();
    console.log(`✔ Confirmed selected: "${confirmedName}"`);

    return confirmedName;
  }

  async clickDownload(): Promise<string> {
    console.log('▶ Downloading file...');
    const button = this.page.locator(AgentSelectors.lastResponseDownloadButton);
    await button.waitFor({ state: 'visible', timeout: 45000 });
    await fs.promises.mkdir('./downloads', { recursive: true });

    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      button.click(),
    ]);

    const suggested = download.suggestedFilename();
    const savePath  = path.join('./downloads', `${Date.now()}-${suggested}`);

    try {
      await download.saveAs(savePath);
    } catch (error: any) {
      if (error?.code === 'EBUSY') {
        await this.page.waitForTimeout(200);
        await download.saveAs(savePath);
      } else {
        throw error;
      }
    }

    const ext = path.extname(suggested).toLowerCase();
    if (ext !== '.docx') {
      try {
        const content  = fs.readFileSync(savePath, 'utf8');
        const doc = new Document({
          sections: [{
            properties: {},
            children: [new Paragraph({ children: [new TextRun(content)] })],
          }],
        });
        const buffer    = await Packer.toBuffer(doc);
        const finalPath = path.join('./downloads', `${path.basename(suggested, ext)}.docx`);
        fs.writeFileSync(finalPath, buffer);
        try { fs.unlinkSync(savePath); } catch (_) {}
        console.log('✔ File downloaded and converted:', finalPath);
        return finalPath;
      } catch (_) {
        console.log('✔ File downloaded (conversion skipped):', savePath);
        return savePath;
      }
    }

    console.log('✔ File downloaded:', savePath);
    return savePath;
  }

  async goBack() {
    console.log('▶ Going back...');
    await this.page.goBack();
    await this.page.waitForTimeout(3000);
    console.log('✔ Returned to previous page');
  }
}
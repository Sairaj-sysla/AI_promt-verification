import { Page } from '@playwright/test';

const LoginSelectors = {
  emailInput:     '//input[@id="UserCheck_email"]',
  emailSubmit:    '//button[@type="submit"]',
  passwordInput:  '//input[@id="SignIn_password"]',
  passwordSubmit: '//button[@type="submit"]',
} as const;

export class LoginPage {
  constructor(private page: Page) {}

  async login(email: string, password: string) {
    console.log('▶ Starting login step 1: email');
    await this.page.goto(process.env.BASE_URL!);
    await this.page.waitForLoadState('networkidle', { timeout: 30000 });

    const emailInput = this.page.locator(LoginSelectors.emailInput);
    await emailInput.waitFor({ state: 'visible', timeout: 15000 });
    await emailInput.click();
    await emailInput.pressSequentially(email, { delay: 150 });
    console.log('✔ Email entered');

    const emailSubmit = this.page.locator(LoginSelectors.emailSubmit);
    await emailSubmit.waitFor({ state: 'visible', timeout: 15000 });
    await Promise.all([
      this.page.waitForLoadState('networkidle', { timeout: 30000 }),
      emailSubmit.click(),
    ]);
    console.log('✔ Email step submitted');

    console.log('▶ Starting login step 2: password');
    const passwordInput = this.page.locator(LoginSelectors.passwordInput);
    await passwordInput.waitFor({ state: 'visible', timeout: 15000 });
    await passwordInput.click();
    await passwordInput.pressSequentially(password, { delay: 150 });
    console.log('✔ Password entered');

    const passwordSubmit = this.page.locator(LoginSelectors.passwordSubmit);
    await passwordSubmit.waitFor({ state: 'visible', timeout: 15000 });
    await Promise.all([
      this.page.waitForLoadState('networkidle', { timeout: 30000 }),
      passwordSubmit.click(),
    ]);
    console.log('✔ Login successful');
  }
}
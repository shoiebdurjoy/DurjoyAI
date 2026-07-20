import { IEmailProvider } from './email.interface';
import { MockEmailProvider } from './mock-email.provider';
import { EmailMessage } from '../productivity.interface';

export class EmailService {
  constructor(private provider: IEmailProvider = new MockEmailProvider()) {}

  public async getUnreadEmails(): Promise<EmailMessage[]> {
    const inbox = await this.provider.getEmails('inbox');
    return inbox.filter((m) => !m.read);
  }

  public async getImportantEmails(): Promise<EmailMessage[]> {
    const inbox = await this.provider.getEmails('inbox');
    return inbox.filter((m) => m.important);
  }

  public async searchEmails(query: string): Promise<EmailMessage[]> {
    return this.provider.searchEmails(query);
  }

  public async sendEmail(
    to: string,
    subject: string,
    body: string,
  ): Promise<{ success: boolean; messageId?: string }> {
    return this.provider.sendEmail(to, subject, body);
  }

  public async draftReply(
    emailId: string,
    replyText: string,
  ): Promise<{ draftId: string; to: string; subject: string; body: string }> {
    const inbox = await this.provider.getEmails('inbox');
    const original = inbox.find((m) => m.id === emailId);

    const to = original ? original.from : 'recipient@example.com';
    const subject = original ? `Re: ${original.subject}` : 'Reply Draft';

    return {
      draftId: `draft_${Date.now()}`,
      to,
      subject,
      body: replyText,
    };
  }

  /**
   * Generates a natural conversational summary of the inbox.
   */
  public async summarizeInbox(): Promise<string> {
    const unread = await this.getUnreadEmails();
    if (unread.length === 0) {
      return 'You have no unread emails in your inbox right now.';
    }

    const bullets = unread.map((m) => `- From ${m.from.split('@')[0]}: "${m.subject}"`).join('\n');

    return `You have ${unread.length} new unread email(s):\n${bullets}`;
  }
}

export const emailService = new EmailService();

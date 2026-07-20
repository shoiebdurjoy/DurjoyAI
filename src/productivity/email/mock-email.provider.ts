import { IEmailProvider } from './email.interface';
import { EmailMessage } from '../productivity.interface';
import {
  sqliteProductivityRepository,
  SQLiteProductivityRepository,
} from '../sqlite-productivity.repository';

export class MockEmailProvider implements IEmailProvider {
  public readonly name = 'mock_email';

  constructor(private readonly repo: SQLiteProductivityRepository = sqliteProductivityRepository) {
    this.seedMockEmailsSync();
  }

  private seedMockEmailsSync(): void {
    const seed: EmailMessage[] = [
      {
        id: 'msg_uni_01',
        from: 'registrar@bracu.ac.bd',
        to: 'durjoy@bracu.ac.bd',
        subject: 'Final Exam Schedule Announcement',
        body: 'Dear Student, The final exam schedule for Fall semester is now published on the student portal.',
        folder: 'inbox',
        read: false,
        important: true,
        date: new Date(Date.now() - 3600000 * 2),
      },
      {
        id: 'msg_gh_02',
        from: 'notifications@github.com',
        to: 'durjoy@github.com',
        subject: 'Security Alert: Dependency update available',
        body: 'A security patch is available for your repository DurjoyAI. Please review the pull request.',
        folder: 'inbox',
        read: false,
        important: true,
        date: new Date(Date.now() - 3600000 * 5),
      },
      {
        id: 'msg_rec_03',
        from: 'receipts@store.com',
        to: 'durjoy@personal.com',
        subject: 'Your Order Receipt #9842',
        body: 'Thank you for your purchase of RTX 5070 GPU. Your total was $599.00.',
        folder: 'inbox',
        read: false,
        important: false,
        date: new Date(Date.now() - 3600000 * 12),
      },
    ];

    seed.forEach((msg) => {
      this.repo.saveEmail(msg).catch(() => {});
    });
  }

  public async getEmails(folder = 'inbox'): Promise<EmailMessage[]> {
    return this.repo.getEmails(folder);
  }

  public async searchEmails(query: string): Promise<EmailMessage[]> {
    const all = await this.repo.getEmails('inbox');
    const q = query.toLowerCase();
    return all.filter(
      (m) =>
        m.subject.toLowerCase().includes(q) ||
        m.body.toLowerCase().includes(q) ||
        m.from.toLowerCase().includes(q),
    );
  }

  public async sendEmail(
    to: string,
    subject: string,
    body: string,
  ): Promise<{ success: boolean; messageId?: string }> {
    const id = `msg_${Date.now()}_sent`;
    const sentMsg: EmailMessage = {
      id,
      from: 'me@durjoy.ai',
      to,
      subject,
      body,
      folder: 'sent',
      read: true,
      important: false,
      date: new Date(),
    };
    await this.repo.saveEmail(sentMsg);
    return { success: true, messageId: id };
  }

  public async markRead(id: string, read: boolean): Promise<boolean> {
    const all = await this.repo.getEmails('inbox');
    const found = all.find((m) => m.id === id);
    if (!found) return false;
    found.read = read;
    await this.repo.saveEmail(found);
    return true;
  }

  public async moveToFolder(id: string, folder: string): Promise<boolean> {
    const all = await this.repo.getEmails('inbox');
    const found = all.find((m) => m.id === id);
    if (!found) return false;
    found.folder = folder;
    await this.repo.saveEmail(found);
    return true;
  }
}

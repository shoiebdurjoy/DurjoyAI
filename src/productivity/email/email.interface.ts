import { EmailMessage } from '../productivity.interface';

export interface IEmailProvider {
  name: string;
  getEmails(folder?: string): Promise<EmailMessage[]>;
  searchEmails(query: string): Promise<EmailMessage[]>;
  sendEmail(
    to: string,
    subject: string,
    body: string,
  ): Promise<{ success: boolean; messageId?: string }>;
  markRead(id: string, read: boolean): Promise<boolean>;
  moveToFolder(id: string, folder: string): Promise<boolean>;
}

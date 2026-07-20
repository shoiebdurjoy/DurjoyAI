import { ToolDefinition } from '../../tools/tool.interface';
import { productivityManager } from '../productivity.manager';

export const emailTool: ToolDefinition = {
  id: 'email_tool',
  name: 'Email Assistant',
  description: 'Summarizes inbox, searches emails, drafts replies, or sends emails.',
  parameters: {
    action: {
      type: 'string',
      description: 'Action: summarize, list_unread, search, send, draft_reply',
      required: true,
    },
  },
  permissionLevel: 'SAFE',
  enabled: true,
  async execute(args) {
    const action = (args?.action || 'summarize').toLowerCase();

    if (action === 'send') {
      const sent = await productivityManager.email.sendEmail(
        args.to || 'recipient@example.com',
        args.subject || 'No Subject',
        args.body || '',
      );
      return { action: 'sent', result: sent };
    }

    if (action === 'draft_reply') {
      const draft = await productivityManager.email.draftReply(
        args.emailId,
        args.replyText || 'Thank you.',
      );
      return { action: 'drafted', draft };
    }

    if (action === 'search' && args?.query) {
      const results = await productivityManager.email.searchEmails(args.query);
      return { action: 'search', results };
    }

    const summary = await productivityManager.email.summarizeInbox();
    const unread = await productivityManager.email.getUnreadEmails();
    return { action: 'summarize', summary, unreadCount: unread.length };
  },
};

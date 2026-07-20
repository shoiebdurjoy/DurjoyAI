export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'completed';

export interface ReminderRecord {
  id: string;
  title: string;
  description?: string;
  datetime: Date;
  recurrence: RecurrenceType;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskRecord {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: Date;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendarEventRecord {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  reminders?: string[];
  attendees?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  folder: string;
  read: boolean;
  important: boolean;
  date: Date;
}

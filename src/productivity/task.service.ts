import { TaskRecord, TaskPriority, TaskStatus } from './productivity.interface';
import {
  sqliteProductivityRepository,
  SQLiteProductivityRepository,
} from './sqlite-productivity.repository';

export class TaskService {
  constructor(private readonly repo: SQLiteProductivityRepository = sqliteProductivityRepository) {}

  public async createTask(
    title: string,
    priority: TaskPriority = 'medium',
    dueDate?: Date,
    description?: string,
  ): Promise<TaskRecord> {
    return this.repo.saveTask({
      title: title.trim(),
      priority,
      dueDate,
      description: description?.trim(),
      status: 'pending',
    });
  }

  public async completeTask(id: string): Promise<TaskRecord | null> {
    const existing = await this.repo.getTaskById(id);
    if (!existing) return null;
    return this.repo.saveTask({
      ...existing,
      status: 'completed',
    });
  }

  public async getTasks(status?: TaskStatus): Promise<TaskRecord[]> {
    return this.repo.getTasks(status);
  }

  public async deleteTask(id: string): Promise<boolean> {
    return this.repo.deleteTask(id);
  }

  public async updateTask(id: string, updates: Partial<TaskRecord>): Promise<TaskRecord | null> {
    const existing = await this.repo.getTaskById(id);
    if (!existing) return null;
    return this.repo.saveTask({
      ...existing,
      ...updates,
    });
  }
}

export const taskService = new TaskService();

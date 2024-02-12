import { Message, DataStreamWriter, generateObject, LanguageModel } from 'ai';
import { z } from 'zod';

import { Agent } from './agent.js';

const taskSchema = z.object({
  reasoning: z.string(),
  tasks: z.array(
    z.object({
      agent: z.enum(['analyst', 'insight', 'recommender']),
      priority: z.number().min(1).max(3),
      description: z.string(),
      dependencies: z.array(z.string()).optional(),
    })
  ),
});

type Task = z.infer<typeof taskSchema>['tasks'][0];

export class OrchestratorFlow {
  constructor(
    private readonly history: Message[],
    private readonly dataStream: DataStreamWriter,
    private readonly onFinish: (response: { messages: Message[] }) => Promise<void>,
    private readonly agents: Record<string, Agent>,
    private readonly model: LanguageModel
  ) {}

  public async run(prompt: string) {
    try {
      // Step 1: Orchestrator analyzes the input and plans the tasks
      const { object: taskPlan } = await generateObject({
        model: this.model,
        schema: taskSchema,
        prompt,
      });
      // Step 2: Execute tasks in order of priority and dependencies
      const results: Record<string, { messages: Message[] }> = {};
      const executedTasks = new Set<string>();

      // Helper function to check if dependencies are met
      const canExecuteTask = (task: Task) => {
        console.log('Task', task);
        if (!task.dependencies) return true;

        // Check if all dependent tasks have been completed
        return task.dependencies.every((depDescription: string) => {
          const depTask = taskPlan.tasks.find((t) => t.description === depDescription);
          return depTask && executedTasks.has(depTask.agent);
        });
      };

      // Execute tasks in priority order
      for (let priority = 1; priority <= 3; priority++) {
        const tasksAtPriority = taskPlan.tasks.filter((t) => t.priority === priority);

        for (const task of tasksAtPriority) {
          console.log('can execute', task.agent, canExecuteTask(task));
          if (canExecuteTask(task)) {
            const agent = this.agents[task.agent];
            if (!agent) continue;

            // Prepare context for the task
            const context = this.prepareTaskContext(task, results, taskPlan.tasks);

            // Execute the task
            const result = await this.runAgent(agent, context);
            console.log('Result', result);
            results[task.agent] = result;
            executedTasks.add(task.agent);
          }
        }
      }

      // Combine all results
      const finalMessages = Object.values(results).flatMap((r) => r.messages);
      await this.onFinish({ messages: finalMessages });

      return {
        taskPlan,
        results,
      };
    } catch (error) {
      console.error('Error in orchestrator flow:', error);
      throw new Error('Failed to complete orchestrator processing');
    }
  }

  private prepareTaskContext(
    task: Task,
    results: Record<string, { messages: Message[] }>,
    allTasks: Task[]
  ): Message[] {
    const context: Message[] = [...this.history];

    // Add results from dependent tasks
    if (task.dependencies) {
      for (const depDescription of task.dependencies) {
        const depTask = allTasks.find((t) => t.description === depDescription);
        if (depTask && results[depTask.agent]) {
          context.push(...this.convertToMessages(results[depTask.agent].messages));
        }
      }
    }

    // Add task description as system message
    context.push({
      id: `task-${task.agent}`,
      role: 'system',
      content: `Task: ${task.description}`,
    });

    return context;
  }

  private convertToMessages(aiMessages: Message[]): Message[] {
    return aiMessages.map((msg) => ({
      id: msg.id,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      role: msg.role as 'user' | 'assistant' | 'system',
    }));
  }

  private async runAgent(agent: Agent, messages: Message[]): Promise<{ messages: Message[] }> {
    return new Promise((resolve, reject) => {
      const agentMessages: Message[] = [];

      agent
        .run(messages, this.dataStream, async (response) => {
          agentMessages.push(...response.messages);
          resolve(response);
        })
        .catch(reject);
    });
  }
}

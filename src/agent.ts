import { openai } from '@ai-sdk/openai';

export class Agent {
  constructor(private readonly model: OpenAI) {}

  async run(input: string) {
    const response = await this.model.chat.completions.create({
      messages: [{ role: 'user', content: input }],
    });

    return response.choices[0].message.content;
  }
}

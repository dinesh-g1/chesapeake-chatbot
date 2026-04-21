import axios from "axios";
import {
  LLMProvider,
  LLMResponse,
  ChatMessage,
  LLMGenerateOptions,
} from "../../types";

export class DeepSeekLLMProvider implements LLMProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly defaultOptions: LLMGenerateOptions;

  constructor(config: any) {
    this.apiKey = config.apiKey || "";
    this.baseUrl = config.baseUrl || "https://api.deepseek.com";
    this.model = config.model || "deepseek-chat";

    if (!this.apiKey) {
      throw new Error("DeepSeek API key is required");
    }

    this.defaultOptions = {
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 1000,
      topP: config.topP || 1,
      frequencyPenalty: config.frequencyPenalty || 0,
      presencePenalty: config.presencePenalty || 0,
      stopSequences: config.stopSequences,
      systemPrompt: config.systemPrompt,
    };
  }

  async generateCompletion(
    messages: ChatMessage[],
    options?: LLMGenerateOptions,
  ): Promise<LLMResponse> {
    const finalOptions = { ...this.defaultOptions, ...options };

    // Format messages for DeepSeek API
    const formattedMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Add system prompt if provided
    if (finalOptions.systemPrompt) {
      formattedMessages.unshift({
        role: "system",
        content: finalOptions.systemPrompt,
      });
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: formattedMessages,
          temperature: finalOptions.temperature,
          max_tokens: finalOptions.maxTokens,
          top_p: finalOptions.topP,
          frequency_penalty: finalOptions.frequencyPenalty,
          presence_penalty: finalOptions.presencePenalty,
          stop: finalOptions.stopSequences,
          stream: false,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30000, // 30 second timeout
        },
      );

      const data = response.data;

      return {
        content: data.choices[0]?.message?.content || "",
        model: data.model || this.model,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens || 0,
              completionTokens: data.usage.completion_tokens || 0,
              totalTokens: data.usage.total_tokens || 0,
            }
          : undefined,
        finishReason: data.choices[0]?.finish_reason,
      };
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `DeepSeek API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
        );
      } else if (error.request) {
        throw new Error("DeepSeek API request failed - no response received");
      } else {
        throw new Error(`DeepSeek API error: ${error.message}`);
      }
    }
  }

  async *generateStreamingCompletion(
    messages: ChatMessage[],
    options?: LLMGenerateOptions,
  ): AsyncIterable<string> {
    const finalOptions = { ...this.defaultOptions, ...options };

    // Format messages for DeepSeek API
    const formattedMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Add system prompt if provided
    if (finalOptions.systemPrompt) {
      formattedMessages.unshift({
        role: "system",
        content: finalOptions.systemPrompt,
      });
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: formattedMessages,
          temperature: finalOptions.temperature,
          max_tokens: finalOptions.maxTokens,
          top_p: finalOptions.topP,
          frequency_penalty: finalOptions.frequencyPenalty,
          presence_penalty: finalOptions.presencePenalty,
          stop: finalOptions.stopSequences,
          stream: true,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          responseType: "stream",
          timeout: 60000, // 60 second timeout for streaming
        },
      );

      const stream = response.data;

      for await (const chunk of this.readStream(stream)) {
        if (chunk.trim() === "data: [DONE]") {
          break;
        }

        if (chunk.startsWith("data: ")) {
          const data = chunk.substring(6);
          if (data.trim()) {
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (e) {
              // Ignore parse errors for empty chunks
            }
          }
        }
      }
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `DeepSeek API streaming error: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
        );
      } else if (error.request) {
        throw new Error(
          "DeepSeek API streaming request failed - no response received",
        );
      } else {
        throw new Error(`DeepSeek API streaming error: ${error.message}`);
      }
    }
  }

  private async *readStream(stream: any): AsyncGenerator<string> {
    const decoder = new TextDecoder();
    let buffer = "";

    for await (const chunk of stream) {
      buffer += decoder.decode(chunk, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        yield line;
      }
    }

    // Yield any remaining data
    if (buffer) {
      yield buffer;
    }
  }

  getModelName(): string {
    return this.model;
  }

  async countTokens(text: string): Promise<number> {
    // Rough estimation: ~4 characters per token for English text
    // This is approximate; actual tokenization depends on the model
    return Math.ceil(text.length / 4);
  }
}

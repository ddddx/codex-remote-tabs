export type CodexOptionModel = {
  id: string;
  model: string;
  displayName: string;
  description: string;
  isDefault: boolean;
  defaultReasoningEffort: string;
  supportedReasoningEfforts: string[];
};

export type CodexOptionsResponse = {
  models: CodexOptionModel[];
  defaults: {
    model: string;
    reasoningEffort: string;
    approvalPolicy: string;
    sandboxMode: string;
  };
};

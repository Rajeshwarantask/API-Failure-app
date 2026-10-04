export type FormState = {
  name: string; description: string; targetUrl: string; method: string; headers: string; queryParams: string;
  requestBody: string; failureType: string; statusCode: string; responseBody: string; latencyMs: string; timeoutMs: string;
  probability: string; conditionMethod: string; conditionPath: string; conditionHeaders: string; conditionQueryParams: string; conditionBodyContains: string;
  forwardRequest: boolean; forwardTimeoutMs: string; preserveHeaders: boolean; enabled: boolean;
};

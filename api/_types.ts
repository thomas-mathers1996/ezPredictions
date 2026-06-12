export type ApiRequest = {
  method?: string;
  query: Record<string, string | string[] | undefined>;
};

export type ApiResponse = {
  status: (statusCode: number) => ApiResponse;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
};

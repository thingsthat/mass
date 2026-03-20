export type RuntimeConfig = {
  public: {
    environment: string;
  };
};

export const runtimeConfig: RuntimeConfig = {
  public: {
    environment: typeof import.meta.env?.MODE === 'string' ? import.meta.env.MODE : 'development',
  },
};

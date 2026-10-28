export const apiUrl = (): string => {
  return process.env.API_URL || 'http://localhost:3000';
};

export const buildHeaders = (token?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

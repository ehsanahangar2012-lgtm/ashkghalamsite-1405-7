export const getApiBase = () => {
  // Always prefer relative paths so API requests go to the same origin (Express server)
  return import.meta.env.VITE_API_BASE_URL || '';
};

import axios from 'axios';
import { API_URL } from './lib/config';

// /run is auth-protected, so the cookie has to travel with the request.
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export const executeCode = async (language, code, input = '') => {
  const response = await api.post('/run', {
    language,
    code,
    input,
  });

  // Backend returns { output, error, exitCode }.
  // Keep stdout and stderr as SEPARATE fields so the UI can style them differently.
  const data = response.data;
  return {
    stdout: data.output || '',
    stderr: data.error || '',
    exitCode: data.exitCode,
  };
};

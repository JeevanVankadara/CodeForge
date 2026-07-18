import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000'
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

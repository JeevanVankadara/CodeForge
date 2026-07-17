import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000'
});

export const executeCode = async (language, code) => {
  const response = await api.post('/run', {
    language,
    code,
  });

  // Backend returns { output, error, exitCode }.
  // Reshape it to the { run: { output, stderr } } form Output.jsx already expects.
  const data = response.data;
  return {
    run: {
      output: (data.output || '') + (data.error || ''),
      stderr: data.error || '',
    },
  };
};

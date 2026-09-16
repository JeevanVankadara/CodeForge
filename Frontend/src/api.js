import axios from 'axios';
import { API_URL } from './lib/config';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export const executeCode = async (language, code, inputs) => {
  const response = await api.post('/run', { language, code, inputs });
  return response.data.results;
};

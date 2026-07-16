import axios from 'axios';
import { LANGUAGE_VERSIONS } from './constants.js';

const api = axios.create({
  baseURL: 'https://emkc.org/api/v2/piston'
});

export const executeCode = async(language, code) => {
  const response = await api.post('/execute', {
    "language": language,
    "version": LANGUAGE_VERSIONS[language],
    "files": [
      {
        "content": code
      }
    ]
  });

  return response.data;
}
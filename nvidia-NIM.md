import axios from 'axios';
import { readFile } from 'node:fs/promises';

const invokeUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
const stream = true;

const headers = {
  "Authorization": "Bearer <NVIDIA_NIM_API_KEY>",
  "Accept": stream ? "text/event-stream" : "application/json"
};

const payload = {
  "model": "moonshotai/kimi-k2.6",
  "messages": [{"role":"user","content":""}],
  "max_tokens": 16384,
  "temperature": 1.00,
  "top_p": 1.00,
  "stream": stream,
  "chat_template_kwargs": {"thinking":true},
  
  
};

Promise.resolve(
  axios.post(invokeUrl, payload, {
    headers: headers,
    responseType: stream ? 'stream' : 'json'
  })
)

  .then(response => {
    if (stream) {
      response.data.on('data', (chunk) => {
        console.log(chunk.toString());
      });
    } else {
      console.log(JSON.stringify(response.data));
    }
  })
  .catch(error => {
    if (error.response) {
      console.error(`HTTP ${error.response.status}`);
      if (error.response.data?.on) {
        error.response.data.on('data', (chunk) => console.error(chunk.toString()));
      } else {
        console.error(error.response.data);
      }
    } else {
      console.error(error);
    }
  });

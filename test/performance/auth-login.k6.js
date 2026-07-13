import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = (__ENV.BASE_URL ?? 'http://127.0.0.1:3001').replace(/\/$/, '');
const password = __ENV.K6_PASSWORD ?? 'SuperSeguro123';

export const options = {
  vus: Number(__ENV.K6_VUS ?? 5),
  duration: __ENV.K6_DURATION ?? '20s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

export function setup() {
  const email = `k6.${Date.now()}@example.com`;
  const payload = JSON.stringify({
    firstNames: 'K6',
    lastNames: 'Runner',
    email,
    phone: '+51999999999',
    password,
  });

  const registerResponse = http.post(`${baseUrl}/auth/register`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(registerResponse, {
    'register devuelve 201': (response) => response.status === 201,
  });

  return { email, password };
}

export default function (data) {
  const loginResponse = http.post(
    `${baseUrl}/auth/login`,
    JSON.stringify({
      email: data.email,
      password: data.password,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );

  check(loginResponse, {
    'login responde 201': (response) => response.status === 201,
    'login devuelve accessToken': (response) => {
      const body = response.json();
      return typeof body?.accessToken === 'string' && body.accessToken.length > 20;
    },
  });

  sleep(1);
}

import http from 'k6/http';
import { check, fail } from 'k6';

const hostUrl = __ENV.HOST_URL;

export let options = {
  vus: 500,           // number of virtual users
  iterations: 8000,    // run just once
};

export default function () {
  const url = hostUrl + '/api/no-drizzle-pg';

  // Send GET request
  let res = http.get(url);

  // Check HTTP status first
  check(res, {
    'status is 200': (r) => r.status === 200,
  }) || fail(`Request failed. Status was ${res.status}`);

  // Parse response as JSON
  let data;
  try {
    data = res.json();
  } catch (e) {
    fail('Response is not valid JSON');
  }

  // Check if required JSON properties are present
  console.log(data);
  const propertiesPresent = check(data, {
    'property "res" exists': (d) => d.hasOwnProperty('res'),
    'property "res.rows" exists': (d) => d.res.hasOwnProperty('rows'),
    // add more properties if needed
  });

  if (!propertiesPresent) {
    fail('One or more required properties are missing from the response');
  }
}
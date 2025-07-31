import http from 'k6/http';
import { check, fail } from 'k6';

const hostUrl = __ENV.HOST_URL;

export let options = {
  vus: 100,
  iterations: 100,
};

export default function () {
  const url = hostUrl + '/api/vercel-show-pg-usage?release_and_destroy=1';

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
  console.log({
    idleBefore: data.idleConnectionsAtStart,
    idleAfter: data.idleConnectionsAtEndAfterRelease,
    connectionsCount: data.rows.length,
  });
  const propertiesPresent = check(data, {
    'property "rows" exists': (d) => d.hasOwnProperty('rows'),
    // add more properties if needed
  });

  if (!propertiesPresent) {
    fail('One or more required properties are missing from the response');
  }
}
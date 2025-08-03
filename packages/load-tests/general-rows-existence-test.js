import http from 'k6/http';
import { check, fail } from 'k6';

const requestUrl = __ENV.URL;

export let options = {
  vus: 1200,
  iterations: 1200,
};

export default function () {
  const url = requestUrl;

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
  // console.log({
  //   idleBefore: data.idleConnectionsAtStart,
  //   idleAfter: data.idleConnectionsAtEndAfterRelease,
  //   connectionsCount: data.rows.length,
  // });
  const propertiesPresent = check(data, {
    'property "rows" exists': (d) => d.hasOwnProperty('rows'),
    // add more properties if needed
  });

  const rowsNotEmpty = check(data, {
    'rows is not empty': (d) => Array.isArray(d.rows) && d.rows.length > 0,
  });

  if (!propertiesPresent) {
    fail('One or more required properties are missing from the response');
  }
}
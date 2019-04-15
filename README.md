# Test task

Test task for Node.js developers.

## Task

The main goal is to create a small Web application with only one API processing
input binary data and returning aggregated statistics for this data. Application
should be able to process relatively big amounts of data and high number of
concurrent requests (i.e. use all you can to achieve higher performance, but
still use Node as a platform :P).

### Configuration

Configuration depends on environment (`NODE_ENV` environment variable). Default
configuration is kept in some JSON / JSON5 file. Environment configuration
should be taken from corresponding JSON / JSON5 file (e.g.`config.ENV.json`).
Default environment is `development`. When configuration is loaded default one
is merged with environment, so that env configuration overrides defaults.

<strong>
If configuration can't be read application should crash.
</strong>

### API

Endpoint URL: `/api/v1/process`
Endpoint method: `'POST`'

(requests to any other endpoint should return 501 with error message)

Handler of this API checks if `Content-Type` header is set to
`application/octet-stream`. If header value is different, request must be
aborted with 406 error and error message.

Incoming data should be parsed and aggregated as specified below. If there is
a parsing error, request should be aborted with 415 and error describing error.

The result of processing should be returned with 200 as JSON message. Assume,
that client always expects JSON output from this Web application.

### Input data

Input data is a history of payment transactions. Each record has following
fields:

- Sender name (string, 32 bytes)
- Receiver name (string, 32 bytes)
- Amount in cents (4 bytes)
- Date as timestamp in ms (6 bytes)

Each record is coded into a binary frame. Frame structure is configurable and
specified in application configuration, so it can be used for parsing frames
before processing.

Assumptions:
- Strings are UTF-8 strings
- Numbers are unsigned integers in big endian

Frame configuration specifies its size and offsets for fields.

```json
{
  "frameSize": 128,
  "offset": {
    "sender": 0,
    "receiver": 32,
    "amount": 72,
    "timestamp": 80
  }
}
```

The rationale of having this frame specification is that frame can have other
fields coded inside, and these fields are not of concern of this application,
but still mentioned fields can be coded and positioned in whatever way.

<strong>
Note: if configuration is invalid, application should crash. Examples of
invalid configuration:
- Overlapping fields
- Field offset + size exceeds frame size
</strong>

### Processing

Statistics calculated per request. Processing of all the frames in request
should result in aggregated statistics:

- Total amount (sum of `amount` values)
- Number of transactions (i.e. number of frames)
- Stats per each user:
    - Number of transactions
    - Total sent amount
    - Total received amount
- Stats per each day:
    - Number of transactions

This can be done in a free form, the formatting below can be used as a
reference:

```json
{
  "total": {
    "amount": 10050000,
    "transactions": 100
  },
  "customerStatistics": {
    "alex": {
      "transactions": 10,
      "totalSent": 1000,
      "totalReceived": 100
    }
  },
  "dayStatistics": {
    "2016-09-01T00:00:00Z": {
      "transactions": 100
    }
  }
}
```

### Error messages

In case of any error API should return JSON message representing `Error` object
with `name` and `message` fields. Optionally, error objects can be custom errors
with corresponding HTTP status codes put into JSON output as well.

## Assumptions

- Size of input data frame can be quite big
- Client making HTTP requests sets indefinite request timeout

## Testing

### Utility for sending test content

Execute `bin/client` for usage.

For testing you can use following command:

    bin/client -u http://... -f 128 -s 0 -r 40 -a 80 -t 120

For stress-testing you can add `-S` option, plus play with `-c` and `-m`.

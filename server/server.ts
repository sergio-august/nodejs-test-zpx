import { createServer, IncomingMessage, ServerResponse } from "http"

const port = 3000

// Input data is a history of payment transactions. Each record has following fields:

// Sender name (string, 32 bytes)
// Receiver name (string, 32 bytes)
// Amount in cents (4 bytes)
// Date as timestamp in ms (6 bytes)

// Note: if configuration is invalid, application should crash.
//
// Examples of invalid configuration:
//  - Overlapping fields
//  - Field offset + size exceeds frame size

interface ITransaction {
	time: number
	amount: number
	sender: string
	receiver: string
}

interface IStat {
	total: {
		amount: number
		transactions: number
	}
	customerStatistics?: {
		[name: string]: {
			transactions: number
			totalSent: number
			totalReceived: number
		}
	}
	dayStatistics: {
		[timestamp: string]: {
			transactions: number
		}
	}
}

interface IFrameConfig {
	frameSize: number
	offset: {
		sender: number // Sender name (string, 32 bytes)
		receiver: number // Receiver name (string, 32 bytes)
		amount: number // Amount in cents (4 bytes)
		timestamp: number // Date as timestamp in ms (6 bytes)
	}
}

const frameConfig: IFrameConfig = {
	frameSize: 74,
	offset: {
		sender: 0,
		receiver: 32,
		amount: 64,
		timestamp: 68
	}
}

function decodeFrame(chunk: Buffer, frameConfig: IFrameConfig): ITransaction {
	function trimNullRight(str: string): string {
		while (str[str.length - 1] === "\0") {
			str = str.slice(0, str.length - 1)
		}
		return str
	}

	if (chunk.length !== frameConfig.frameSize) {
		throw new Error(
			"Failed to parse frame: frame size is incorrect: " +
				`expected ${frameConfig.frameSize}, but got ${chunk.length}`
		)
	}
	const { offset } = frameConfig
	try {
		const sender = trimNullRight(chunk.toString("utf8", offset.sender, offset.sender + 32).trimRight())
		const receiver = trimNullRight(chunk.toString("utf8", offset.receiver, offset.receiver + 32).trimRight())
		const amount = chunk.readIntBE(offset.amount, 4)
		const time = chunk.readIntBE(offset.timestamp, 6)
		return { time, sender, receiver, amount }
	} catch (error) {
		throw new Error("Failed to parse frame: offset problem!\n" + error.message)
	}
}

const server = createServer((request: IncomingMessage, response: ServerResponse) => {
	switch (request.url) {
		case "/api/v1/process": {
			response.setHeader("Content-Type", "application/json")
			if (request.method !== "POST") {
				response.statusCode = 405
				response.end(JSON.stringify({ error: "Method not allowed" }))
			}
			if (request.headers["content-type"] !== "application/octet-stream") {
				response.statusCode = 406
				response.end(JSON.stringify({ error: "'content-type' should be 'application/octet-stream'" }))
			}

			const stat: IStat = {
				total: {
					amount: 0,
					transactions: 0
				},
				customerStatistics: {},
				dayStatistics: {}
			}

			request
				.on("error", error => {
					response.statusCode = 500
					console.error(error)
				})
				.on("end", () => {
					response.end(JSON.stringify(stat, null, "\t"))
				})
				.on("data", chunk => {
					try {
						const { time, sender, receiver, amount } = decodeFrame(chunk, frameConfig)
						console.log(`[${time}] ${sender} -> ${receiver} (${amount})`)
						stat.total.transactions++
						stat.total.amount += amount
						// Per day stats
						const day = new Date(time)
						day.setHours(0)
						day.setMinutes(0)
						day.setSeconds(0)
						day.setMilliseconds(0)
						if (stat.customerStatistics)
							if (stat.dayStatistics[day.getTime()] === undefined) {
								stat.dayStatistics[day.getTime()] = { transactions: 1 }
							} else {
								stat.dayStatistics[day.getTime()].transactions++
							}
						// Per user stats
						if (stat.customerStatistics[sender] === undefined) {
							stat.customerStatistics[sender] = {
								transactions: 1,
								totalSent: amount,
								totalReceived: 0
							}
						} else {
							stat.customerStatistics[sender].transactions++
							stat.customerStatistics[sender].totalSent += amount
						}

						if (stat.customerStatistics[receiver] === undefined) {
							stat.customerStatistics[receiver] = {
								transactions: 1,
								totalSent: 0,
								totalReceived: amount
							}
						} else {
							stat.customerStatistics[receiver].transactions++
							stat.customerStatistics[receiver].totalReceived += amount
						}
					} catch (error) {
						response.end(JSON.stringify({ error: error.name, message: error.message }))
						console.error(error)
						process.exit(1)
					}
				})
			break
		}

		default: {
			response.statusCode = 501
			response.end(JSON.stringify({ error: "Wrong endpoint" }))
		}
	}
})

server.on("clientError", error => {
	if (error) {
		console.error(error)
		process.exit(1)
	} else {
		console.log(`Server listening on port ${port}`)
	}
})

server.listen(port)

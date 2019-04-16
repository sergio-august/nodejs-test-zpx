import { createServer, IncomingMessage, ServerResponse } from "http"
import { Transform } from "stream"

const port = 3000

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
	customerStatistics: {
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

function calculateStat(stat: IStat, data: ITransaction) {
	const { time, sender, receiver, amount } = data
	// console.log(`[${time}] ${sender} -> ${receiver} (${amount})`)
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
}

class CalculateStatStream extends Transform {
	stat: IStat
	constructor(options: any) {
		super(options)
		this.stat = {
			total: {
				amount: 0,
				transactions: 0
			},
			customerStatistics: {},
			dayStatistics: {}
		}
	}
	_transform(chunk: Buffer, enc: string, next: any) {
		try {
			const transaction = decodeFrame(chunk, frameConfig)
			calculateStat(this.stat, transaction)
			next()
		} catch (error) {
			next(error)
		}
	}
	_flush(next: any) {
		console.log(this.stat.total)
		this.push(JSON.stringify(this.stat, null, "\t"))
		next()
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

			const calcStream = new CalculateStatStream({ writableObjectMode: true })

			calcStream
				.on("error", error => {
					console.error(error)
					response.statusCode = 415
					response.end(JSON.stringify({ error: "Parse error", message: error.message }))
				})

			request
				.on("error", error => {
					console.error(error)
					response.statusCode = 415
					response.end(JSON.stringify({ error: "Parse error", message: error.message }))
				})
				.on("close", () => {
					console.log("Client request closed")
					calcStream.end()
				})

			request.pipe(calcStream).pipe(response)

			break
		}

		default: {
			response.statusCode = 501
			response.end(JSON.stringify({ error: "Wrong endpoint" }))
		}
	}
})

server.on("clientError", (error, socket) => {
	if (error) {
		console.error("server clientError", error)
		socket.end("HTTP/1.1 400 Bad Request\r\n\r\n")
	}
})

server.listen(port, () => {
	console.log(`Server listening on port ${port}`)
})

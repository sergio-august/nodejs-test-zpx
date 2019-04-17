import { IncomingMessage } from "http"
import { IConfig } from "./config"

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

function decodeFrame(chunk: Buffer, config: IConfig): ITransaction {
	function trimNullRight(str: string): string {
		while (str[str.length - 1] === "\0") {
			str = str.slice(0, str.length - 1)
		}
		return str
	}

	if (chunk.length !== config.frameSize) {
		throw new Error(
			"Failed to parse frame: frame size is incorrect: " +
				`expected ${config.frameSize}, but got ${chunk.length}`
		)
	}
	const { offset } = config
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


function processTransaction(stat: IStat, data: ITransaction) {
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

export default function CalculateStatistics(config: IConfig) {

	return function(request: IncomingMessage): Promise<IStat> {

		const stat: IStat = {
			dayStatistics: {},
			customerStatistics: {},
			total: {
				amount: 0,
				transactions: 0
			}
		}

		return new Promise((resolve, reject) => {
			request
				.on("readable", () => {
					let chunk
					while (null !== (chunk = request.read(config.frameSize))) {
						try {
							const transaction = decodeFrame(chunk, config)
							processTransaction(stat, transaction)
						} catch (error) {
							reject(error)
						}
					}
				})
				.on("end", () => {
					resolve(stat)
				})
				.on("error", (error: Error) => {
					reject(error)
				})
				.on("close", () => {
					reject(new Error("Client request closed"))
				})
		})
	}

}

// Configuration depends on environment (NODE_ENV environment variable).
// Default configuration is kept in some JSON / JSON5 file.
// Environment configuration should be taken from corresponding JSON / JSON5 file (e.g.config.ENV.json).

// Default environment is development.
// When configuration is loaded default one is merged with environment,
// so that env configuration overrides defaults.

// If configuration can't be read application should crash.

import path from "path"
import { readFileSync } from "fs"

interface IDataFields {
	sender: number // Sender name (string, 32 bytes)
	receiver: number // Receiver name (string, 32 bytes)
	amount: number // Amount in cents (4 bytes)
	timestamp: number // Date as timestamp in ms (6 bytes)
}

interface INonStrictConfig {
	serverPort?: number
	serverHostname?: string
	frameSize: number
	offset: IDataFields
}

export interface IConfig extends INonStrictConfig {
	serverPort: number
	serverHostname: string
	dataSize: IDataFields
}

const environment = process.env.NODE_ENV || "development"

let config: IConfig
// export const config: IConfig = {
// 	serverPort: 3000,
// 	serverHostname: "127.0.0.1",
// 	frameSize: 74,
// 	offset: {
// 		sender: 0,
// 		receiver: 32,
// 		amount: 64,
// 		timestamp: 68
// 	}
// }

try {
	config = JSON.parse(readFileSync(path.join(__dirname, "config.json"), { encoding: "utf8" }))
	const environmentConfig = JSON.parse(
		readFileSync(path.join(__dirname, `config.${environment}.json`), { encoding: "utf8" })
	)
	Object.assign(config, environmentConfig)
	validateConfig(config)
} catch (error) {
	console.error("*****ERROR WHILE LOADING CONFIGURATION!*****")
	throw error
}

function validateConfig(configuration: IConfig): void {
	const { frameSize, dataSize, offset } = configuration

	if (frameSize === undefined) {
		throw new Error("frameSize object must be specified")
	}
	if (!Number.isInteger(frameSize) || frameSize < 0) {
		throw new Error("frameSize must be positive integer")
	}
	if (dataSize === undefined) {
		throw new Error("dataSize object must be specified")
	}
	if (offset === undefined) {
		throw new Error("offset object must be specified")
	}

	for (const field in dataSize) {
		if (dataSize[field as keyof IDataFields] === undefined) {
			throw new Error(`${field} size must be defined`)
		}
		if (dataSize[field as keyof IDataFields] < 0) {
			throw new Error(`${field} size must be >= 0`)
		}
		if (offset[field as keyof IDataFields] === undefined) {
			throw new Error(`${field} offset must be defined`)
		}
		if (!Number.isInteger(offset[field as keyof IDataFields])) {
			throw new Error(`${field} offset must be integer`)
		}
		if (offset[field as keyof IDataFields] < 0) {
			throw new Error(`${field} offset must be >= 0`)
		}
	}

	// Check offset overlapping
	let prevOffset = 0
	for (const field in offset) {
		const currentOffset = offset[field as keyof IDataFields]
		if (currentOffset < prevOffset) {
			throw new Error(`${field} offset overlapping`)
		}
		const nextOffset = currentOffset + dataSize[field as keyof IDataFields]
		prevOffset = nextOffset
	}
	if (prevOffset > frameSize) {
		throw new Error("Frame size incorrect")
	}
}

export default config

export interface IConfig {
	serverPort: number
	frameSize: number
	offset: {
		sender: number // Sender name (string, 32 bytes)
		receiver: number // Receiver name (string, 32 bytes)
		amount: number // Amount in cents (4 bytes)
		timestamp: number // Date as timestamp in ms (6 bytes)
	}
}

const config: IConfig = {
	serverPort: 3000,
	frameSize: 74,
	offset: {
		sender: 0,
		receiver: 32,
		amount: 64,
		timestamp: 68
	}
}

export default config
import { createServer, IncomingMessage, ServerResponse } from "http"
import CalculateStatistics from "./CalculateStatistics"
import config from "./loadConfig"

const calculate = CalculateStatistics(config)

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

			calculate(request)
				.then(stat => {
					response.end(JSON.stringify(stat, null, "\t"))
				})
				.catch((error: Error) => {
					console.error(error)
					response.statusCode = 415
					response.end(JSON.stringify({ error: "Parse error", message: error.message }))
				})

			break
		}

		default: {
			response.statusCode = 501
			response.end(JSON.stringify({ error: "Wrong endpoint" }))
		}
	}
})

server.on("clientError", (error: Error, socket) => {
	if (error) {
		console.error("server clientError", error)
		socket.end("HTTP/1.1 400 Bad Request\r\n\r\n")
	}
})

server.listen(config.serverPort, config.serverHostname, () => {
	console.log(`Server is listening on http://${config.serverHostname}:${config.serverPort}`)
})

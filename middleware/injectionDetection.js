import InjectedData from "../model/injectedData.js";
import axios from "axios";

export async function injecttionDetection(req, res, next) {
    try {
        const message = req.body?.cleanedText;

        if (typeof message !== 'string') {
            return res.status(400).json({
                error: "Invalid request: 'message' must be a string in the request body."
            });
        }


        const response = await axios.post(
            "http://127.0.0.1:9000/check", 
            {message: message}
        )

        const result = response.data.status;

        if (result === "malicious") {
            await InjectedData.create({
                rawMessage: req.body.message,
                cleanedMessage: req.body.cleanedText,
                sanitizationLog: req.body.sanitizationLog,
                thread_id: req.body?.thread_id ?? null,
            });
            return res.json({
                response: "Sorry, I cannot process that request.",
                log: req.body.sanitizationLog,
                cleanedText: message,
                thread_id: req.body?.thread_id ?? null,
                status: result
            });
        }
        next();

    } catch (error) {
        console.error('Sanitization error:', error);
        return res.status(500).json({
            error: 'Internal Server Error during sanitization.'
        });
    }
}


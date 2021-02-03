module.exports = (app) => {

    const { Client, Environment, ApiError } = require('square');

    // Set the Access Token which is used to authorize to a merchant (Square)
    const accessToken = process.env.OMG_SQUARE;


    // Initialized the Square api client:
    //   Set sandbox environment for testing purpose
    //   Set access token
    const client = new Client({
        environment: Environment.Sandbox,
        accessToken: accessToken,
    });

    app.post('/process-payment', async (req, res) => {
        const requestParams = req.body;

        if (typeof requestParams.amount !== "number" || requestParams.amount < 0) {
            return res.send({"error": "Invalid amount"})
        }
        const amount = requestParams.amount * 100 // in cents

        // Charge the customer's card
        const paymentsApi = client.paymentsApi;
        const requestBody = {
            sourceId: requestParams.nonce,
            amountMoney: {
                amount: amount,
                currency: 'USD'
            },
            locationId: requestParams.location_id,
            idempotencyKey: requestParams.idempotency_key,
        };
        
        var user_id = req.user ? req.user.id : undefined
        var db = app.get('db');
        try {
            const response = await paymentsApi.createPayment(requestBody);
            res.status(200).json({
                'result': response.result
            });
            db.saveDoc("payments", {processor: "Square", success: true, result: response.result, user_id}, (err, result) => {})
        } catch(error) {
            let errorResult = null;
            if (error instanceof ApiError) {
                errorResult = error.errors;
            } else {
                errorResult = error;
            }
            res.status(500).json({
                'error': errorResult
            });
            db.saveDoc("payments", {processor: "Square", success: false, result: errorResult, user_id}, (err, result) => {})
        }
    });

}
module.exports = (app) => {

    const { Client, Environment, ApiError } = require('square');
    const JSONBig = require('json-bigint');
    
    // Set the Access Token which is used to authorize to a merchant (Square)
    const accessToken = process.env.OMG_SQUARE;


    // Initialized the Square api client:
    //   Set sandbox environment for testing purpose
    //   Set access token
    var sqSetup = {
        accessToken: accessToken,
    }
    if (process.env.OMG_SQUARE_SANDBOX) {
        sqSetup.environment = Environment.Sandbox
    }
    const client = new Client(sqSetup);

    app.post('/process-payment', async (req, res) => {
        const requestParams = req.body;
        const paymentParams = req.body.params

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
        
        var user_id 
        var username 
        var datetime = new Date()
        if (req.user) {
            user_id = req.user.id 
            username = req.user.username
        }
        var db = app.get('db');
        try {
            const response = await paymentsApi.createPayment(requestBody);

            if (response.result.payment) {
                delete response.result.payment.cardDetails
            }
            /*res.status(200).json({
                'result': response.result
            });*/

            var parsed = JSONBig.parse(JSONBig.stringify(response.result))

            res.send(parsed)
            db.saveDoc("payments", {processor: "Square", success: true, result: parsed, user_id, username, datetime, paymentParams}, (err, result) => {})
        } catch(error) {
            console.log(error)
            let errorResult = null;
            if (error instanceof ApiError) {
                errorResult = error.errors;
            } else {
                errorResult = error;
            }
            res.status(500).json({
                'error': errorResult
            });
            db.saveDoc("payments", {processor: "Square", success: false, result: errorResult, user_id, username, datetime, paymentParams}, (err, result) => {})
        }
    });

}
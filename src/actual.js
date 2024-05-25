


export async function save_actual_transaction(env, json) {
	delete json.transaction.account_name
	delete json.transaction.category_name
	console.log(`Posting Transaction ${JSON.stringify(json)} to Actual API...`)
	const base_url = `https://xiaowenz-actual-api-xiaowenz-862c46f1.koyeb.app:443/v1/budgets/e4b0643c-0571-4fdb-b859-1651062ccc51/accounts/${json.transaction.account}/transactions`;
	console.log(`base_url: ${base_url}`)
	const headers = {
		"Content-Type": "application/json",
		"accept": "application/json",
		"budget-encryption-password": env.ACTUAL_ENCRYPTION_PASSWORD,
		"x-api-key": env.ACTUAL_API_KEY
	}
	console.log(`headers: ${JSON.stringify(headers)}`)
	return await fetch(
        base_url,
        {
            method: "POST",
            headers: headers,
            body: JSON.stringify(json),
        }
    );
}
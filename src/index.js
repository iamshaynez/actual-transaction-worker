/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npx wrangler dev src/index.js` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npx wrangler publish src/index.js --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import OpenAI from "openai";
import { accounts, categories } from "./data";
import { save_actual_transaction } from "./actual";
import { sendMessage } from "./telegram";

async function convert_transaction(env, message) {
    const openai = new OpenAI({
        organization: env.OPENAI_ORG,
        apiKey: env.OPENAI_KEY,
    });
    const completion = await openai.chat.completions.create({
        messages: [
            {
                role: "system",
                content: `把用户提供的信息，转换为一个 JSON 对象。
				{
"transaction": {
	"account_name": "", // 从数组中选择，无法匹配为空 [ "工行储蓄卡","余额宝","工行信用卡","建设银行储蓄卡","萧山农商银行储蓄卡","杭州联合银行储蓄卡","邮储银行储蓄卡","邮储银行信用卡","广发银行信用卡 Safari","中信银行信用卡 万豪","中信银行信用卡 i白金","宁波银行信用卡","南京银行信用卡"]
	"category_name": "", // 消费类别，从数组中选择 ["Kid","Food","Service","General","Car","Housing","Social","Hobby","Income"]
	"amount": 7374,  // 金额，消费为负数，收入为正数
	"payee_name": "", // 商家名称
	"notes":"" // 消费信息
}
}
				`,
            },
            { role: "user", content: message },
        ],
        model: "gpt-3.5-turbo",
        response_format: { type: "json_object" },
    });
    console.log(completion.choices[0].message.content);

    return completion.choices[0].message.content;
}

function getCurrentDateFormatted() {
	const now = new Date();
	
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
  
	return `${year}-${month}-${day}`;
}

function process_transaction(obj) {
	// 检查传入的参数是否是对象
	if (typeof obj === 'object' && obj !== null) {
	  // 为对象增加一个属性，属性值为字符串 'abc'
	  obj.transaction.date = getCurrentDateFormatted();
	  obj.transaction.account = findIdByName(accounts.data, obj.transaction.account_name);
	  obj.transaction.category = findIdByName(categories.data, obj.transaction.category_name);
	  obj.transaction.amount = obj.transaction.amount * 100;
	  obj.transaction.cleared = true;
	} else {
		throw "Failed on processing transaction...";
	}
	return obj;
  }


function errorToString(e) {
    return JSON.stringify({
        message: e.message,
        stack: e.stack,
        from: "error worker",
    });
}

function findIdByName(arr, name) {
	console.log(`arr length: ${arr.length}, name: ${name}`)
	for (let i = 0; i < arr.length; i++) {
	  if (arr[i].name === name) {
		return arr[i].id;
	  }
	}
	return null; // 如果没有匹配的项，返回 null
}

export default {
	async fetch(request, env, ctx) {
		try {

			const body = await request.json();
			console.log(body);
			const text = body.message.text;
			console.log(`command text: ${text}`)

			if(text.toLowerCase().startsWith('save') || text.toLowerCase().startsWith('确认')) {
				// Post transaction to Actual API
				console.log(`Pring Reply Message: ${body.message.reply_to_message.text}`)
				const response = await save_actual_transaction(env, JSON.parse(body.message.reply_to_message.text));
				console.log(`response from api: ${JSON.stringify(response.body)}, status:${response.status}`)
				await sendMessage(env, `Transaction Saved`);
				return new Response("Transaction Saved.", { status: 200 });
			}

			const transaction_base = await convert_transaction(env, text);
			//await sendMessage(env, message);
			console.log(`transaction_base: ${transaction_base}`)
			

			const transaction_json = process_transaction(JSON.parse(transaction_base))
			console.log(`transaction_full: ${JSON.stringify(transaction_json)}`)
			await sendMessage(env, JSON.stringify(transaction_json, null, 2)); //, null, 2)

			return new Response("Completed.", { status: 200 });
		} catch (e) {
            console.log(errorToString(e));
            return new Response(errorToString(e), { status: 200 });
        }
	},
};


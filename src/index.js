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

async function sendMessage(env, text) {
    console.log(`sending ${text} to ${env.TG_CHAT_ID}`);
    return await fetch(
        `${env.TELEGRAM_API_DOMAIN}/bot${env.TG_BOT_TOKEN}/sendMessage`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                method: "post",
                text: text,
                chat_id: env.TG_CHAT_ID,
                //parse_mode: "Markdown",
            }),
        }
    );
}



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
	"account_name": "", // 从数组中选择，无法匹配为空 [ "工行储蓄卡","支付宝","工行信用卡","建设银行储蓄卡","萧山农商银行储蓄卡","杭州联合银行储蓄卡","邮储银行储蓄卡","邮储银行信用卡","广发银行信用卡 Safari","中信银行信用卡 万豪","中信银行信用卡 i白金","宁波银行信用卡","南京银行信用卡"]
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

			const transaction_base = await convert_transaction(env, text);
			//await sendMessage(env, message);
			console.log(`transaction_base: ${transaction_base}`)
			

			const transaction_json = process_transaction(JSON.parse(transaction_base))
			console.log(`transaction_full: ${JSON.stringify(transaction_json)}`)


			return new Response("Completed.", { status: 200 });
		} catch (e) {
            console.log(errorToString(e));
            return new Response(errorToString(e), { status: 200 });
        }
	},
};


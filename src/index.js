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

import { save_actual_transaction, message_category_budget, process_transaction } from "./actual";
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



function errorToString(e) {
    return JSON.stringify({
        message: e.message,
        stack: e.stack,
        from: "error worker",
    });
}

export default {
    async fetch(request, env, ctx) {
        try {
            const body = await request.json();
            console.log(body);
            const text = body.message.text;
            console.log(`Message text: ${text}`);

			// 引用消息并回复关键字，则触发实际的记账操作
            if (
                text.toLowerCase().startsWith("save") ||
                text.toLowerCase().startsWith("确认")
            ) {
                // 记账，提交 API
                console.log(
                    `Found Reply Message: \n${body.message.reply_to_message.text}`
                );
                const response = await save_actual_transaction(
                    env,
                    JSON.parse(body.message.reply_to_message.text)
                );
				
				// 如果保存成功，则返回记账成功的提示，并查询相关的预算使用情况
				// 如果保存失败，则返回记账失败和错误信息
				const response_body = await response.json();
                if (response.status == 200) {
					await sendMessage(env, `记账成功！`);
                    const post_message = await message_category_budget(env, JSON.parse(body.message.reply_to_message.text));
                    await sendMessage(env, post_message);
                } else {
                    await sendMessage(env, `记账失败: ${response_body}`);
                }

                return new Response("Transaction Saved.", { status: 200 });
            }

			// 对于其他提交的消息，分析可能的账务记录，转换为 Json
            const transaction_base = await convert_transaction(env, text);
            //await sendMessage(env, message);
            console.log(`transaction_base: ${transaction_base}`);

            const transaction_json = process_transaction(
                JSON.parse(transaction_base)
            );
            console.log(
                `transaction_full: ${JSON.stringify(transaction_json)}`
            );
            await sendMessage(env, JSON.stringify(transaction_json, null, 2)); //, null, 2)

            return new Response("Completed.", { status: 200 });
        } catch (e) {
            console.log(errorToString(e));
			await sendMessage(env, `出现未知错误：${e.message}`); 
            return new Response(errorToString(e), { status: 200 });
        }
    },
};

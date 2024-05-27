import { accounts, categories } from "./data";

export async function save_actual_transaction(env, json) {
    delete json.transaction.account_name;
    delete json.transaction.category_name;
    console.log(`Posting Transaction ${JSON.stringify(json)} to Actual API...`);
    const base_url = `${env.ACTUAL_BASE}/accounts/${json.transaction.account}/transactions`;
    console.log(`base_url: ${base_url}`);
    const headers = {
        "Content-Type": "application/json",
        accept: "application/json",
        "budget-encryption-password": env.ACTUAL_ENCRYPTION_PASSWORD,
        "x-api-key": env.ACTUAL_API_KEY,
    };
    console.log(`headers: ${JSON.stringify(headers)}`);
    return await fetch(base_url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(json),
    });
}

export async function message_category_budget(env, transaction_json) {
    console.log(`Create Message Based on Transaction ${JSON.stringify(transaction_json)}`);
    const base_url = `${env.ACTUAL_BASE}/months/${getCurrentMonthFormatted()}/categories/${
        transaction_json.transaction.category
    }`;
    console.log(`base_url: ${base_url}`);
    const headers = {
        accept: "application/json",
        "budget-encryption-password": env.ACTUAL_ENCRYPTION_PASSWORD,
        "x-api-key": env.ACTUAL_API_KEY,
    };

    const response = await fetch(base_url, {
        method: "GET",
        headers: headers,
    });

    const message = budget_query_message(await response.json());
    return message;
}

function getCurrentMonthFormatted() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
}

export function process_transaction(obj) {
    // 检查传入的参数是否是对象
    if (typeof obj === "object" && obj !== null) {
        // 为对象增加一个属性，属性值为字符串 'abc'
        obj.transaction.date = getCurrentDateFormatted();
        obj.transaction.account = findIdByName(
            accounts.data,
            obj.transaction.account_name
        );
        obj.transaction.category = findIdByName(
            categories.data,
            obj.transaction.category_name
        );
        obj.transaction.amount = Number((obj.transaction.amount * 100).toFixed(0));

        obj.transaction.cleared = true;
    } else {
        throw "Failed on processing transaction...";
    }
    return obj;
}

function getCurrentDateFormatted() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function findIdByName(arr, name) {
    console.log(`arr length: ${arr.length}, name: ${name}`);
    for (let i = 0; i < arr.length; i++) {
        if (arr[i].name === name) {
            return arr[i].id;
        }
    }
    return null; // 如果没有匹配的项，返回 null
}

function budget_query_message(budget_json) {
    const { name, budgeted, spent, balance } = budget_json.data;
    const spentPercentage = ((-spent / budgeted) * 100).toFixed(2);

    return `预算科目查询成功！\n---\n预算名称：${name}\n本月总花费：${Math.abs(
        spent / 100
    )}\n本月预算剩余：${
        balance / 100
    }\n本月预算使用率：${spentPercentage}%`;
}


export async function sendMessage(env, text) {
    console.log(`sending ${text} to ${env.TG_CHAT_ID}`);
    return await fetch(
        `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`,
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
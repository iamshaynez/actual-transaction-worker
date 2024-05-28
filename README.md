# actual-transaction-worker

This is a worker which runs as a telegram bot to translate natural language to [actual-http-api](https://github.com/jhonderson/actual-http-api) Json Format.

## How to

You will have to change the code and deploy by yourself.

## Tips

- data.js contains the static account and category(budget) information, you will need to extract from the api and replace it.
- prompt contains specific account and category you'd like the bot to recognize, rewrite with yours.

## Environment Variables

```
OPENAI_KEY=
OPENAI_ORG=
TG_BOT_TOKEN=
TG_CHAT_ID=
TG_SECRET_TOKEN=
ACTUAL_API_KEY=
ACTUAL_ENCRYPTION_PASSWORD=
ACTUAL_BASE=https://{your api host url}:443/v1/budgets/{your sync id in settings}
```



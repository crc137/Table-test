const process = require('node:process');

const API = 'https://api.telegram.org/bot{}/{}';
const TOKEN = process.env.TG_BOT_TOKEN;
const KEY = 2, MAX = 4;

const HDR = ['Адрес', 'Тип', 'Описание', 'Комментарий', 'Пояснение', 'Итог'];
const ROWS = [
    ['Щапова 4', 'Перевод', 'Оплата за вынос и погрузку строительного мусора в газель', 'Марка автомобиля («Газель») написана со строчной буквы и без кавычек', 'Оплата за вынос и погрузку строительного мусора в «Газель»', 'Нужно исправить формулировку в назначении платежа'],
    ['Щапова 4', 'Отчёт', 'Вынос и погрузка строительного мусора в газель', 'Марка автомобиля («Газель») написана со строчной буквы и без кавычек', 'Вынос и погрузка строительного мусора в «Газель»', 'Нужно исправить формулировку в отчёте'],
];
const KB = {
    'inline_keyboard': [
        Array.from({ length: 3 }, (_, i) => ({ 'text': String(i + 1), 'callback_data': String(i + 1) })),
        Array.from({ length: 3 }, (_, i) => ({ 'text': String(i + 4), 'callback_data': String(i + 4) }))
    ]
};

async function call(method, data = {}) {
    const url = API.replace('{}', TOKEN).replace('{}', method);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(60000)
        });
        if (!response.ok) {
            const text = await response.text();
            console.log(method, response.status, text.slice(0, 300));
        }
        return response;
    } catch (e) {
        console.log(method, e.message);
        return { ok: false };
    }
}

function splitCols(n) {
    const all = Array.from({ length: n }, (_, i) => i);
    if (n <= MAX) return [all];
    const key = all.slice(0, KEY), rest = all.slice(KEY), parts = [];
    for (let i = 0; i < rest.length; i += MAX - KEY) parts.push([...key, ...rest.slice(i, i + MAX - KEY)]);
    return parts;
}

async function sendTable(chatId, n) {
    const parts = splitCols(n);
    for (const [k, cols] of parts.entries()) {
        const cells = [HDR, ...ROWS].map((row, i) => cols.map(c => ({ 'text': row[c], 'align': 'left', 'valign': 'middle', 'is_header': i === 0 })));
        const table = { 'type': 'table', 'cells': cells, 'is_bordered': true, 'is_striped': true, 'is_compact': true };
        const heading = { 'type': 'heading', 'text': `Колонок: ${n}` + (parts.length > 1 ? ` (${k + 1}/${parts.length})` : ''), 'size': 3 };
        const kb = k === parts.length - 1 ? { reply_markup: KB } : {};
        await call('sendRichMessage', { chat_id: chatId, rich_message: { 'blocks': [heading, table] }, ...kb });
    }
}

async function main() {
    let offset = 0;
    while (true) {
        try {
            const url = new URL(API.replace('{}', TOKEN).replace('{}', 'getUpdates'));
            url.searchParams.append('offset', offset);
            url.searchParams.append('timeout', 30);

            const response = await fetch(url, { signal: AbortSignal.timeout(40000) });
            const r = await response.json();

            for (const u of (r.result || [])) {
                offset = u.update_id + 1;
                if ('callback_query' in u) {
                    const cq = u.callback_query;
                    await call('answerCallbackQuery', { callback_query_id: cq.id });
                    await sendTable(cq.message.chat.id, parseInt(cq.data, 10));
                } else if ('message' in u) {
                    await call('sendMessage', { chat_id: u.message.chat.id, text: 'Сколько колонок?', reply_markup: KB });
                }
            }
        } catch (e) {
            console.log('poll error', String(e).slice(0, 200));
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

if (require.main === module) {
    main();
}

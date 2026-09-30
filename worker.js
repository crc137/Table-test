const KEY = 2, MAX = 4;
const HDR = ['Адрес', 'Тип', 'Описание', 'Комментарий', 'Пояснение', 'Итог.'];
const ROWS = [['Щапова 4', 'Перевод', 'Оплата за вынос и погрузку строительного мусора в газель', 'Марка автомобиля («Газель») написана со строчной буквы и без кавычек', 'Оплата за вынос и погрузку строительного мусора в «Газель»', 'Нужно исправить формулировку в назначении платежа'],['Щапова 4', 'Отчёт', 'Вынос и погрузка строительного мусора в газель', 'Марка автомобиля («Газель») написана со строчной буквы и без кавычек', 'Вынос и погрузка строительного мусора в «Газель»', 'Нужно исправить формулировку в отчёте']];
const KB = {'inline_keyboard': [Array.from({ length: 3 }, (_, i) => ({ 'text': String(i + 1), 'callback_data': String(i + 1) })),Array.from({ length: 3 }, (_, i) => ({ 'text': String(i + 4), 'callback_data': String(i + 4) }))]};

async function call(token, method, data = {}) {
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!r.ok) console.log(method, r.status, (await r.text()).slice(0, 300));
    return r;
}

function splitCols(n) {
    const all = Array.from({ length: n }, (_, i) => i);
    if (n <= MAX) return [all];
    const key = all.slice(0, KEY), rest = all.slice(KEY), parts = [];
    for (let i = 0; i < rest.length; i += MAX - KEY) parts.push([...key, ...rest.slice(i, i + MAX - KEY)]);
    return parts;
}

async function sendTable(token, chatId, n) {
    const parts = splitCols(n);
    for (const [k, cols] of parts.entries()) {
        const cells = [HDR, ...ROWS].map((row, i) => cols.map(c => ({ 'text': row[c], 'align': 'left', 'valign': 'middle', 'is_header': i === 0 })));
        const table = { 'type': 'table', 'cells': cells, 'is_bordered': true, 'is_striped': true, 'is_compact': true };
        const heading = { 'type': 'heading', 'text': `Колонок: ${n}` + (parts.length > 1 ? ` (${k + 1}/${parts.length})` : ''), 'size': 3 };
        const kb = k === parts.length - 1 ? { reply_markup: KB } : {};
        await call(token, 'sendRichMessage', { chat_id: chatId, rich_message: { 'blocks': [heading, table] }, ...kb });
    }
}

async function handle(u, token) {
    if (u.callback_query) {
        const cq = u.callback_query;
        await call(token, 'answerCallbackQuery', { callback_query_id: cq.id });
        await sendTable(token, cq.message.chat.id, parseInt(cq.data, 10));
    } else if (u.message) {
        await call(token, 'sendMessage', { chat_id: u.message.chat.id, text: 'Сколько колонок?', reply_markup: KB });
    }
}

export default {
    async fetch(req, env, ctx) {
        if (req.method !== 'POST') return new Response('ok');
        const u = await req.json();
        ctx.waitUntil(handle(u, env.TG_BOT_TOKEN));
        return new Response('ok');
    }
};

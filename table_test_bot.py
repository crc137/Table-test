import json, os, requests

API = 'https://api.telegram.org/bot{}/{}'
TOKEN = os.environ['TG_BOT_TOKEN']

HDR = ['Адрес', 'Тип', 'Описание', 'Комментарий', 'Пояснение', 'Итог']
ROWS = [
    ['Щапова 4', 'Перевод', 'Оплата за вынос и погрузку строительного мусора в газель', 'Марка автомобиля («Газель») написана со строчной буквы и без кавычек', 'Оплата за вынос и погрузку строительного мусора в «Газель»', 'Нужно исправить формулировку в назначении платежа'],
    ['Щапова 4', 'Отчёт', 'Вынос и погрузка строительного мусора в газель', 'Марка автомобиля («Газель») написана со строчной буквы и без кавычек', 'Вынос и погрузка строительного мусора в «Газель»', 'Нужно исправить формулировку в отчёте'],
]
KB = {'inline_keyboard': [[{'text': str(i), 'callback_data': str(i)} for i in range(1, 4)], [{'text': str(i), 'callback_data': str(i)} for i in range(4, 7)]]}


def call(method, **data):
    data = {k: json.dumps(v) if isinstance(v, (dict, list)) else v for k, v in data.items()}
    r = requests.post(API.format(TOKEN, method), data=data, timeout=60)
    if not r.ok: print(method, r.status_code, r.text[:300], flush=True)
    return r


def send_table(chat_id, n):
    cells = [[{'text': t, 'align': 'left', 'valign': 'middle', 'is_header': i == 0} for t in row[:n]] for i, row in enumerate([HDR] + ROWS)]
    table = {'type': 'table', 'cells': cells, 'is_bordered': True, 'is_striped': True, 'is_compact': True}
    heading = {'type': 'heading', 'text': f'Колонок: {n}', 'size': 3}
    call('sendRichMessage', chat_id=chat_id, rich_message={'blocks': [heading, table]}, reply_markup=KB)


def main():
    offset = 0
    while True:
        try:
            r = requests.get(API.format(TOKEN, 'getUpdates'), params={'offset': offset, 'timeout': 30}, timeout=40).json()
        except Exception as e:
            print('poll error', str(e)[:200], flush=True); continue
        for u in r.get('result', []):
            offset = u['update_id'] + 1
            if 'callback_query' in u:
                cq = u['callback_query']
                call('answerCallbackQuery', callback_query_id=cq['id'])
                send_table(cq['message']['chat']['id'], int(cq['data']))
            elif 'message' in u:
                call('sendMessage', chat_id=u['message']['chat']['id'], text='Сколько колонок?', reply_markup=KB)


if __name__ == '__main__':
    main()

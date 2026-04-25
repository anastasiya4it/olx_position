# OLX Position Tracker — Project Map

## Что делает проект
Инструмент для отслеживания органической позиции OLX-объявления в поисковой выдаче по ключевым словам. Продавец вводит URL своего объявления и набор ключевых слов — приложение показывает на каком месте оно находится, исключая ТОП/промотированные объявления из счёта.

## Стек
- **Frontend**: Vue 3 + Vite + TypeScript (порт 5173)
- **Backend**: Node.js + Express + Puppeteer Core (порт 3000)
- Chrome: `C:/Program Files (x86)/Google/Chrome/Application/chrome.exe`

## Запуск
```bash
npm run dev          # из корня — запускает оба сервера через concurrently
npm run dev:backend  # только бекенд
npm run dev:frontend # только фронтенд
```

## Структура файлов

```
парсер для олх/
├── CLAUDE.md
├── package.json                          ← корень: только concurrently
│
├── frontend/src/
│   ├── App.vue                           ← корневой компонент
│   ├── main.ts
│   ├── style.css                         ← все стили (тёмная/светлая тема)
│   ├── env.d.ts                          ← declare module '*.vue' (важно!)
│   ├── types.ts                          ← SavedKeyword, AppConfig, KeywordStatus
│   ├── api/
│   │   └── checkPosition.ts             ← axios POST /api/check-position
│   ├── constants/
│   │   └── cities.ts                    ← OLX-slugs городов (zaporozhe, kiev, etc.)
│   ├── composables/
│   │   ├── useStorage.ts                ← localStorage: keywords + config
│   │   └── useQueue.ts                  ← последовательная очередь (10с между запросами)
│   └── components/
│       ├── ListingConfig.vue            ← URL объявления + выбор города
│       └── KeywordTable.vue             ← таблица ключей со статусами
│
└── backend/src/
    ├── index.ts                         ← Express, порт 3000, CORS → 5173
    ├── routes/
    │   └── checkPosition.ts            ← POST /api/check-position
    ├── parser/
    │   └── olxParser.ts                ← Puppeteer: логика парсинга
    └── utils/
        └── extractId.ts                ← regex -(ID[a-zA-Z0-9]+)\.html
```

## Критические детали реализации

### Слаги городов OLX (НЕ современная транслитерация!)
OLX использует старые slug-и. Правильно: `zaporozhe`, `kiev`, `kharkov`, `odessa`, `dnepropetrovsk`, `lvov`. НЕ `zaporizhzhia`, `kyiv`, `kharkiv`.

### Загрузка страницы OLX
`waitUntil: 'networkidle2'` вызывает таймаут — OLX всегда делает фоновые запросы.  
Используем: `waitUntil: 'domcontentloaded'` + `setTimeout(3500мс)` для рендера React.

### Поиск объявлений на странице
НЕ используем `[data-cy="l-card"]` — элемент сам является `<a>`, вложенный querySelector возвращает null.  
Используем: `a[href*="/d/uk/obyavlenie/"], a[href*="/d/obyavlenie/"]` — прямой поиск ссылок.

### Определение ТОП/промотированных
По URL-параметру: `search_reason=search%7Cpromoted` (URL-encoded `|`).  
Одно объявление может появляться и как ТОП (вверху) и как органическое (внизу) — их нужно считать раздельно.

### Дедупликация
У каждого объявления в DOM несколько `<a>` (картинка + заголовок). Промотированные НЕ добавляются в `seen` — чтобы их органическое появление было засчитано.

### Очередь запросов
10 секунд между запросами — защита от блокировки OLX. Реализовано в `useQueue.ts`. Всегда строго последовательно.

### localStorage ключи
- `olx_tracker_keywords` — массив SavedKeyword[]
- `olx_tracker_config` — AppConfig (listingUrl + citySlug)

## API

### POST /api/check-position
**Request:**
```json
{ "keyword": "навчання водінню", "listingUrl": "https://www.olx.ua/d/uk/obyavlenie/...", "citySlug": "zaporozhe" }
```
**Response:**
```json
{ "position": 7, "totalScanned": 140, "pagesScanned": 7 }
```
**Errors:** 400 невалидный URL, 503 OLX заблокировал, 504 таймаут, 500 прочее.

## Протестировано
- Ключ: "навчання водінню", город: Запоріжжя (zaporozhe)
- URL: `https://www.olx.ua/d/uk/obyavlenie/avtonstruktor-avtoinstruktor-pdgotovka-do-spitu-avtoshkola-IDVYKtZ.html`
- Результат: органическая позиция #7 (объявление также появляется как ТОП дважды)

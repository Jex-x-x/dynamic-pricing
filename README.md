# Dynamic Pricing for Marketplaces

Автоматическое динамическое ценообразование для маркетплейсов (Ozon, Wildberries).

## Возможности

- Автоматическая корректировка цен на основе спроса
- Поддержка нескольких маркетплейсов (Ozon, Wildberries)
- Интеграция с учётными системами (Bitrix, 1С)
- Уведомления в Telegram
- Детекция обновления базовых цен из учётной системы

## Структура

```
dynamic-pricing/
├── core/                    # Общая логика
│   ├── multiplier.js        # Расчёт множителя на основе спроса
│   ├── base-price.js        # Детекция базовых цен
│   └── config.js            # Конфигурация
├── marketplaces/
│   ├── ozon/                # Ozon API интеграция
│   └── wildberries/         # Wildberries API интеграция
├── workflows/
│   ├── ozon/                # n8n workflows для Ozon
│   └── wildberries/         # n8n workflows для WB
├── storage/                 # PHP endpoints для хранения конфигов
├── docs/                    # Документация
└── examples/                # Примеры конфигураций
```

## Конфигурация

### Ozon

| Параметр | Значение | Описание |
|----------|----------|----------|
| baseline_orders_day | 35 | Целевое кол-во заказов в день |
| min_multiplier | 0.85 | Минимальный множитель |
| max_multiplier | 1.70 | Максимальный множитель |
| step | 0.05 | Шаг изменения |
| threshold_low | 0.8 | Порог снижения |
| threshold_high | 1.2 | Порог повышения |

**Источник базовых цен:** Bitrix catalog.price.list (type 2)
**Маппинг:** Ozon `888XXXXX` → Bitrix `XXXXX`
**Формула:** price = base × multiplier, min_price = base × 0.8, old_price = base × 1.6

### Wildberries

| Параметр | Значение | Описание |
|----------|----------|----------|
| baseline_orders_day | 15 | Целевое кол-во заказов в день |
| min_multiplier | **0.60** | Минимальный множитель |
| max_multiplier | 1.70 | Максимальный множитель |
| step | 0.05 | Шаг изменения |
| threshold_low | 0.8 | Порог снижения |
| threshold_high | 1.2 | Порог повышения |

**Источник базовых цен:** Bitrix catalog.price.list (type 6)
**Маппинг:**
- WB `XXXXX` → Bitrix `XXXXX` (прямое соответствие)
- WB `888XXXXX` → Bitrix `XXXXX` × **1.3** (новый тираж, +30% наценка)
**Формула:** discount% = (1 - base × multiplier / wbPrice) × 100

## Алгоритм

### Расчёт множителя

```
expected = baseline × (часов_прошло / 24)
ratio = actual_orders / expected

Если ratio > 1.2 → multiplier += 5% (max)
Если ratio < 0.8 → multiplier -= 5% (min)
```

### Детекция базовых цен (v2.0)

```
Если currentPrice ≈ savedBase × multiplier (±1%) → цена правильная
Если currentPrice ≠ целевой → учётная система обновила базу
  → принять как новую базу
  → применить multiplier
  → отправить в маркетплейс
```

## Маркетплейсы

| Маркетплейс | Статус | Товаров | API Prices | API Update |
|-------------|--------|---------|------------|------------|
| Ozon | ✅ Production | ~3800 | v5/product/info/prices | v1/product/import/prices |
| Wildberries | ✅ Production | ~5553 | /api/v2/list/goods/filter | /api/v2/upload/task |

### Особенности Wildberries

- **Модель ценообразования:** base_price × (1 - discount%) = final_price
- **Rate limit:** 10 запросов / 6 секунд
- **Quarantine:** Если новая цена < старой/3, товар уходит в карантин
- **Асинхронное обновление:** API возвращает task_id, статус проверяется отдельно

## Быстрый старт

1. Создать конфиг для маркетплейса
2. Развернуть storage endpoints (PHP)
3. Импортировать workflow в n8n
4. Настроить credentials

## Лицензия

MIT

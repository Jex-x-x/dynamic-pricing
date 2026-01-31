# Инструкции для Claude Code

## Проект: Dynamic Pricing for Marketplaces

**Репозиторий:** `/Users/jexxx/dynamic-pricing/` (git: `Jex-x-x/dynamic-pricing`)

---

## Структура проекта

```
dynamic-pricing/
├── core/                    # Общая логика (JavaScript)
│   ├── multiplier.js        # Расчёт множителя
│   ├── base-price.js        # Детекция базовых цен v2.0
│   └── config.js            # Работа с конфигурацией
├── marketplaces/
│   ├── ozon/                # Ozon API
│   │   └── api.js
│   └── wildberries/         # Wildberries API
│       └── api.js
├── workflows/               # n8n workflows
│   ├── ozon/
│   └── wildberries/
├── storage/                 # PHP endpoints
│   ├── dynamic_pricing_config.php
│   └── dynamic_pricing_base_prices.php
├── docs/
└── examples/
```

---

## Алгоритм Dynamic Pricing

### Расчёт множителя

```javascript
baseline = 45 заказов/день (ЦЕЛЬ, не среднее!)
expected = baseline × (МСК_часов / 24)
ratio = actual_orders / expected

Если ratio > 1.2 → multiplier += 5% (max 1.70)
Если ratio < 0.8 → multiplier -= 5% (min 0.85)
Иначе → hold
```

### Детекция базовых цен (v2.0 Bitrix-friendly)

```javascript
Если currentPrice ≈ savedBase × multiplier (±1%) → ничего не делать
Если currentPrice ≠ целевой → учётная система обновила базу
  → savedBase = currentPrice
  → targetPrice = currentPrice × multiplier
  → отправить в маркетплейс
```

---

## Маркетплейсы

### Ozon

| Параметр | Значение |
|----------|----------|
| API Base | `https://api-seller.ozon.ru` |
| Get Prices | `POST /v5/product/info/prices` |
| Update Prices | `POST /v1/product/import/prices` |
| Лимит батча | 1000 товаров |
| Особенность | min_price ограничение |

### Wildberries

| Параметр | Значение |
|----------|----------|
| API Base | `https://discounts-prices-api.wb.ru` |
| Get Prices | `GET /api/v2/list/goods/filter` |
| Update Prices | `POST /api/v2/upload/task` |
| Лимит батча | 1000 товаров |
| Особенность | Асинхронное обновление (task) |

---

## Storage Endpoints

### Config

```
GET  /dynamic_pricing_config.php          → получить конфиг
POST /dynamic_pricing_config.php + X-Token → сохранить конфиг
```

### Base Prices

```
GET  /dynamic_pricing_base_prices.php          → получить базы
POST /dynamic_pricing_base_prices.php + X-Token → сохранить базы
```

---

## Правила разработки

1. **Общий код в `core/`** — переиспользуется для всех маркетплейсов
2. **Специфичный код в `marketplaces/`** — API каждого маркетплейса
3. **n8n workflows в `workflows/`** — готовые к импорту JSON
4. **Тестировать на DEV** перед production
5. **Документировать изменения** в README.md

---

## Клиенты (instances)

| Клиент | Ozon | WB | Config URL |
|--------|------|----|-----------:|
| AutoPapyrus | ✅ | 🚧 | autopapyrus.com/local/api/ |
| ... | | | |

---

## Следующие шаги

1. ✅ Ozon integration (production)
2. 🚧 Wildberries integration
3. ⏳ Многопользовательская версия (SaaS)
4. ⏳ Dashboard для мониторинга

<?php
/**
 * Dynamic Pricing Base Prices Storage - Wildberries
 *
 * GET  - возвращает сохранённые базовые цены
 * POST - обновляет базовые цены (требует токен)
 *
 * Разместить: /local/api/dynamic_pricing_base_prices_wb.php
 */

// Токен для записи (тот же что и для Ozon или отдельный)
define('WRITE_TOKEN', 'qCPsRuc9uDRLA6GNi9JxNHI2bT3ioM1p');

// Путь к файлу с базовыми ценами WB
define('PRICES_FILE', __DIR__ . '/dynamic_pricing_base_prices_wb.json');

header('Content-Type: application/json; charset=utf-8');

// GET - вернуть базовые цены
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists(PRICES_FILE)) {
        echo file_get_contents(PRICES_FILE);
    } else {
        // Возвращаем пустой объект если файла нет
        echo json_encode(['prices' => [], '_updated_at' => null, '_marketplace' => 'wildberries']);
    }
    exit;
}

// POST - обновить базовые цены
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Проверка токена
    $token = $_SERVER['HTTP_X_TOKEN'] ?? $_GET['token'] ?? '';
    if ($token !== WRITE_TOKEN) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid token']);
        exit;
    }

    // Читаем JSON из тела запроса
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON', 'details' => json_last_error_msg()]);
        exit;
    }

    // Добавляем метаданные
    $data['_updated_at'] = date('c');
    $data['_count'] = isset($data['prices']) ? count($data['prices']) : 0;
    $data['_marketplace'] = 'wildberries';

    // Сохраняем
    $result = file_put_contents(PRICES_FILE, json_encode($data, JSON_UNESCAPED_UNICODE));

    if ($result === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to write file']);
        exit;
    }

    echo json_encode(['success' => true, 'bytes' => $result, 'count' => $data['_count']]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);

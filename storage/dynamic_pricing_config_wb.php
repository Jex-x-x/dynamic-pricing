<?php
/**
 * Dynamic Pricing Config API - Wildberries
 *
 * GET  - возвращает текущий конфиг
 * POST - обновляет конфиг (требует токен)
 *
 * Разместить: /local/api/dynamic_pricing_config_wb.php
 */

// Токен для записи
define('WRITE_TOKEN', 'qCPsRuc9uDRLA6GNi9JxNHI2bT3ioM1p');

// Путь к файлу конфига WB
define('CONFIG_FILE', __DIR__ . '/dynamic_pricing_config_wb.json');

header('Content-Type: application/json; charset=utf-8');

// Дефолтный конфиг
$defaultConfig = [
    'pricing' => [
        'baseline_orders_day' => 45,
        'threshold_high' => 1.2,
        'threshold_low' => 0.8,
        'step' => 0.05,
        'max_multiplier' => 1.70,
        'min_multiplier' => 0.85,
        'current_multiplier' => 1.0,
        'last_check' => null,
        'last_decision' => null,
        'last_reason' => null,
        'last_change' => null,
        'moscow_hours' => null
    ],
    '_marketplace' => 'wildberries'
];

// GET - вернуть конфиг
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists(CONFIG_FILE)) {
        echo file_get_contents(CONFIG_FILE);
    } else {
        // Возвращаем дефолтный конфиг
        echo json_encode($defaultConfig, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// POST - обновить конфиг
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
    $data['_updated_by'] = 'n8n';
    $data['_marketplace'] = 'wildberries';

    // Сохраняем
    $result = file_put_contents(CONFIG_FILE, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    if ($result === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to write file']);
        exit;
    }

    echo json_encode(['success' => true, 'bytes' => $result]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);

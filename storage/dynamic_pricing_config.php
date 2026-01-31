<?php
/**
 * Dynamic Pricing Config API
 *
 * GET  - возвращает текущий конфиг
 * POST - обновляет конфиг (требует токен)
 *
 * Разместить: /local/api/dynamic_pricing_config.php
 */

// Токен для записи (сгенерируй свой)
define('WRITE_TOKEN', 'dp_secret_token_change_me');

// Путь к файлу конфига
define('CONFIG_FILE', __DIR__ . '/dynamic_pricing_config.json');

header('Content-Type: application/json; charset=utf-8');

// GET - вернуть конфиг
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists(CONFIG_FILE)) {
        echo file_get_contents(CONFIG_FILE);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Config not found']);
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

<?php
// নিজের হোস্টিংয়ে আপলোডের জন্য (config.js এ MODE: "php")
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
$max = 16 * 1024 * 1024;
if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) { http_response_code(400); exit(json_encode(['error' => 'ফাইল পাওয়া যায়নি।'])); }
$f = $_FILES['image'];
if ($f['size'] > $max) { http_response_code(413); exit(json_encode(['error' => 'ফাইল অনেক বড়।'])); }
$types = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/gif' => 'gif', 'image/webp' => 'webp'];
$mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
if (!isset($types[$mime]) || !getimagesize($f['tmp_name'])) { http_response_code(415); exit(json_encode(['error' => 'শুধু JPG, PNG, GIF, WEBP চলবে।'])); }
$dir = __DIR__ . '/uploads/'; if (!is_dir($dir)) mkdir($dir, 0755, true);
$name = bin2hex(random_bytes(6)) . '.' . $types[$mime];
if (!move_uploaded_file($f['tmp_name'], $dir . $name)) { http_response_code(500); exit(json_encode(['error' => 'সংরক্ষণ করা যায়নি।'])); }
echo json_encode(['url' => 'uploads/' . $name]);

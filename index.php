<?php
  require 'vendor/autoload.php';

$app = new \Slim\Slim();

$app->get('/', function() use ($app) {
  $app->render('home.php');
});

$app->run();
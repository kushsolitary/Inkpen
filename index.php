<?php
  require 'vendor/autoload.php';

$app = new \Slim\Slim();

$app->get('/', function() {
  // $app->render('home.php');
});

$app->run();
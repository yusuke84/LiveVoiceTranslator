<?php

/*
 ref : http://qiita.com/lm0x/items/707ea4051b92bf839a1a
*/

$text_to_translate = $_REQUEST['text'];
$to = $_REQUEST['to'];
$from = $_REQUEST['from'];

$access_token = getAccessToken("livevoice2015","ckNKRGVxbrWP463XBYSQbmtcpkikRn6KOpTmnNBMnJY=")->access_token;

$text = Translator($access_token, array('text' => $text_to_translate,'to' => $to, 'from' => $from));
echo $text;

/* access_token さえ取れればいい */
function getAccessToken($client_id, $client_secret, $grant_type = "client_credentials", $scope = "http://api.microsofttranslator.com"){
    $ch = curl_init();
    curl_setopt_array($ch, array(
        CURLOPT_URL => "https://datamarket.accesscontrol.windows.net/v2/OAuth2-13/",
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query(array(
            "grant_type" => $grant_type,
            "scope" => $scope,
            "client_id" => $client_id,
            "client_secret" => $client_secret
            ))
        ));
    return json_decode(curl_exec($ch));
}

/* 肝心の翻訳君 */
function Translator($access_token, $params){
    $ch = curl_init();
    curl_setopt_array($ch, array(
        CURLOPT_URL => "https://api.microsofttranslator.com/v2/Http.svc/Translate?".http_build_query($params),
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER => true,
        CURLOPT_HTTPHEADER => array(
            "Authorization: Bearer ". $access_token),
        ));
    preg_match('/>(.+?)<\/string>/',curl_exec($ch), $m);
    return $m[1];
}

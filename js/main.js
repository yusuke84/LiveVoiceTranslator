/**
 * Created with JetBrains PhpStorm.
 * User: yusuke
 * Date: 13/10/26
 * Time: 18:21
 * To change this template use File | Settings | File Templates.
 */


//定数定義
var APIKEY = '3beb9648-51be-4a9e-8fb6-cb2e4f18757d';
var DEBUGMODE = 3;
var TRANSLATORUR = 'https://app.html5experts.jp/livevoice/translate/translator.php';


//グルーバルオブジェクト定義
var peer;
var myPeerId;
var callhandl;
var connhandl;
var localStream;
var ClientObject;
var client;
var userList = [];
var timer;
var flag = {status: 'regist'};
var langselecter;
var recognition;
var recognitionBuffer = {isFinal: '',resultText: ''};

//getUserMediaのブラウザインターオペラビリティ対応
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

function getUserList () {
    //ユーザリストを取得
    peer.listAllPeers(function(list){
            for(var cnt = 0;cnt < list.length;cnt++){
                if(list != '[]' && $.inArray(list[cnt],userList)<0 && list[cnt] != peer.id){
                    userList.push(list[cnt]);
                    $('#userlist').append($('<option>', {"value":list[cnt], "text":list[cnt]}));
                    $('#regist').attr('disabled', false);
                }
            }
        }
    );
}

function changeUI(){

    if(flag.status == "registered"){
        $("#regist").text("Call");
        if($('#userlist').length == 0) $('#regist').attr('disabled', true);
        $('#exit').attr('disabled', false);

    }else if(flag.status == "started"){
        $('#regist').attr('disabled', true);

    }else if(flag.status == "regist"){
        $("#regist").text("Start");
        $('#exit').attr('disabled', true);
    }

}

function finishVideoChat(){

    flag = {status: 'regist'};
    changeUI();
    if(callhandl != null){
        callhandl.close();
    }
    $('#myTelop').text('');
    //peer.disconnect();
    //peer.destroy();

}

function deleteClient(){

    client.destroy({
        success: function(client) {
            // 成功
            console.log("ユーザ情報削除");
        },
        error: function(client, error) {
            // エラー
            console.log("エラー:" + error);
        }
    })

    userList = [];
    $('#userlist').empty();

}

function speechStart(){

    recognition = new webkitSpeechRecognition();

    var isContinuous = true;
    var isInterimResults = true;
    var lang = langselecter.speech;

    recognition.lang = lang;
    recognition.continuous = isContinuous;
    recognition.interimResults = isInterimResults;
    recognition.start();

    recognition.onresult = function(event) {
        for(var i=event.resultIndex; i<event.results.length; i++){
            var result = event.results[i];
            if(result.isFinal && langselecter.transfrom != langselecter.transto){
                $.ajaxSetup({ async: false });
                $.ajax(TRANSLATORUR,{text: result[0].transcript,from: langselecter.transfrom,to: langselecter.transto},
                    function(json){
                        sendMesg(JSON.stringify($(json.translation).text()));
                    }
                );
            }else if(result.isFinal && langselecter.transfrom == langselecter.transto){
                sendMesg(JSON.stringify(result[0].transcript));
            }
            recognitionBuffer = {
                isFinal: result.isFinal,
                resultText: result[0].transcript
            }
            updateTelopMyVoice(result[0].transcript);
            console.log('result[' + i + '] = ' + result[0].transcript);
            console.log('confidence = ' + result[0].confidence);
            console.log('is Final ? ' + result.isFinal);
        }
    }

    recognition.onend = function(){
        console.log('終了');
        var now = new Date().getTime();
        if(now-recognition.timer<1000){
            alert("Google Web Speech APIが異常動作しました。\n" + "同一ブラウザ複数タブでチャットを試みている場合は正常な挙動です。\n" + "それ以外の場合はブラウザを一度再起動してください。");
            speechStop();
            return;
        }
        speechStart();
        recognition.timer = now;
    }

}

function speechStop(){

    //recognition.stop();
    recognition.abort();

}

function str2binary(str, callback){
    var reader = new FileReader();
    reader.onload = function(e){
        callback(reader.result);
    };
    reader.readAsArrayBuffer(new Blob([str]));
}

function binary2str(message, callback){
    var reader = new FileReader();
    reader.onload = function(e){
        message.transcript = JSON.parse(reader.result);
        callback(message);
    };
    reader.readAsText(new Blob([message.transcript]));
}

function updateTelop(msg){
    $('#myTelop').removeClass('bgBlue');
    binary2str(msg,function(data){
        console.log(data);
        $('#myTelop').text(data.transcript);
    });
}

function updateTelopMyVoice(msg){
    $('#myTelop').addClass('bgBlue');
    $('#myTelop').text(msg);
}

function speechlangselecter(mylang){
    switch (mylang){
        case 'ja-JP':
            langselecter = {speech: 'ja-JP',transfrom: 'ja',transto: null}
            break;
        case 'en-US':
            langselecter = {speech: 'en-US',transfrom: 'en',transto: null}
            break;
    }

}
function translangselecter(peerlang){
    switch (peerlang){
        case 'ja-JP':
            if(langselecter.speech == 'ja-JP'){
                //日本語➡日本語
                langselecter.transto = 'ja';
            }else if(langselecter.speech == 'en-US'){
                //英語➡日本語
                langselecter.transto = 'ja';
            }
            break;
        case 'en-US':
            if(langselecter.speech == 'ja-JP'){
                //日本語➡英語
                langselecter.transto = 'en';
            }else if(langselecter.speech == 'en-US'){
                //英語➡英語
                langselecter.transto = 'en';
            }
            break;
    }
}

function sendMesg(msg){
    console.log(msg);
    str2binary(msg,function(data){
        var message_ = {
        transcript: data
    }
        console.log(message_);
        connhandl.send(message_);
    });

}

function initPeerjs(peerid){
    peer = new Peer(peerid,{ key: APIKEY, debug: DEBUGMODE});

}


function generateId(){
    // 生成する文字列の長さ
    var l = 5;

// 生成する文字列に含める文字セット
    var c = "abcdefghijklmnopqrstuvwxyz0123456789";

    var cl = c.length;
    var r = "";
    for(var i=0; i<l; i++){
        r += c[Math.floor(Math.random()*cl)];
    }

    return r;
}

$(document).ready(function(){

    $('#mic').addClass('displaynone');

    //名前を入力したら登録ボタンが押下可能に
    $('#name').each(function(){
        $(this).bind('keyup', function(){
            if($('#name').val() != ''){
                $('#regist').attr('disabled', false);
            }else{

                $('#regist').attr('disabled', true);
            }
        })
    });

    $('#mic').mousedown(function(){
    });

    $('#mic').mouseup(function(){
        if(langselecter.transfrom != langselecter.transto){
            $.getJSON(TRANSLATORUR,{text: recognitionBuffer.resultText,from: langselecter.transfrom,to: langselecter.transto},
                function(json){
                    sendMesg(JSON.stringify($(json.translation).text()));

                }
            );
        }else if(langselecter.transfrom == langselecter.transto){
            sendMesg(recognitionBuffer.resultText);
        }

        recognitionBuffer.resultText = '';

    });

    //登録ボタン
    $('#regist').on('click',function(e){

        e.preventDefault();

        $('#mic').removeClass('displaynone');

        var results_ = null;

        speechlangselecter($('#langselecter').val());

        if(flag.status == 'regist') {

            //PeerIDを生成
            var id = generateId();
            id += '_' + $('#langselecter').val();

            //Peerオブジェクトを初期化
            initPeerjs(id);

            peer.on('open', function (id) {

                myPeerId = id;
                console.log('MyPeerID', myPeerId);

            });

            //メディア取得
            navigator.getUserMedia({audio: true, video: true}, function (stream) {
                // Set your video displays
                $('#myVideo').prop('src', URL.createObjectURL(stream));

                localStream = stream;

            }, function (error) {
                console.log(error);
            });

            //着信時
            peer.on('call', function (call) {

                callhandl = call;

                translangselecter(call.peer.slice(-5));

                callhandl.answer(localStream);
                callhandl.on('stream', function (stream) {
                    $('#remoteVideo').prop('src', URL.createObjectURL(stream));
                    speechStart();
                });
                callhandl.on('close', function () {
                    speechStop();
                    deleteClient();
                    finishVideoChat();
                });
                callhandl.on('error', function () {
                    console.log(err.message);
                    speechStop();
                    deleteClient();
                    finishVideoChat();
                });

                flag = {status: 'started'};
                changeUI();

            });

            peer.on('connection', function (conn) {

                connhandl = conn;
                console.log('データチャネル接続確立');

                connhandl.on('data', function (msg) {
                    updateTelop(msg);

                })

                connhandl.on('close', function () {
                    console.log('データチャネルクローズ');
                });

                connhandl.on('error', function (err) {
                    console.log('データチャネルエラー：' + err);

                });

            });

            peer.on('close', function () {
                speechStop();
                finishVideoChat();

            });

            peer.on('error', function (err) {
                console.log(err.message);
                speechStop();
                finishVideoChat();
            });

            flag = {status: 'registered'};

            getUserList();
            timer = setInterval('getUserList()', 5000);

            changeUI();

        }else if(flag.status == 'registered'){

            connhandl = peer.connect($("#userlist").val(),
                {label:'controle',serialize:'binary',reliable:'true'});

            connhandl.on('data', function(msg) {
                updateTelop(msg);

            });

            callhandl = peer.call($("#userlist").val(),localStream);
            callhandl.on('stream', function(stream){


                translangselecter(callhandl.peer.slice(-5));

                $('#remoteVideo').prop('src', URL.createObjectURL(stream));

                speechStart();
            });

            callhandl.on('close', function(){
                speechStop();
                finishVideoChat();
            });

            callhandl.on('error', function(){
                console.log(err.message);
                speechStop();
                finishVideoChat();
            });

            flag = {status: 'started'};
        }

    });


    //終了ボタン
    $('#exit').on('click',function(e){
        $('#mic').addClass('displaynone');
        finishVideoChat();
        clearInterval(timer);

    });


})



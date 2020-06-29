(function (factory) {
  window.csaaKoreBotChat = factory();
})(function () {

  // Local storage entries
  var JWT_GRANT               = 'jwtGrant';
  var BOT_USER_IDENTITY       = 'csaa_chat_unique_id';
  var CHAT_WINDOW_STATUS      = 'csaa_chat_maximized';
  var MESSAGE_COUNTER         = 'chatHistoryCount';
  var LIVE_CHAT               = 'agentTfrOn';
  var QUEUED_MESSAGE_COUNT    = 'csaa_queued_message_count';

  // Chat events
  var CHAT_STARTED            = 'CHAT_STARTED';
  var CHAT_MINIMIZED          = 'CHAT_MINIMIZED';
  var CHAT_MAXIMIZED          = 'CHAT_MAXIMIZED';
  var CHAT_CUSTOMER_ENGAGED   = 'CHAT_CUSTOMER_ENGAGED';
  var CHAT_AGENT_ENGAGED      = 'CHAT_AGENT_ENGAGED';
  var CHAT_AGENT_DISCONNECTED = 'CHAT_AGENT_DISCONNECTED';
  var CHAT_ENDED_USER         = 'CHAT_ENDED_USER';
  var CHAT_ENDED_AGENT        = 'CHAT_ENDED_AGENT';
  var CHAT_SURVEY_TRIGGERED   = 'CHAT_SURVEY_TRIGGERED';
  var CHAT_SURVEY_ANSWERED    = 'CHAT_SURVEY_ANSWERED';

  function csaaKoreBotChat() {

    var koreJquery;
    var chatConfig;
    var chatInstance;
    var chatLifeCycle;

    if (window && window.KoreSDK && window.KoreSDK.dependencies && window.KoreSDK.dependencies.jQuery) {
      //load kore's jquery version
      koreJquery = window.KoreSDK.dependencies.jQuery;
    } else {
        //fall back to clients jquery version
        koreJquery = window.jQuery;
    }

    return (function ($) {

      chatInstance = koreBotChat();
      chatInstance.init = init();

      function init () {

        return function (botOptions, configOverrides, chatLifeCycleObj) {

          // Chat Check
          if (chatLifeCycle && chatLifeCycle.isChatEnabled && !chatLifeCycle.isChatEnabled()) {
            return;
          }

          // Set Data
          chatLifeCycle = chatLifeCycleObj;
          chatConfig = getChatConfig(botOptions, configOverrides);

          // Chat Icon
          attachChatIconUI($);

          // Chat Listeners
          chatIconEventListeners();

          // Chat Initialize
          initializeSession(chatConfig);
        };
      }

      function getChatConfig (chatBotOptions, configOverrides) {
        //Define the bot options
        var botOptions = {};
        botOptions.koreAPIUrl = 'https://bots.kore.ai/api/';
        botOptions.koreSpeechAPIUrl = ''; // This option is deprecated
        botOptions.ttsSocketUrl = ''; // This option is deprecated
        botOptions.assertionFn = undefined;
        botOptions.koreAnonymousFn = koreAnonymousFn;
        botOptions.botInfo = {'name':'Bot Name', '_id' :'Bot Id'};  //Capture Bot Name & Bot ID from Builder Tool app. Go to respective Bot and then navigate to Settings-->Config Settings-->General settings section. Bot Name is case sensitive.
        // botOptions.JWTUrl = 'PLEASE_ENTER_JWTURL_HERE';//above assertion function  picks url from here
        botOptions.userIdentity = '';// Provide users email id here
        botOptions.clientId = ''; // issued by the kore.ai on client app registration.
        // botOptions.clientSecret = 'PLEASE_ENTER_CLIENT_SECRET';// issued by the kore.ai on client app registration.

        // Assign Bot options to chatWindow config
        var chatConfig = {
          botOptions: botOptions,
          allowIframe: false, // set true, opens authentication links in popup window, default value is "false"
          isSendButton: false, // set true, to show send button below the compose bar
          isTTSEnabled: true, // set false, to hide speaker icon
          isSpeechEnabled: true, // set false, to hide mic icon
          allowGoogleSpeech: true, //This feature requires valid Google speech API key. (Place it in 'web-kore-sdk/libs/speech/key.js')
                        //Google speech works in Google Chrome browser without API key.
          allowLocation: true, // set false, to deny sending location to server
          loadHistory: false, // set true to load recent chat history
          messageHistoryLimit: 10, // set limit to load recent chat history
          autoEnableSpeechAndTTS: false, // set true, to use talkType voice keyboard.
          graphLib: 'd3',  // set google, to render google charts.This feature requires loader.js file which is available in google charts documentation.
          googleMapsAPIKey: '' // please provide google maps API key to fetch user location.
        };

        Object.assign(botOptions, chatBotOptions);
        Object.assign(chatConfig, configOverrides);

        var originalAssertionFn = chatConfig.botOptions.assertionFn;
        chatConfig.botOptions.assertionFn = assertionFnWrapper(originalAssertionFn, chatInstance);

        if (botOptions.userIdentity === '') {
          botOptions.userIdentity = getBotUserIdentity();
        }

        return chatConfig;
      }

      function attachChatIconUI ($) {
        var bubble = '\
          <div chat="bubble" thinking="nope" visible="nope">\
            <div chat="notifications">\
              <div></div>\
            </div>\
            <div chat="master_button">\
              <div>\
                <div chat="icon">\
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" stroke="rgb(255, 255, 255)" fill="none"><path d="M9.37 1.34h1.43a8.2 8.2 0 0 1 0 16.39H9.37a10 10 0 0 1-2.68-.45c-.55-.15-2.23 1.8-2.63 1.36s.05-2.8-.4-3.23q-.28-.27-.54-.57a8.2 8.2 0 0 1 6.26-13.5z"/><path d="M6.37 7.04h6.2m-6.2 2.62h7.94m-7.94 2.62h5.05" stroke-linecap="round"/></svg>\
                  <svg class="spinner" width="65px" height="65px" viewBox="0 0 66 66">\
                    <circle class="path" cx="33" cy="33" r="30" fill="none" stroke-width="6"></circle>\
                  </svg>\
                </div>\
              </div>\
            </div>\
          </div>\
        ';

        $('body').append(bubble);
      }

      function attachNotificationMessageUI (message, $notifications) {
        var notificationMsg = '\
          <div chat="message">\
            <div message="header">\
              <div message="subject" style="color: rgb(23, 120, 211);">New message</div>\
                <div action="close">\
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M7.41 7.84L12 12.42l4.59-4.58L18 9.25l-6 6-6-6z"></path><path d="M0-.75h24v24H0z" fill="none"></path></svg>\
                </div>\
              </div>\
            <div message="body">\
              <p>' + message + '</p>\
            </div>\
          </div>\
        ';

        $notifications.children().html(notificationMsg);
        $notifications.addClass('slide');
      }

      function attachSubheaderUI (subheader, $koreChatHeader, $koreChatBody) {
        var $subheader = $(subheader);
        $subheader.addClass('kore-chat-subheader');
        $subheader.insertAfter($koreChatHeader.first());

        var oldKoreChatBodyTop = $koreChatBody.css('top');
        var newKoreChatBodyTop = parseFloat(oldKoreChatBodyTop) + $subheader.height();

        $koreChatBody.css({ top: newKoreChatBodyTop + 'px' });
      }

      function initializeSession () {

        if (!isChatSessionActive()) {
          // Show chat icon
          setTimeout(function () { showChatIcon(true) }, 800);
        } else {
          // Reload session data
          chatConfig.botOptions.restorePS = true;
          chatConfig.botOptions.jwtGrant = JSON.parse(localStorage.getItem(JWT_GRANT));
          chatConfig.botOptions.chatHistory = this.chatHistory;
          chatConfig.loadHistory = true;

          if (isChatWindowMinimized()) {
            // Continue chat in minimized state
            setTimeout(function () { showChatIcon(true) }, 800);
            var queuedMessageCount = localStorage.getItem(QUEUED_MESSAGE_COUNT);
            if (queuedMessageCount) {
              var $masterButton = $bubble.children('[chat=master_button]');
              $masterButton.attr('queued_messages', queuedMessageCount);
            }
          } else {
            // Open ongoing session
            renderChat();
          }
        }
      }

      function renderChat () {
        chatInstance.show(chatConfig);
        chatWindowEventListeners();
      }

      function chatIconEventListeners () {
        var $bubble = $('[chat=bubble]');
        var $masterButton = $bubble.children('[chat=master_button]');
        var $notifications = $bubble.children('[chat=notifications]');

        $masterButton.on('click', function () {

          if (isChatSessionActive()) {

            // Maximize window

            $('.kore-chat-window').addClass('slide');
            renderChat();
            publishEvent(CHAT_MAXIMIZED);

          } else {

            // Check whether a new chat session is allowed

            if (chatLifeCycle && chatLifeCycle.isChatSessionEnabled && !chatLifeCycle.isChatSessionEnabled()) {
              return;
            }

            // Open new session

            showChatIcon(false);
            $bubble.attr('thinking', 'yep');
            renderChat();
            publishEvent(CHAT_STARTED);
          }

          localStorage.setItem(CHAT_WINDOW_STATUS, 'maximized');
          $masterButton.removeAttr('queued_messages');
          $notifications.removeAttr('queued_messages');
          localStorage.removeItem(QUEUED_MESSAGE_COUNT);
        });
      }

      function chatWindowEventListeners() {
        var bot = chatInstance.bot;

        var $bubble = $('[chat=bubble]');
        var $masterButton = $bubble.children('[chat=master_button]');
        var $notifications = $bubble.children('[chat=notifications]');

        var $koreChatWindow = $('.kore-chat-window');
        var $koreChatHeader = $koreChatWindow.find('.kore-chat-header');
        var $koreChatBody = $koreChatWindow.find('.kore-chat-body');
        var $chatBoxControls = $koreChatHeader.find('.chat-box-controls');

        if (chatConfig.subheader) {
          attachSubheaderUI(chatConfig.subheader, $koreChatHeader, $koreChatBody);
        }

        $('.close-btn').on('click', function (e) {
          e.stopPropagation();
          handleChatEndByUser();
        });

        bot.on('rtm_client_initialized', function () {
          bot.RtmClient.on('ws_error', function (event) {
            //where event is web socket's onerror event
          });

          bot.RtmClient.on('ws_close', function (event) {
            //where event is web socket's onclose event
          });
        });

        //applicable only if botOptions.loadHistory = true;
        bot.on('history', function (historyRes) {
          $bubble.attr('thinking', 'nope');
          showChatIcon(false);
          $koreChatWindow.addClass('slide');
        });

        // Open event triggers when connection established with bot
        bot.on('open', function (response) {
          localStorage.setItem(JWT_GRANT, JSON.stringify(bot.userInfo));
        });

        // Event occurs when you recieve any message from server
        bot.on('message', function(msg) {
          // Converting JSON string to object
          var dataObj = JSON.parse(msg.data);

          //differ user message & bot response check message type
          if (dataObj.from === 'bot' && dataObj.type === 'bot_response') {
            // Bot sends a message to you
            if ($bubble.attr('thinking') === 'yep') {
              $bubble.attr('thinking', 'nope');
              showChatIcon(false);
              $koreChatWindow.addClass('slide');
            }

            $('.listTmplContentChild').off('click').on('click', function (e) {
              if (e.target.className === 'buyBtn') return;
              if (e.target.className === 'listRightContent') return;
              if (e.target.tagName === 'IMG') return;

              var $buyBtn = $(this).find('.buyBtn')
              $buyBtn.trigger('click');
            });

            var msgText = dataObj.message[0].component.payload.text;

            if (msgText === 'You are now connected to an Agent.') {
              localStorage.setItem(LIVE_CHAT, 'true');
              publishEvent(CHAT_AGENT_ENGAGED);
            }

            if (msgText === 'Live Agent Chat has ended.') {
              localStorage.setItem(LIVE_CHAT, 'false');
              publishEvent(CHAT_AGENT_DISCONNECTED);
            }

            if (msgText === 'Do you want to provide feedback?') {
              localStorage.setItem(LIVE_CHAT, 'false');
              publishEvent(CHAT_SURVEY_TRIGGERED);
            }

            if (msgText.includes('0-10 scale, 0=very dissatisfied, 10=very satisfied')) {
              publishEvent(CHAT_SURVEY_ANSWERED);
            }

            if (msgText === 'Thank you. The chat session has ended.'
              || msgText === 'Thank you for your feedback. The chat session has ended.') {
              handleChatEndByAgent();
            }

            if (localStorage.getItem(LIVE_CHAT) === 'true') {
              if (chatConfig.notificaitonsEnabled && localStorage.getItem(CHAT_WINDOW_STATUS) === 'minimized') {

                if (['XX', 'AR', 'AT', 'AST', 'ack', 'pong', 'ping'].indexOf(msgText) !== -1) return;

                var currentQueuedMessages = $masterButton.attr('queued_messages') || 0;
                var queuedMessages = parseInt(currentQueuedMessages) + 1;

                $masterButton.attr('queued_messages', queuedMessages);
                $notifications.attr('queued_messages', queuedMessages);

                localStorage.setItem(QUEUED_MESSAGE_COUNT, queuedMessages);

                attachNotificationMessageUI(msgText, $notifications);
                bindNotificationMessageEventListeners($notifications);
              }
            }
          }
        });

        if (!chatConfig.draggable && $koreChatWindow.data('ui-draggable')) {
          $koreChatWindow.draggable('destroy');
        }

        $chatBoxControls.children('.minimize-btn').off('click').on('click', function () {
          publishEvent(CHAT_MINIMIZED);
          localStorage.setItem(CHAT_WINDOW_STATUS, 'minimized');
          $koreChatWindow.removeClass('slide');
          showChatIcon(true);
        });
      }

      function bindNotificationMessageEventListeners ($notifications) {
        $('[action=close]').on('click', function () {
          $notifications.removeClass('slide');
          $notifications.removeAttr('queued_messages');
        });
      }

      function assertionFnWrapper (originalAssertionFn, koreBot) {
        return function (options, callback) {
          originalAssertionFn()
            .then(function (jwt) {
              options.assertion = jwt;
              options.handleError = koreBot.showError;
              options.chatHistory = koreBot.chatHistory;
              options.botDetails = koreBot.botDetails;

              callback(null, options);
              setTimeout(function () {
                if (koreBot && koreBot.initToken) {
                  koreBot.initToken(options);
                }
              }, 2000);
            });
        }
      }

      function getBotUserIdentity () {
        if (isChatSessionActive()) {
          return localStorage.getItem(BOT_USER_IDENTITY);
        } else {
          var userID = getUniqueID();
          localStorage.setItem(BOT_USER_IDENTITY, userID);
          return userID;
        }
      }

      function showChatIcon (visibility) {
        $('[chat=bubble]').attr('visible', visibility ? 'yep': 'nope');
      }

      function isChatSessionActive () {
        return localStorage.getItem(JWT_GRANT) != null;
      }

      function isChatWindowMinimized() {
        return localStorage.getItem(CHAT_WINDOW_STATUS) === 'minimized';
      }

      function getUniqueID () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }

      function publishEvent(eventName) {
        csaaKoreBotChat.dispatchEvent(new CustomEvent('CHAT_EVENT', {
          detail: {
            event: eventName
          }
        }));
      }

      function handleChatEndByUser() {
        if (localStorage.getItem(LIVE_CHAT) === 'true') {
          var messageToBot = {
            message: { body: 'endAgentChat' },
            resourceid: '/bot.message'
          };
          chatInstance.bot.sendMessage(messageToBot);
        }
        publishEvent(CHAT_ENDED_USER);
        handleChatEnd();
      }

      function handleChatEndByAgent() {
        publishEvent(CHAT_ENDED_AGENT);
        handleChatEnd();
      }

      function handleChatEnd() {
        localStorage.removeItem(CHAT_WINDOW_STATUS);
        localStorage.removeItem(BOT_USER_IDENTITY);
        localStorage.removeItem(JWT_GRANT);
        localStorage.removeItem(MESSAGE_COUNTER);
        localStorage.removeItem(LIVE_CHAT);
        localStorage.removeItem(QUEUED_MESSAGE_COUNT);

        chatConfig.botOptions.userIdentity = getBotUserIdentity();
        chatConfig.botOptions.jwtGrant = undefined;
        chatConfig.botOptions.restorePS = undefined;
        chatConfig.botOptions.chatHistory = undefined;

        chatConfig.chatHistory = undefined;
        chatConfig.handleError = undefined;
        chatConfig.loadHistory = false;

        $koreChatWindow.removeClass('slide');
        setTimeout(function () {
          showChatIcon(true);
          chatInstance.destroy();
        }, 800);
      }

      return chatInstance;
    })(koreJquery);
  };

  return csaaKoreBotChat;
});
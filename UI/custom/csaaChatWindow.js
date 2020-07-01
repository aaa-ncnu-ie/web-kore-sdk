(function (factory) {
  window.csaaKoreBotChat = factory();
})(function () {

  // Local storage entries
  var JWT_GRANT               = 'csaa_chat_jwt';
  var BOT_USER_IDENTITY       = 'csaa_chat_unique_id';
  var CHAT_WINDOW_STATUS      = 'csaa_chat_window_status';
  var LIVE_CHAT               = 'csaa_chat_live_agent';
  var QUEUED_MESSAGE_COUNT    = 'csaa_chat_queued_message_count';
  var CUSTOMER_ENGAGED        = 'csaa_chat_customer_engaged';

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
  var CHAT_SURVEY_UNANSWERED  = 'CHAT_SURVEY_UNANSWERED';

  function csaaKoreBotChat() {

    var koreJquery;
    var defaultChatConfig;
    var chatInstance;
    var chatLifeCycle;
    var events = {};

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
      chatInstance.on = on();

      function init () {

        return function (chatConfig, startChatImmediately, chatLifeCycleObj) {

          // Chat Check
          if (chatLifeCycleObj && chatLifeCycleObj.isChatEnabled && !chatLifeCycleObj.isChatEnabled()) {
            // Do not show chat icon nor open any existing chat session
            return;
          }

          // Set Data
          defaultChatConfig = chatConfig;
          chatLifeCycle = chatLifeCycleObj;

          // Chat Icon
          attachChatIconUI($);

          // Chat Listeners
          chatIconEventListeners();

          // Chat Initialize
          initializeSession();

          // Start Chat Session Immediately
          if (startChatImmediately) {
            startNewChat();
          }
        };
      }

      function initializeSession () {

        if (!isChatSessionActive()) {
          // Show chat icon
          setTimeout(function () { showChatIcon(true) }, 800);
        } else {
          // Reload session data
          var chatConfig = getChatConfig(defaultChatConfig, true);

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
            renderChat(chatConfig);
          }
        }
      }

      function getChatConfig (defaultChatConfig, reloadSession) {

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

        var chatConfig = {
          botOptions: {},
          allowIframe: false, // set true, opens authentication links in popup window, default value is "false"
          isSendButton: false, // set true, to show send button below the compose bar
          isTTSEnabled: false, // set false, to hide speaker icon
          isSpeechEnabled: false, // set false, to hide mic icon
          allowGoogleSpeech: false, //This feature requires valid Google speech API key. (Place it in 'web-kore-sdk/libs/speech/key.js')
                        //Google speech works in Google Chrome browser without API key.
          allowLocation: false, // set false, to deny sending location to server
          loadHistory: false, // set true to load recent chat history
          messageHistoryLimit: 10, // set limit to load recent chat history
          autoEnableSpeechAndTTS: false, // set true, to use talkType voice keyboard.
          graphLib: 'd3',  // set google, to render google charts.This feature requires loader.js file which is available in google charts documentation.
          googleMapsAPIKey: '' // please provide google maps API key to fetch user location.
        };

        var newBotOptions = Object.assign(botOptions, defaultChatConfig.botOptions);
        Object.assign(chatConfig, defaultChatConfig);
        chatConfig.botOptions = newBotOptions;
        chatConfig.botOptions.assertionFn = assertionFnWrapper(chatConfig.botOptions.assertionFn, chatInstance);

        if (reloadSession) {
          chatConfig.botOptions.userIdentity = localStorage.getItem(BOT_USER_IDENTITY);
          chatConfig.botOptions.restorePS = true;
          chatConfig.botOptions.jwtGrant = JSON.parse(localStorage.getItem(JWT_GRANT));
          chatConfig.botOptions.chatHistory = this.chatHistory;
          chatConfig.loadHistory = defaultChatConfig.loadHistory;
        } else {
          if (chatConfig.botOptions.userIdentity === '') {
            chatConfig.botOptions.userIdentity = getUniqueID();
          }
          localStorage.setItem(BOT_USER_IDENTITY, chatConfig.botOptions.userIdentity);
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
        var $subheader = $('<div class="security-title">' + subheader + '</div>');
        $subheader.addClass('kore-chat-subheader');
        $subheader.insertAfter($koreChatHeader.first());

        var oldKoreChatBodyTop = $koreChatBody.css('top');
        var newKoreChatBodyTop = parseFloat(oldKoreChatBodyTop) + $subheader.height();

        $koreChatBody.css({ top: newKoreChatBodyTop + 'px' });
      }

      function chatIconEventListeners () {

        var $bubble = $('[chat=bubble]');
        var $masterButton = $bubble.children('[chat=master_button]');

        $masterButton.on('click', function () {

          if (!isChatSessionActive()) {
            startNewChat();
          } else {
            // Maximize window
            $('.kore-chat-window').addClass('slide');
            renderChat();
            handleChatWindowOpen();
            emit(CHAT_MAXIMIZED);
          }
        });
      }

      function startNewChat() {

        // Check whether a new chat session is allowed
        if (chatLifeCycle && chatLifeCycle.canChatStart && !chatLifeCycle.canChatStart()) {
          // Do not launch a new chat session
          return;
        }

        // Open new session
        $('[chat=bubble]').attr('thinking', 'yep');
        var chatConfig = getChatConfig(defaultChatConfig, false);
        renderChat(chatConfig);
        handleChatWindowOpen();
        emit(CHAT_STARTED);
      }

      function handleChatWindowOpen() {
        showChatIcon(false);

        var $bubble = $('[chat=bubble]');
        var $masterButton = $bubble.children('[chat=master_button]');
        var $notifications = $bubble.children('[chat=notifications]');

        $masterButton.removeAttr('queued_messages');
        $notifications.removeAttr('queued_messages');

        localStorage.removeItem(QUEUED_MESSAGE_COUNT);
        localStorage.setItem(CHAT_WINDOW_STATUS, 'maximized');
      }

      function renderChat (chatConfig) {
        chatInstance.show(chatConfig);
        chatWindowEventListeners();
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

        if (defaultChatConfig.subheader) {
          attachSubheaderUI(defaultChatConfig.subheader, $koreChatHeader, $koreChatBody);
        }

        $('.close-btn').on('click', function (e) {
          e.stopPropagation();
          if (chatLifeCycle && chatLifeCycle.canChatEnd && !chatLifeCycle.canChatEnd()) {
            return;
          }
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
          var jwt = JSON.stringify(bot.userInfo);
          if (localStorage.getItem(JWT_GRANT) !== jwt) {
            localStorage.setItem(JWT_GRANT, jwt);
          }
        });

        // Event occurs when you recieve any message from server
        bot.on('message', function(msg) {
          // Converting JSON string to object
          var dataObj = JSON.parse(msg.data);

          if (dataObj.ok && dataObj.type === 'ack'
            && localStorage.getItem(CUSTOMER_ENGAGED) !== 'true') {
              emit(CHAT_CUSTOMER_ENGAGED);
              localStorage.setItem(CUSTOMER_ENGAGED, 'true');
          }

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

            var payload = dataObj.message[0].component.payload;
            var msgText = '';

            if (payload.text) {
              msgText = payload.text;
            } else if (payload.payload) {
              msgText = payload.payload.text;
            }

            if (msgText === 'You are now connected to an Agent.') {
              localStorage.setItem(LIVE_CHAT, 'true');
              emit(CHAT_AGENT_ENGAGED);
            } else if (msgText === 'Live Agent Chat has ended.') {
              localStorage.setItem(LIVE_CHAT, 'false');
              emit(CHAT_AGENT_DISCONNECTED);
            } else if (msgText === 'Do you want to provide feedback?') {
              localStorage.setItem(LIVE_CHAT, 'false');
              emit(CHAT_SURVEY_TRIGGERED);
            } else if (msgText === 'Thank you for your feedback. The chat session has ended.') {
              emit(CHAT_SURVEY_ANSWERED);
              handleChatEndByAgent();
            } else if (msgText === 'Thank you. The chat session has ended.') {
              emit(CHAT_SURVEY_UNANSWERED);
              handleChatEndByAgent();
            }

            if (localStorage.getItem(LIVE_CHAT) === 'true') {
              if (defaultChatConfig.notificaitonsEnabled && localStorage.getItem(CHAT_WINDOW_STATUS) === 'minimized') {

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

        if (!defaultChatConfig.windowDraggable && $koreChatWindow.data('ui-draggable')) {
          $koreChatWindow.draggable('destroy');
        }

        $chatBoxControls.children('.minimize-btn').off('click').on('click', function () {
          emit(CHAT_MINIMIZED);
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

      function showChatIcon (visibility) {
        $('[chat=bubble]').attr('visible', visibility ? 'yep': 'nope');
      }

      function isChatSessionActive () {

        var isChatSessionActive = localStorage.getItem(JWT_GRANT) != null
          && localStorage.getItem(BOT_USER_IDENTITY) != null
          && (defaultChatConfig.botOptions.userIdentity === ''
            || defaultChatConfig.botOptions.userIdentity === localStorage.getItem(BOT_USER_IDENTITY));

        if (!isChatSessionActive) {
          clearLocalStorage();
        }

        return isChatSessionActive;
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

      function handleChatEndByUser() {
        if (localStorage.getItem(LIVE_CHAT) === 'true') {
          var messageToBot = {
            message: { body: 'endAgentChat' },
            resourceid: '/bot.message'
          };
          chatInstance.bot.sendMessage(messageToBot);
        }
        emit(CHAT_ENDED_USER);
        handleChatEnd();
      }

      function handleChatEndByAgent() {
        emit(CHAT_ENDED_AGENT);
        handleChatEnd();
      }

      function handleChatEnd() {
        clearLocalStorage();
        $('.kore-chat-window').removeClass('slide');
        setTimeout(function () {
          showChatIcon(true);
          chatInstance.destroy();
        }, 800);
      }

      function clearLocalStorage() {
        localStorage.removeItem(CHAT_WINDOW_STATUS);
        localStorage.removeItem(BOT_USER_IDENTITY);
        localStorage.removeItem(JWT_GRANT);
        localStorage.removeItem(LIVE_CHAT);
        localStorage.removeItem(QUEUED_MESSAGE_COUNT);
        localStorage.removeItem(CUSTOMER_ENGAGED);
      }

      function emit(eventName) {
        const event = events['CHAT_EVENT'];
        if (event) {
          event.forEach(function (fn) {
            fn.call(null, {eventName: eventName});
          });
        }
      }

      function on() {
        return function (eventName, fn) {
          if (!events[eventName]) {
            events[eventName] = [];
          }
          events[eventName] = events[eventName].filter(function (eventFn) {
            return fn !== eventFn;
          });
          events[eventName].push(fn);
        }
      }

      return chatInstance;
    })(koreJquery);
  };

  return csaaKoreBotChat;
});
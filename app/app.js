var app = angular.module("checkout", ['ngRoute', 'ngSanitize', 'ui.bootstrap', 'angular-loading-bar', 'gettext', 'duScroll', 'ngAnimate']);

app.config(['$httpProvider', '$routeProvider', '$locationProvider', '$provide', 'cfpLoadingBarProvider', function ($httpProvider, $routeProvider, $locationProvider, $provide, cfpLoadingBarProvider) {

    // Define routes
    $routeProvider.when("/", { templateUrl: "app/pages/index/index.html", reloadOnSearch: false });
    $routeProvider.when("/simple-d", {
        templateUrl: "app/pages/simple/desktop.html", reloadOnSearch: false, resolve: {
            test: function ($route) { $route.current.params.env = "desktop"; }
        }
    });
    $routeProvider.when("/simple-m", {
        templateUrl: "app/pages/simple/mobile.html", reloadOnSearch: false, resolve: {
            test: function ($route) { $route.current.params.env = "mobile"; }
        }
    });
    $routeProvider.when("/simple-d/review/:id", {
        templateUrl: "app/pages/simple/review.html", resolve: {
            test: function ($route) { $route.current.params.env = "desktop"; }
        }
    });
    $routeProvider.when("/simple-m/review/:id", {
        templateUrl: "app/pages/simple/review.html", resolve: {
            test: function ($route) { $route.current.params.env = "mobile"; }
        }
    });

    // Non-handled routes.
    var notFoundUrl = window.__settings.app.not_found_url;

    if (notFoundUrl == null) {
        notFoundUrl = window.__settings.app.main_shopping_url;
    }

    if (notFoundUrl == null) {
        // The root of the app
        notFoundUrl = window.location.href.substring(0, window.location.href.indexOf("#")) + "#/";
    }

    $routeProvider.otherwise({
        redirectTo: function () {
            window.location.replace(notFoundUrl);
        }
    });

    // Loading bar https://github.com/chieffancypants/angular-loading-bar A global loading bar when HTTP requests are being made so you don't have to manually trigger spinners on each ajax call.
    cfpLoadingBarProvider.latencyThreshold = 300;
    cfpLoadingBarProvider.includeSpinner = false;

    // Set the favicon
    var favicon = document.createElement("link");
    favicon.setAttribute("rel", "icon");
    favicon.setAttribute("type", "image/x-icon");

    if (window.__settings.app.favicon_full) {
        favicon.setAttribute("href", window.__settings.app.favicon_full);
    } else {
        favicon.setAttribute("href", "images/default_favicon.png");
    }

    document.head.appendChild(favicon);

}]);

// Bootstrap settings
app.run(['$rootScope', 'SettingsService', function ($rootScope, SettingsService) {

    // This defines the languages supported by the app. Each supported language must have an associated translation file in the languages folder. It ain't magic.

    var settings = SettingsService.get();

    if (settings.app.enable_languages) {
            $rootScope.languages = [
                {
                    code: "en",
                    name: "English"
                },        
                {
                    code: "cs",
                    name: "čeština"
                },
                {
                    code: "de",
                    name: "Deutsche"
                },
                {
                    code: "el",
                    name: "Ελληνικά"
                },
                {
                    code: "es",
                    name: "Español"
                },                
                {
                    code: "fi",
                    name: "Suomalainen"
                },
                {
                    code: "fr",
                    name: "français"
                },            
                {
                    code: "it",
                    name: "italiano"
                },
                {
                    code: "ja",
                    name: "日本語"
                },
                {
                    code: "ko",
                    name: "한국어"
                },
                {
                    code: "nl",
                    name: "Nederlands"
                },
                {
                    code: "pl",
                    name: "Polskie"
                },
                {
                    code: "pt",
                    name: "Português"
                },
                {
                    code: "ru",
                    name: "русский"
                },            
                {
                    code: "sv",
                    name: "svenska"
                }
            ]
        }

    // Listen for messages from the parent that hosts the iframe.
    window.addEventListener("message", function (message) {

        var originHost = message.origin.replace("https://", "").replace("http://", "");
        var errorMsg = "Attempting to receive a message from the parent of the iframe window that is not hosted by an allowed hostname: The hostname " + originHost + " is not listed as approved in the app settings. The message will be ignored.";

        // Always allow locahost as a valid origin host, and also allow if the origin host is the same as the page host.
        if (originHost != "localhost" && originHost != "127.0.0.1" && (window.location.hostname != originHost)) {

            var settings = SettingsService.get();

            if (!settings.app || !settings.app.allowed_origin_hosts) {
                console.log(errorMsg);
                return;
            }

            // The hosts are delimited by space, comma or newline.
            var validHosts = [];
            if (settings.app && settings.app.allowed_origin_hosts) {
                var validHosts = settings.app.allowed_origin_hosts.split(/[\n\s,]+/);
            }

            if (validHosts.indexOf(originHost) == -1) {
                console.log(errorMsg);
                return;
            }
        }

        $rootScope.originHost = originHost;

        // message.data contains a serialized object. Parse it so you can examine.
        if (message.data) {

            // Get the data from the received message.
            var obj = JSON.parse(message.data);

            // Global messages
            if (obj.type == "set_parent_url") {
                if (obj.url) {
                    localStorage.setItem("parent_url", obj.url);
                }
            } else {
                // Broadcast the message
                $rootScope.$broadcast('messageReceived', obj);
            }

        }

    });

    // A function for sending messages to the parent iframe
    window.sendMessage = function (message, allowedOriginHosts) {

        var errorMsg = "Attempting to send a message to the parent of the iframe window that is not hosted by an allowed hostname: The hostname " + $rootScope.originHost + " is not listed as approved in the app settings. The message will not be sent.";

        // Always allow locahost as a valid origin host, and also allow if the origin host is the same as the page host.
        if ($rootScope.originHost != "localhost" && $rootScope.originHost != "127.0.0.1" && (window.location.hostname != $rootScope.originHost)) {

            // Only send a message to the page you were invoked from, and if that page is on the list of valid hostnames.
            var validHosts = [];
            if (allowedOriginHosts) {
                var validHosts = allowedOriginHosts.split(/[\n\s,]+/);
            }

            if ($rootScope.originHost && validHosts.indexOf($rootScope.originHost) == -1) {
                console.warn(errorMsg);
                return;
            }
        }

        // The parent is the opener (in the case of a new tab) or the parent window (in the case of an iframe). If not opened in a new tab, the opener will be null.
        var parentObj = window.opener || window.parent;

        parentObj.postMessage(JSON.stringify(message), "*");
    }

    // Send a "ready" message to the parent.
    sendMessage({ type: "ready" }, settings.app.allowed_origin_hosts);

}]);
